import { Router } from 'express';

export const router = Router();

router.post('/', async (req, res) => {
  try {
    const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai');

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const { imageBase64, theme = 'halloween', mimeType = 'image/jpeg' } = req.body as {
      imageBase64?: string;
      theme?: string;
      mimeType?: string;
    };

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Strip data URL prefix if present (e.g., "data:image/jpeg;base64,")
    let cleanBase64 = imageBase64;
    if (imageBase64.includes(';base64,')) {
      cleanBase64 = imageBase64.split(';base64,')[1];
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const imageModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-image-preview' });
    const textModel = genAI.getGenerativeModel({ model: process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash' });

    // Step A: edit the image
    const decoratePrompt = `You are a photo stylist. Decorate the room photo for: ${theme}.
Constraints: do NOT block doors, windows, screens, or pathways; keep scale realistic; attach items where plausible (walls, mantle, door frame); avoid brand logos. Output an edited image.`;

    const gen1 = await imageModel.generateContent([
      { inlineData: { mimeType, data: cleanBase64 } } as any,
      decoratePrompt
    ]);

    const gen1Resp = await gen1.response;
    const parts: any[] = (gen1Resp as any)?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.data);
    if (!imagePart) {
      return res.status(500).json({ error: 'No image returned from image model' });
    }
    const editedBase64: string = imagePart.inlineData.data;

    // Step B: compare original vs edited with a response schema
    const productSchema = {
      type: SchemaType.OBJECT,
      properties: {
        theme: { type: SchemaType.STRING },
        items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING },
              qty: { type: SchemaType.INTEGER },
              color: { type: SchemaType.STRING, nullable: true },
              approxDimensionsInches: {
                type: SchemaType.OBJECT,
                properties: {
                  w: { type: SchemaType.NUMBER },
                  h: { type: SchemaType.NUMBER },
                  d: { type: SchemaType.NUMBER, nullable: true }
                }
              },
              placement: {
                type: SchemaType.OBJECT,
                properties: {
                  note: { type: SchemaType.STRING, nullable: true },
                  bboxNorm: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } }
                }
              },
              keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              description: { type: SchemaType.STRING, nullable: true },
              estPriceUSD: { type: SchemaType.NUMBER, nullable: true }
            },
            required: ['name','type','qty','keywords','placement']
          }
        },
        safetyNotes: { type: SchemaType.STRING }
      },
      required: ['theme','items']
    } as const;

    const analysisPrompt = `Compare ORIGINAL vs EDITED. List ONLY items that were ADDED in EDITED.

IMPORTANT: Keep the "name" field simple and clean (like "halloween doormat", "spider web", "banner"). 

Add a "description" field with a SHORT, Amazon-search-optimized description using ONLY the specific terms people search for on Amazon. Keep it under 10 words. Focus on: material + size + pattern/design + key feature. Examples: "artificial wreath with red bows and pine cones" or "LED garland with red bows" or "mini artificial tree with ornaments" or "striped throw blanket" or "reindeer design pillow". NO marketing language, NO "perfect for" phrases, NO "features" - just searchable product terms.

Also be VERY descriptive in the "keywords" field - include specific design elements, patterns, materials, and visual details you can see. For example, instead of just ["doormat", "halloween"], use ["doormat", "halloween", "pumpkin design", "spiderweb pattern", "black and orange", "woven"]. Instead of just ["banner", "halloween"], use ["banner", "halloween", "spooky text", "ghost designs", "orange and black", "fabric"].

Return valid JSON with this exact structure:
{
  "theme": "${theme}",
  "items": [
    {
      "name": "simple clean product name",
      "type": "item type",
      "qty": 1,
      "color": "color if applicable",
      "description": "SHORT description with material + size + pattern + key features (under 10 words, no marketing language)",
      "keywords": ["keyword1", "keyword2", "design element1", "pattern1", "material1", "visual detail1"],
      "placement": {
        "note": "placement description",
        "bboxNorm": [0.1, 0.2, 0.3, 0.4]
      },
      "estPriceUSD": 25.99
    }
  ],
  "safetyNotes": "any safety concerns"
}

Use normalized bbox coordinates (0..1) around each added item. Only include items that were actually added to the image.`;

    const gen2 = await textModel.generateContent([
      { text: analysisPrompt },
      { inlineData: { mimeType, data: cleanBase64 } },
      { inlineData: { mimeType: 'image/png', data: editedBase64 } },
    ]);

    const productsJson = await gen2.response.text();
    
    // Clean the response - remove markdown code blocks if present
    let cleanJson = productsJson;
    if (productsJson.includes('```json')) {
      cleanJson = productsJson.split('```json')[1].split('```')[0];
    } else if (productsJson.includes('```')) {
      cleanJson = productsJson.split('```')[1];
    }
    
    console.log('Raw response:', productsJson);
    console.log('Cleaned JSON:', cleanJson);
    
    const products = JSON.parse(cleanJson);
    
    // Add Amazon links to each product using AI-generated descriptions
    for (const product of products.items) {
      // Build search query using the AI's detailed product description
      const searchTerms: string[] = [];
      
      // Start with quantity if it's more than 1
      if (product.qty > 1) {
        searchTerms.push(`${product.qty}`);
      }
      
      // Add color if available
      if (product.color) {
        if (Array.isArray(product.color)) {
          searchTerms.push(product.color[0]);
        } else if (typeof product.color === 'string') {
          const colors = product.color.split(',').map(c => c.trim());
          searchTerms.push(colors[0]);
        }
      }
      
      // Build a rich search query using the product name + enhanced keywords
      let searchDescription = product.name;
      
      // If we have placement context, add it to make the search more specific
      if (product.placement?.note) {
        const placement = product.placement.note.toLowerCase();
        
        // Add placement context that helps with search
        if (placement.includes('above') || placement.includes('hanging')) {
          searchDescription = `hanging ${searchDescription}`;
        }
        if (placement.includes('large') || placement.includes('tall')) {
          searchDescription = `large ${searchDescription}`;
        }
        if (placement.includes('human') || placement.includes('life size')) {
          searchDescription = `human sized ${searchDescription}`;
        }
        if (placement.includes('small') || placement.includes('mini')) {
          searchDescription = `small ${searchDescription}`;
        }
      }
      
      // Add the enhanced product description
      searchTerms.push(searchDescription);
      
      // Use the clean description directly for search
      if (product.description) {
        // The description is already Amazon-optimized, just add it
        searchTerms.push(product.description);
      }
      
      // Create the final search query
      const searchQuery = searchTerms.join(' ');
      console.log(`AI-generated search for ${product.name}:`, searchQuery);
      
      product.amazonLink = `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}&tag=snapdesign-20`;
    }

    return res.json({ editedImageBase64: editedBase64, products });
  } catch (err: any) {
    console.error('decorate error', err);
    return res.status(500).json({ error: err.message || 'decorate failed' });
  }
});

export default router;


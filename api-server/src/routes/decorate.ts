import { Router } from 'express';

export const router = Router();

router.post('/', async (req, res) => {
  try {
    const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai');

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const { imageBase64, description = 'decorate this space', mimeType = 'image/jpeg' } = req.body as {
      imageBase64?: string;
      description?: string;
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
    const decoratePrompt = `You are a professional interior/exterior designer and photo stylist. Transform this space according to the user's request: "${description}".

Constraints: 
- Do NOT block doors, windows, screens, or pathways
- Keep scale realistic and proportional
- Attach items where plausible (walls, mantle, door frame, ground, etc.)
- Avoid brand logos and text
- Consider the space type (indoor/outdoor, room function, etc.)
- Make the design cohesive and functional

Output an edited image that fulfills the user's design vision.`;

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
        description: { type: SchemaType.STRING },
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
      required: ['description','items']
    } as const;

    const analysisPrompt = `Compare ORIGINAL vs EDITED. List ALL items, materials, and supplies needed to achieve the changes shown in EDITED.

The user requested: "${description}"

IMPORTANT: Include BOTH visible items AND the materials/supplies used to create them:

VISIBLE ITEMS: Furniture, decorations, plants, lights, etc. that you can see in the image
MATERIALS/SUPPLIES: Paint, wallpaper, flooring, hardware, tools, etc. that were used to create the changes

EXAMPLES:
- If a wall was painted red → include "red paint" as a product
- If flooring was added → include "flooring" or "tile" as a product  
- If wallpaper was added → include "wallpaper" as a product
- If a plant was added → include "plant pot" and "plant" as products
- If lights were added → include "string lights" or "lamp" as a product

CRITICAL: Be consistent between "name" and "description" fields:

- "name": The main product/item name (e.g., "red paint", "plant pot", "string lights", "wallpaper")
- "description": Amazon search terms for THAT SAME product (e.g., if name is "red paint", description should be "interior wall paint red" or "latex paint red", NOT "paintbrush")

EXAMPLES OF CORRECT CONSISTENCY:
- Paint: name: "red paint" → description: "interior wall paint red" or "latex paint red"
- Wallpaper: name: "wallpaper" → description: "removable wallpaper" or "peel and stick wallpaper"
- Flooring: name: "hardwood flooring" → description: "engineered hardwood flooring" or "laminate flooring"
- Garden: name: "plant pot" → description: "ceramic plant pot" or "terracotta planter"
- Office: name: "standing desk" → description: "adjustable standing desk" or "bamboo desk"
- Kitchen: name: "pendant light" → description: "kitchen pendant light" or "industrial pendant"
- Living room: name: "throw pillow" → description: "decorative throw pillow" or "velvet pillow"
- Outdoor: name: "string lights" → description: "outdoor string lights" or "patio lights"

The "description" field should be SHORT Amazon search terms (under 10 words) for the SAME product as the name. Focus on: material + size + type + function. NO marketing language.

Also be VERY descriptive in the "keywords" field - include specific design elements, patterns, materials, colors, and visual details you can see.

Return valid JSON with this exact structure:
{
  "description": "${description}",
  "items": [
    {
      "name": "product name",
      "type": "item type",
      "qty": 1,
      "color": "color if applicable",
      "description": "Amazon search terms for the SAME product as name (under 10 words)",
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

Use normalized bbox coordinates (0..1) around each added item. Include ALL products needed to achieve the design changes.`;

    let gen2;
    try {
      gen2 = await textModel.generateContent([
        { text: analysisPrompt },
        { inlineData: { mimeType, data: cleanBase64 } },
        { inlineData: { mimeType: 'image/png', data: editedBase64 } },
      ]);
    } catch (textError: any) {
      console.error('Text analysis error:', textError);
      return res.status(500).json({ 
        error: 'Failed to analyze images. Please try again with a different image or theme.',
        details: textError.message 
      });
    }

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
    
    let products;
    try {
      products = JSON.parse(cleanJson);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError);
      console.error('Failed to parse JSON:', cleanJson);
      return res.status(500).json({ 
        error: 'Failed to parse AI response. Please try again.',
        details: 'Invalid JSON format from AI'
      });
    }
    
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
          const colors = product.color.split(',').map((c: string) => c.trim());
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


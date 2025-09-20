import type { Express } from 'express';
import type { ServiceModule, ServiceContext } from '../../core/types';
import path from 'path';
import dotenv from 'dotenv';

// Load service-scoped .env (server/src/services/design/.env)
dotenv.config({ path: path.join(__dirname, '.env') });

const designService: ServiceModule = {
  name: 'design',

  async init(ctx: ServiceContext) {
    ctx.logger.info('Design service initialized');
  },

  async registerRoutes(app: Express, ctx: ServiceContext) {
    // Health
    app.get('/design/health', (_req, res) => {
      res.json({ 
        service: 'design', 
        status: 'healthy', 
        version: '1.0.0',
        endpoints: {
          search: ['POST /design/search'],
          decorate: ['POST /design/decorate'],
          edit: ['POST /design/edit']
        }
      });
    });

    // Attach sub-routes
    // POST /design/search
    app.post('/design/search', async (req, res) => {
      const { keywords } = req.body as { keywords?: string[] };
      if (!Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ error: 'keywords array is required' });
      }

      const associateTag = process.env.AMAZON_PARTNER_TAG;
      const amazonHost = process.env.AMAZON_HOST || 'www.amazon.com';
      const searchQuery = encodeURIComponent(keywords.join(' '));
      const baseUrl = `https://${amazonHost}/s?k=${searchQuery}`;
      const urlWithTag = associateTag ? `${baseUrl}&tag=${encodeURIComponent(associateTag)}` : baseUrl;

      const products = keywords.slice(0, 3).map((kw, i) => ({
        id: `stub-${i}`,
        title: `${kw} - sample item`,
        thumbnail: 'https://via.placeholder.com/128',
        price: undefined,
        url: urlWithTag,
      }));

      return res.json({ products, provider: 'amazon-stub' });
    });

    // POST /design/decorate
    app.post('/design/decorate', async (req, res) => {
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

        let cleanBase64 = imageBase64;
        if (imageBase64.includes(';base64,')) {
          cleanBase64 = imageBase64.split(';base64,')[1];
        }

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const imageModelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image-preview';
        const textModelName = process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash';

        ctx.logger.info('Using Gemini models', {
          imageModel: imageModelName,
          textModel: textModelName
        });

        const imageModel = genAI.getGenerativeModel({ model: imageModelName });
        const textModel = genAI.getGenerativeModel({ model: textModelName });

        const decoratePrompt = `You are a professional interior designer. Add decorations and enhancements to this space according to the user's request: "${description}".

IMPORTANT CONSTRAINTS:
- DO NOT remove, move, or change existing doors, windows, walls, or room layout
- DO NOT change the basic structure or architecture of the space
- DO NOT remove existing furniture unless specifically requested
- ONLY add new decorative elements, accessories, and enhancements
- Keep all existing pathways, entrances, and exits completely clear

WHAT TO ADD:
- Decorative items, accessories, and enhancements as requested
- Plants, artwork, lighting, and decorative objects
- Seasonal decorations, colors, and themed elements
- Soft furnishings like pillows, throws, and rugs
- Wall decorations, mirrors, and hanging elements

TECHNICAL REQUIREMENTS:
- Keep scale realistic and proportional to the space
- Attach items where plausible (walls, mantle, door frame, ground, etc.)
- Avoid brand logos and text
- Use appropriate lighting and shadows for realism
- Ensure all additions complement the existing space
- Maintain the original room's function and flow

Create a tasteful, well-styled space by adding the requested decorations while preserving the original room structure and layout.`;

        const gen1 = await imageModel.generateContent([
          { inlineData: { mimeType, data: cleanBase64 } } as any,
          decoratePrompt
        ]);

        const gen1Resp = await gen1.response as any;
        const parts: any[] = gen1Resp?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData?.data);
        if (!imagePart) {
          return res.status(500).json({ error: 'No image returned from image model' });
        }
        const editedBase64: string = imagePart.inlineData.data;

        const imageUsage = gen1Resp?.usageMetadata || {};

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
          ctx.logger.error('Text analysis error:', textError);
          return res.status(500).json({ 
            error: 'Failed to analyze images. Please try again with a different image or theme.',
            details: textError.message 
          });
        }

        const gen2Resp: any = gen2.response;
        const productsJson = await gen2Resp.text();

        const textUsage = gen2Resp?.usageMetadata || {};

        let cleanJson = productsJson;
        if (productsJson.includes('```json')) {
          cleanJson = productsJson.split('```json')[1].split('```')[0];
        } else if (productsJson.includes('```')) {
          cleanJson = productsJson.split('```')[1];
        }

        let products: any;
        try {
          products = JSON.parse(cleanJson);
        } catch (parseError: any) {
          ctx.logger.error('JSON parse error:', parseError);
          return res.status(500).json({ 
            error: 'Failed to parse AI response. Please try again.',
            details: 'Invalid JSON format from AI'
          });
        }

        for (const product of products.items) {
          const searchTerms: string[] = [];

          if (product.qty > 1) {
            searchTerms.push(`${product.qty}`);
          }

          if (product.color) {
            if (Array.isArray(product.color)) {
              searchTerms.push(product.color[0]);
            } else if (typeof product.color === 'string') {
              const colors = product.color.split(',').map((c: string) => c.trim());
              searchTerms.push(colors[0]);
            }
          }

          let searchDescription = product.name;

          if (product.placement?.note) {
            const placement = (product.placement.note as string).toLowerCase();
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

          searchTerms.push(searchDescription);

          if (product.description) {
            searchTerms.push(product.description);
          }

          const searchQuery = searchTerms.join(' ');
          product.amazonLink = `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}&tag=snapdesign-20`;
        }

        const totalTokens = {
          imageGeneration: {
            inputTokens: imageUsage.promptTokenCount || 0,
            outputTokens: imageUsage.candidatesTokenCount || 0,
            totalTokens: imageUsage.totalTokenCount || 0
          },
          textAnalysis: {
            inputTokens: textUsage.promptTokenCount || 0,
            outputTokens: textUsage.candidatesTokenCount || 0,
            totalTokens: textUsage.totalTokenCount || 0
          },
          grandTotal: (imageUsage.totalTokenCount || 0) + (textUsage.totalTokenCount || 0),
          inputTokensTotal: (imageUsage.promptTokenCount || 0) + (textUsage.promptTokenCount || 0),
          outputTokensTotal: (imageUsage.candidatesTokenCount || 0) + (textUsage.candidatesTokenCount || 0)
        };

        return res.json({ 
          editedImageBase64: editedBase64, 
          products,
          tokenUsage: totalTokens
        });
      } catch (err: any) {
        ctx.logger.error('decorate error', err);
        return res.status(500).json({ error: err.message || 'decorate failed' });
      }
    });

    // POST /design/edit
    app.post('/design/edit', async (req, res) => {
      try {
        const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai');

        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
          return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const { imageBase64, editInstructions, mimeType = 'image/jpeg' } = req.body as {
          imageBase64?: string;
          editInstructions?: string;
          mimeType?: string;
        };

        if (!imageBase64) {
          return res.status(400).json({ error: 'imageBase64 is required' });
        }

        if (!editInstructions) {
          return res.status(400).json({ error: 'editInstructions is required' });
        }

        let cleanBase64 = imageBase64;
        if (imageBase64.includes(';base64,')) {
          cleanBase64 = imageBase64.split(';base64,')[1];
        }

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const imageModelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image-preview';
        const textModelName = process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash';

        ctx.logger.info('Using Gemini models for edit', {
          imageModel: imageModelName,
          textModel: textModelName
        });

        const imageModel = genAI.getGenerativeModel({ model: imageModelName });
        const textModel = genAI.getGenerativeModel({ model: textModelName });

        const editPrompt = `You are a professional interior designer. Please make the following changes to this space: "${editInstructions}".

IMPORTANT CONSTRAINTS:
- You can modify, add, remove, or change any elements as requested
- Maintain realistic proportions and scale
- Keep the overall room structure intact unless specifically asked to change it
- Ensure all changes are visually coherent and well-integrated
- Use appropriate lighting and shadows for realism
- Avoid brand logos and text unless specifically requested

TECHNICAL REQUIREMENTS:
- Make the requested changes while maintaining visual quality
- Ensure all modifications complement the existing space
- Keep scale realistic and proportional
- Use appropriate materials and textures
- Maintain good lighting and shadows

Please implement the requested changes: "${editInstructions}"`;

        const gen1 = await imageModel.generateContent([
          { inlineData: { mimeType, data: cleanBase64 } } as any,
          editPrompt
        ]);

        const gen1Resp = await gen1.response as any;
        const parts: any[] = gen1Resp?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData?.data);
        if (!imagePart) {
          return res.status(500).json({ error: 'No image returned from image model' });
        }
        const editedBase64: string = imagePart.inlineData.data;

        const imageUsage = gen1Resp?.usageMetadata || {};

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

The user requested: "${editInstructions}"

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
  "description": "${editInstructions}",
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
          ctx.logger.error('Text analysis error:', textError);
          return res.status(500).json({ 
            error: 'Failed to analyze images. Please try again with a different image or edit instructions.',
            details: textError.message 
          });
        }

        const gen2Resp: any = gen2.response;
        const productsJson = await gen2Resp.text();

        const textUsage = gen2Resp?.usageMetadata || {};

        let cleanJson = productsJson;
        if (productsJson.includes('```json')) {
          cleanJson = productsJson.split('```json')[1].split('```')[0];
        } else if (productsJson.includes('```')) {
          cleanJson = productsJson.split('```')[1];
        }

        let products: any;
        try {
          products = JSON.parse(cleanJson);
        } catch (parseError: any) {
          ctx.logger.error('JSON parse error:', parseError);
          return res.status(500).json({ 
            error: 'Failed to parse AI response. Please try again.',
            details: 'Invalid JSON format from AI'
          });
        }

        for (const product of products.items) {
          const searchTerms: string[] = [];

          if (product.qty > 1) {
            searchTerms.push(`${product.qty}`);
          }

          if (product.color) {
            if (Array.isArray(product.color)) {
              searchTerms.push(product.color[0]);
            } else if (typeof product.color === 'string') {
              const colors = product.color.split(',').map((c: string) => c.trim());
              searchTerms.push(colors[0]);
            }
          }

          let searchDescription = product.name;

          if (product.placement?.note) {
            const placement = (product.placement.note as string).toLowerCase();
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

          searchTerms.push(searchDescription);

          if (product.description) {
            searchTerms.push(product.description);
          }

          const searchQuery = searchTerms.join(' ');
          product.amazonLink = `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}&tag=snapdesign-20`;
        }

        const totalTokens = {
          imageGeneration: {
            inputTokens: imageUsage.promptTokenCount || 0,
            outputTokens: imageUsage.candidatesTokenCount || 0,
            totalTokens: imageUsage.totalTokenCount || 0
          },
          textAnalysis: {
            inputTokens: textUsage.promptTokenCount || 0,
            outputTokens: textUsage.candidatesTokenCount || 0,
            totalTokens: textUsage.totalTokenCount || 0
          },
          grandTotal: (imageUsage.totalTokenCount || 0) + (textUsage.totalTokenCount || 0),
          inputTokensTotal: (imageUsage.promptTokenCount || 0) + (textUsage.promptTokenCount || 0),
          outputTokensTotal: (imageUsage.candidatesTokenCount || 0) + (textUsage.candidatesTokenCount || 0)
        };

        return res.json({ 
          editedImageBase64: editedBase64, 
          products,
          tokenUsage: totalTokens,
          editInstructions
        });
      } catch (err: any) {
        ctx.logger.error('edit error', err);
        return res.status(500).json({ error: err.message || 'edit failed' });
      }
    });
  }
};

export default designService;



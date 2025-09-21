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

        const { imageBase64, description, mimeType = 'image/jpeg', serviceType } = req.body as {
          imageBase64?: string;
          description?: string;
          mimeType?: string;
          serviceType?: string;
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

        const isDeclutterService = serviceType === 'declutter';
        const isMakeoverService = serviceType === 'makeover';
        
        const decoratePrompt = isDeclutterService 
          ? `This is the AFTER photo of the same room.
The space is perfectly staged for a real estate showing: spotless, uncluttered, and pristine.

The floor is 100% clear — absolutely no clothes, toys, shoes, boxes, or items of any kind.

All surfaces are empty and polished — no piles, no objects, no scattered items left on top of anything.

All clothes, toys, papers, and personal belongings are put away inside storage (closets, cabinets, drawers, bins) — never stacked on surfaces.

Beds are made hotel-perfect if present.

Kitchens show only fixed appliances (no food, dishes, or clutter).

Living areas show only staged furniture and original decor (no extra items).

Furniture, layout, walls, doors, and windows remain unchanged.

The result: a room that looks as if a professional home stager has completely decluttered and organized it — clean, empty, and ready to show.`
          : isMakeoverService
          ? `You are a professional interior designer and home makeover specialist with expert spatial awareness. 

🎯 PRIMARY OBJECTIVE: Follow the user's EXACT vision and requirements: "${description || 'complete room makeover'}"

CRITICAL: The user's specific instructions are the TOP PRIORITY. Every design decision must align with their vision.

SPATIAL AWARENESS & CONTEXT UNDERSTANDING:
- ANALYZE the space first: identify room type, doorways, windows, pathways, and functional areas
- NEVER block doorways, entrances, exits, or walkways with furniture or decorations
- NEVER place items in front of doors, windows, or clear pathways
- RESPECT the room's function: bedrooms need clear paths to bed, kitchens need clear work areas, etc.
- UNDERSTAND traffic flow: keep main pathways completely clear
- RECOGNIZE architectural features: mantles, built-ins, alcoves are good for decorations
- IDENTIFY appropriate surfaces: walls, shelves, tables, floors (away from pathways)

CRITICAL CONSTRAINTS - ROOM LAYOUT MUST REMAIN UNCHANGED:
- DO NOT change the room layout, structure, or architecture
- DO NOT move, remove, or add walls, doors, or windows
- DO NOT change the basic floor plan or room dimensions
- DO NOT alter the fundamental room structure
- KEEP ALL DOORWAYS, ENTRANCES, AND PATHWAYS COMPLETELY CLEAR
- NEVER place items that would obstruct movement or access

WHAT YOU CAN CHANGE (following user's specific requests):
- Wall colors, paint, wallpaper, and wall treatments
- Flooring materials, rugs, and floor coverings
- Furniture styles, colors, and arrangements (within the same layout)
- Lighting fixtures, lamps, and lighting design
- Decorative elements, artwork, and accessories
- Window treatments, curtains, and blinds
- Textiles, pillows, throws, and soft furnishings
- Plants, decorative objects, and styling elements

FURNITURE & DECORATION PLACEMENT:
- Wall decorations: on walls, not blocking pathways
- Floor items: in corners, against walls, or in designated areas away from doorways
- Table decorations: on existing surfaces, not blocking access
- Plants: in corners, on shelves, or designated plant areas
- Rugs: in seating areas, not blocking doorways or pathways
- Artwork: on walls, above furniture, in appropriate focal points
- Furniture: maintain clear pathways and access to all areas

MAKEOVER REQUIREMENTS:
- PRIORITIZE the user's specific style, colors, and aesthetic preferences
- Create a complete visual transformation that matches their exact vision
- Apply the requested style and aesthetic throughout the space
- Ensure all changes work together cohesively
- Use the colors, textures, and materials the user specifically requested
- Maintain realistic proportions and proper lighting
- Create a polished, magazine-worthy result that fulfills their vision
- ALWAYS maintain clear pathways and access to all areas

STYLE EXECUTION (adapt based on user's specific requests):
- If user requests modern: clean lines, neutral colors, minimal decor, contemporary furniture
- If user requests traditional: classic furniture, warm colors, rich textures, timeless elements
- If user requests bohemian: eclectic mix, vibrant colors, layered textures, artistic elements
- If user requests minimalist: simple furniture, neutral palette, clean surfaces, essential items only
- If user requests rustic: natural materials, earthy colors, vintage elements, cozy textures
- If user specifies colors: use those exact colors prominently
- If user mentions specific furniture: incorporate that style
- If user wants a theme: fully embrace that theme

Transform this space into a complete makeover that EXACTLY reflects the user's vision: "${description || 'complete room makeover'}" while keeping the room layout exactly the same and maintaining clear pathways and access to all areas.`
          : `You are a professional interior designer with expert spatial awareness. 

🎯 PRIMARY OBJECTIVE: Follow the user's EXACT request: "${description || 'decorate this space'}"

CRITICAL: The user's specific instructions are the TOP PRIORITY. Every decoration and enhancement must align with their exact request.

SPATIAL AWARENESS & CONTEXT UNDERSTANDING:
- ANALYZE the space first: identify room type, doorways, windows, pathways, and functional areas
- NEVER block doorways, entrances, exits, or walkways with decorations
- NEVER place items in front of doors, windows, or clear pathways
- RESPECT the room's function: bedrooms need clear paths to bed, kitchens need clear work areas, etc.
- UNDERSTAND traffic flow: keep main pathways completely clear
- RECOGNIZE architectural features: mantles, built-ins, alcoves are good for decorations
- IDENTIFY appropriate surfaces: walls, shelves, tables, floors (away from pathways)

IMPORTANT CONSTRAINTS:
- DO NOT remove, move, or change existing doors, windows, walls, or room layout
- DO NOT change the basic structure or architecture of the space
- DO NOT remove existing furniture unless specifically requested
- ONLY add new decorative elements, accessories, and enhancements
- KEEP ALL DOORWAYS, ENTRANCES, AND PATHWAYS COMPLETELY CLEAR
- NEVER place items that would obstruct movement or access

WHAT TO ADD (based on user's specific request):
- Decorative items, accessories, and enhancements as specifically requested
- Plants, artwork, lighting, and decorative objects the user mentioned
- Seasonal decorations, colors, and themed elements they specified
- Soft furnishings like pillows, throws, and rugs they requested
- Wall decorations, mirrors, and hanging elements they want
- Any specific items, colors, or styles they mentioned

PLACEMENT GUIDELINES:
- Wall decorations: on walls, not blocking pathways
- Floor items: in corners, against walls, or in designated areas away from doorways
- Table decorations: on existing surfaces, not blocking access
- Plants: in corners, on shelves, or designated plant areas
- Rugs: in seating areas, not blocking doorways or pathways
- Artwork: on walls, above furniture, in appropriate focal points

TECHNICAL REQUIREMENTS:
- PRIORITIZE the user's specific requests above all else
- Keep scale realistic and proportional to the space
- Attach items where plausible (walls, mantle, door frame, ground, etc.)
- Avoid brand logos and text
- Use appropriate lighting and shadows for realism
- Ensure all additions complement the existing space
- Maintain the original room's function and flow
- If user specifies colors: use those exact colors
- If user mentions specific items: include those items
- If user wants a theme: fully embrace that theme
- ALWAYS maintain clear pathways and access to all areas

Create a tasteful, well-styled space by adding the EXACT decorations and enhancements the user requested: "${description || 'decorate this space'}" while preserving the original room structure, layout, and maintaining clear pathways and access to all areas.`;

        let gen1;
        try {
          gen1 = await imageModel.generateContent([
            { inlineData: { mimeType, data: cleanBase64 } } as any,
            decoratePrompt
          ]);
        } catch (error) {
          ctx.logger.error('First generation attempt failed:', error);
          // Try with a more aggressive prompt if the first one fails
          const aggressivePrompt = `This is the AFTER photo of the same room.
The space is perfectly staged for a real estate showing: spotless, uncluttered, and pristine.

The floor is 100% clear — absolutely no clothes, toys, shoes, boxes, or items of any kind.

All surfaces are empty and polished — no piles, no objects, no scattered items left on top of anything.

All clothes, toys, papers, and personal belongings are put away inside storage (closets, cabinets, drawers, bins) — never stacked on surfaces.

Beds are made hotel-perfect if present.

Kitchens show only fixed appliances (no food, dishes, or clutter).

Living areas show only staged furniture and original decor (no extra items).

Furniture, layout, walls, doors, and windows remain unchanged.

The result: a room that looks as if a professional home stager has completely decluttered and organized it — clean, empty, and ready to show.`;

          gen1 = await imageModel.generateContent([
            { inlineData: { mimeType, data: cleanBase64 } } as any,
            aggressivePrompt
          ]);
        }

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

        const analysisPrompt = isDeclutterService 
          ? `Compare ORIGINAL vs EDITED images. Analyze the ORIGINAL image to identify what type of room this is and what specific items need to be organized. Create a contextual, step-by-step plan tailored to this specific space and its contents.

ANALYZE THE ORIGINAL IMAGE FIRST:
- What type of room is this? (bedroom, playroom, office, living room, kitchen, etc.)
- What specific items do you see that need organizing? (toys, clothes, papers, books, electronics, dishes, etc.)
- What furniture and storage options are available? (closets, drawers, shelves, toy boxes, etc.)
- How messy is the space? (mild clutter vs. extreme mess)

THE EDITED IMAGE SHOWS THE GOAL: A completely clean, organized space with everything properly stored.

CREATE CONTEXTUAL STEPS BASED ON WHAT'S ACTUALLY IN THE ROOM:

Return valid JSON with this exact structure:
{
  "description": "Transform this [ROOM TYPE] into a clean, organized, and functional space",
  "cleaningSteps": [
    {
      "id": "step_1",
      "title": "[Contextual title based on room type and items]",
      "description": "[Specific instructions for the items actually visible in the image]",
      "estimatedTime": "[Realistic time estimate]"
    }
  ]
}

EXAMPLES OF CONTEXTUAL STEPS:

FOR A PLAYROOM:
- "Pick up all scattered toys and put them in toy boxes or designated storage"
- "Organize books and put them on shelves or in book bins"
- "Clear the floor of all toys and create designated play zones"
- "Put away art supplies and craft materials in proper containers"

FOR AN OFFICE:
- "Sort through all papers and file important documents"
- "Organize office supplies in drawers or desk organizers"
- "Clear the desk surface and put everything in proper storage"
- "Organize cables and electronics neatly"

FOR A BEDROOM:
- "Put away all clothes - hang clean items, put dirty clothes in hamper"
- "Clear nightstands and dresser tops of clutter"
- "Organize personal items in drawers or storage containers"
- "Make the bed and create a clean, organized sleeping space"

FOR A LIVING ROOM:
- "Pick up all items that don't belong and put them away"
- "Organize books, magazines, and entertainment items"
- "Clear coffee tables and surfaces of clutter"
- "Organize remote controls and electronics"

FOR A KITCHEN:
- "Put away all dishes and clean the sink"
- "Organize pantry items and put food in proper storage"
- "Clear countertops and put appliances in designated spots"
- "Organize cooking utensils and tools"

REALISTIC TIME ESTIMATES:
- Small room with mild clutter: 5-15 minutes per step
- Medium room with moderate mess: 10-20 minutes per step  
- Large room with extreme mess: 15-30 minutes per step
- Total time should be reasonable (1-3 hours max for entire room)
- Consider the actual amount of items visible in the image

Create 4-6 practical, contextual steps that are specific to the room type and items actually visible in the ORIGINAL image. Make the steps meaningful and supportive for someone who doesn't know where to start.`
          : isMakeoverService
          ? `Compare ORIGINAL vs EDITED. List ALL items, materials, and supplies needed to achieve the complete makeover shown in EDITED.

The user requested: "${description}"

This is a COMPLETE ROOM MAKEOVER - analyze all the changes made to transform the space:

MAKEOVER ANALYSIS:
- Wall treatments: paint colors, wallpaper, wall art, mirrors
- Flooring changes: new flooring, rugs, floor treatments
- Furniture updates: new furniture styles, colors, arrangements
- Lighting transformations: new fixtures, lamps, lighting design
- Decorative elements: artwork, plants, accessories, styling
- Window treatments: curtains, blinds, window decor
- Textiles and soft furnishings: pillows, throws, bedding, upholstery

IMPORTANT: Include BOTH visible items AND the materials/supplies used to create them:

VISIBLE ITEMS: Furniture, decorations, plants, lights, artwork, etc. that you can see in the image
MATERIALS/SUPPLIES: Paint, wallpaper, flooring, hardware, tools, etc. that were used to create the changes

EXAMPLES FOR MAKEOVERS:
- If walls were painted → include "interior paint" and specific color
- If new flooring was added → include "hardwood flooring" or "tile flooring"
- If new furniture was added → include "sofa", "coffee table", "dining table", etc.
- If lighting was changed → include "pendant light", "table lamp", "floor lamp"
- If artwork was added → include "wall art", "canvas print", "mirror"
- If plants were added → include "plant pot" and "indoor plant"
- If textiles were added → include "throw pillow", "area rug", "curtains"

CRITICAL: Be consistent between "name" and "description" fields:

- "name": The main product/item name (e.g., "gray paint", "modern sofa", "pendant light")
- "description": Amazon search terms for THAT SAME product (e.g., if name is "gray paint", description should be "interior wall paint gray")

EXAMPLES OF CORRECT CONSISTENCY FOR MAKEOVERS:
- Paint: name: "gray paint" → description: "interior wall paint gray"
- Furniture: name: "modern sofa" → description: "modern sectional sofa" or "contemporary couch"
- Lighting: name: "pendant light" → description: "kitchen pendant light" or "dining room pendant"
- Flooring: name: "hardwood flooring" → description: "engineered hardwood flooring"
- Artwork: name: "wall art" → description: "canvas wall art" or "modern wall decor"
- Plants: name: "plant pot" → description: "ceramic plant pot" or "decorative planter"
- Textiles: name: "throw pillow" → description: "decorative throw pillow" or "accent pillow"

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
      "keywords": ["specific", "design", "elements", "colors", "materials"],
      "placement": {
        "note": "where it's placed in the room",
        "bboxNorm": [0.1, 0.2, 0.3, 0.4]
      },
      "description": "amazon search terms",
      "estPriceUSD": 50
    }
  ],
  "safetyNotes": "Any safety considerations for the makeover"
}`
          : `Compare ORIGINAL vs EDITED. List ALL items, materials, and supplies needed to achieve the changes shown in EDITED.

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

        let analysisResult: any;
        try {
          analysisResult = JSON.parse(cleanJson);
        } catch (parseError: any) {
          ctx.logger.error('JSON parse error:', parseError);
          return res.status(500).json({ 
            error: 'Failed to parse AI response. Please try again.',
            details: 'Invalid JSON format from AI'
          });
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

        if (isDeclutterService) {
          // For decluttering service, return cleaning steps
          const cleaningSteps = analysisResult.cleaningSteps || [];
          
          // Add completed: false to each step
          const stepsWithStatus = cleaningSteps.map((step: any, index: number) => ({
            ...step,
            id: step.id || `step_${index + 1}`,
            completed: false
          }));

          return res.json({ 
            editedImageBase64: editedBase64, 
            cleaningSteps: stepsWithStatus,
            tokenUsage: totalTokens
          });
        } else if (isMakeoverService) {
          // For makeover service, return products (same as design service)
          const products = analysisResult;
          
          for (const product of products.items || []) {
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
            }

            if (product.description) {
              searchDescription = product.description;
            }

            searchTerms.push(searchDescription);

            const associateTag = process.env.AMAZON_PARTNER_TAG;
            const amazonHost = process.env.AMAZON_HOST || 'www.amazon.com';
            const searchQuery = encodeURIComponent(searchTerms.join(' '));
            const baseUrl = `https://${amazonHost}/s?k=${searchQuery}`;
            const urlWithTag = associateTag ? `${baseUrl}&tag=${encodeURIComponent(associateTag)}` : baseUrl;

            product.amazonLink = urlWithTag;
          }

          return res.json({ 
            editedImageBase64: editedBase64, 
            products: products.items || [],
            tokenUsage: totalTokens
          });
        } else {
          // For design service, return products
          const products = analysisResult;
          
          for (const product of products.items || []) {
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

          return res.json({ 
            editedImageBase64: editedBase64, 
            products,
            tokenUsage: totalTokens
          });
        }
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

        const { imageBase64, editInstructions, mimeType = 'image/jpeg', serviceType } = req.body as {
          imageBase64?: string;
          editInstructions?: string;
          mimeType?: string;
          serviceType?: string;
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


        const imageModel = genAI.getGenerativeModel({ model: imageModelName });
        const textModel = genAI.getGenerativeModel({ model: textModelName });

        const isDeclutterService = serviceType === 'declutter';
        const isMakeoverService = serviceType === 'makeover';

        if (isDeclutterService) {
          return res.status(400).json({ error: 'Edit functionality is not available for declutter service' });
        }
        
        const editPrompt = isMakeoverService
          ? `You are a professional interior designer and home makeover specialist with expert spatial awareness. 
🎯 PRIMARY OBJECTIVE: Follow the user's EXACT edit instructions: "${editInstructions}"
CRITICAL: The user's specific edit instructions are the TOP PRIORITY. Every modification must align with their exact request.
⚠️ IMPORTANT: The user has specifically requested: "${editInstructions}"
- This is their EXACT request - do not deviate from it
- Do not add anything they didn't ask for
- Do not remove anything they didn't ask to remove
- Focus ONLY on what they specifically requested
MAKEOVER CONSTRAINTS - ROOM LAYOUT MUST REMAIN UNCHANGED:
- Keep the same room structure and layout
- Maintain existing architectural features
- Keep all doorways, entrances, and pathways completely clear
- Never place items that would obstruct movement or access
- Respect the room's function and traffic flow
WHAT YOU CAN CHANGE (following user's specific requests):
- Furniture styles, colors, and arrangements
- Decorations, artwork, and accessories
- Lighting fixtures and placement
- Textiles, rugs, and soft furnishings
- Wall colors and treatments
- Flooring materials and finishes
Please implement the EXACT changes requested: "${editInstructions}" while keeping the room layout exactly the same and maintaining clear pathways and access to all areas.`
          : `You are a professional interior designer with expert spatial awareness. 
🎯 PRIMARY OBJECTIVE: Follow the user's EXACT edit instructions: "${editInstructions}"
CRITICAL: The user's specific edit instructions are the TOP PRIORITY. Every modification must align with their exact request.
⚠️ IMPORTANT: The user has specifically requested: "${editInstructions}"
- This is their EXACT request - do not deviate from it
- Do not add anything they didn't ask for
- Do not remove anything they didn't ask to remove
- Focus ONLY on what they specifically requested

SPATIAL AWARENESS & CONTEXT UNDERSTANDING:
- ANALYZE the space first: identify room type, doorways, windows, pathways, and functional areas
- NEVER block doorways, entrances, exits, or walkways with new items
- NEVER place items in front of doors, windows, or clear pathways
- RESPECT the room's function: bedrooms need clear paths to bed, kitchens need clear work areas, etc.
- UNDERSTAND traffic flow: keep main pathways completely clear
- RECOGNIZE architectural features: mantles, built-ins, alcoves are good for decorations
- IDENTIFY appropriate surfaces: walls, shelves, tables, floors (away from pathways)

IMPORTANT CONSTRAINTS:
- You can modify, add, remove, or change any elements as specifically requested
- Maintain realistic proportions and scale
- Keep the overall room structure intact unless specifically asked to change it
- Ensure all changes are visually coherent and well-integrated
- Use appropriate lighting and shadows for realism
- Avoid brand logos and text unless specifically requested
- KEEP ALL DOORWAYS, ENTRANCES, AND PATHWAYS COMPLETELY CLEAR
- NEVER place items that would obstruct movement or access

PLACEMENT GUIDELINES FOR NEW ITEMS:
- Wall decorations: on walls, not blocking pathways
- Floor items: in corners, against walls, or in designated areas away from doorways
- Table decorations: on existing surfaces, not blocking access
- Plants: in corners, on shelves, or designated plant areas
- Rugs: in seating areas, not blocking doorways or pathways
- Artwork: on walls, above furniture, in appropriate focal points

TECHNICAL REQUIREMENTS:
- PRIORITIZE the user's specific edit instructions above all else
- Make the requested changes while maintaining visual quality
- Ensure all modifications complement the existing space
- Keep scale realistic and proportional
- Use appropriate materials and textures
- Maintain good lighting and shadows
- If user specifies colors: use those exact colors
- If user mentions specific items: include/remove those items
- If user wants changes to specific areas: focus on those areas
- If user requests removal: remove exactly what they specified
- If user requests additions: add exactly what they specified
- ALWAYS maintain clear pathways and access to all areas

IMPLEMENTATION FOCUS:
- Follow the user's edit instructions precisely: "${editInstructions}"
- Make only the changes they specifically requested
- Do not add extra modifications beyond their request
- Ensure the result matches their exact vision
- Maintain spatial awareness and functional access

Please implement the EXACT changes requested: "${editInstructions}" while maintaining clear pathways and access to all areas.`;

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



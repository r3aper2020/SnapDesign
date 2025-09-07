package models

const (
	DecoratePrompt = `You are a professional interior designer. Add decorations and enhancements to this space according to the user's request: "%s".

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

Create a tasteful, well-styled space by adding the requested decorations while preserving the original room structure and layout.`

	AnalysisPrompt = `Compare ORIGINAL vs EDITED. List ALL items, materials, and supplies needed to achieve the changes shown in EDITED.

The user requested: "%s"

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

The "description" field should be SHORT Amazon search terms (under 10 words) for the SAME product as the name. Focus on: material + size + type + function. NO marketing language.

Also be VERY descriptive in the "keywords" field - include specific design elements, patterns, materials, colors, and visual details you can see.

Return valid JSON with this exact structure:
{
  "description": "%s",
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

Use normalized bbox coordinates (0..1) around each added item. Include ALL products needed to achieve the design changes.`
)

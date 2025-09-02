import { Router } from 'express';

export const router = Router();

// POST /design
// Body: { imageBase64: string, prompt: string }
router.post('/', async (req, res) => {
  const { imageBase64, prompt } = req.body as { imageBase64?: string; prompt?: string };
  if (!imageBase64 || !prompt) {
    return res.status(400).json({ error: 'imageBase64 and prompt are required' });
  }

  // TODO: integrate Gemini. For now return stubbed suggestions
  const suggestions = [
    { type: 'decoration', text: 'Hang a balloon arch around the door' },
    { type: 'banner', text: 'Add a dinosaur banner' },
    { type: 'floor', text: 'Use green jungle-themed floor mats' },
  ];

  return res.json({ suggestions, model: 'gemini-stub' });
});

import { Router } from 'express';

export const router = Router();

// POST /search
// Body: { keywords: string[] }
router.post('/', async (req, res) => {
  const { keywords } = req.body as { keywords?: string[] };
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'keywords array is required' });
  }

  // Minimal Amazon search link generation for now
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

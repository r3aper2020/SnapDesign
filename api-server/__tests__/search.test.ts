import request from 'supertest';
import app from '../src/app';

describe('POST /search', () => {
  it('returns 400 when keywords are missing', async () => {
    const res = await request(app).post('/search').send({});
    expect(res.status).toBe(400);
  });

  it('returns stubbed products for provided keywords', async () => {
    const res = await request(app).post('/search').send({ keywords: ['balloon', 'banner', 'floor'] });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);
  });

  it('returns amazon search link with keywords and optional tag', async () => {
    const res = await request(app).post('/search').send({ keywords: ['party', 'decor'] });
    expect(res.status).toBe(200);
    const url: string = res.body.products[0].url;
    expect(url).toMatch(/^https:\/\/[^/]*amazon\.[^/]+\/s\?k=/);
    expect(url).toContain(encodeURIComponent('party decor'));
    if (process.env.AMAZON_PARTNER_TAG) {
      expect(url).toContain(`tag=${encodeURIComponent(process.env.AMAZON_PARTNER_TAG)}`);
    }
  });

  it.skip('queries Amazon Product Advertising API when configured', async () => {
    // Placeholder for real integration test once keys and client are implemented.
    // Expectations: signed request is made and products returned match expected shape.
  });
});


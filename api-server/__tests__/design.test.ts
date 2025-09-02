import request from 'supertest';
import app from '../src/app';

describe('POST /design', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/design').send({});
    expect(res.status).toBe(400);
  });

  it('returns stubbed suggestions when inputs are provided', async () => {
    const res = await request(app).post('/design').send({ imageBase64: 'abcd', prompt: 'party' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.model).toBeDefined();
  });

  it.skip('calls Gemini model with provided inputs when configured', async () => {
    // Placeholder for real integration test once Gemini client is implemented.
    // Expectation: model returns structured suggestions.
  });
});


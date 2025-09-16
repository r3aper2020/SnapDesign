import type { Express, Request, Response } from 'express';
import type { ServiceModule, ServiceContext } from '../../core/types';
import path from 'path';
import dotenv from 'dotenv';

// Load service-scoped .env (server/src/services/openai/.env)
dotenv.config({ path: path.join(__dirname, '.env') });

interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

function getOpenAIConfig(): OpenAIConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '1000');
  
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model,
    maxTokens
  };
}

let openaiConfig: OpenAIConfig | null = null;

function requireOpenAI(req: Request, res: Response, next: any) {
  if (!openaiConfig) {
    return res.status(503).json({ error: 'OpenAI service not configured' });
  }
  next();
}

const openaiService: ServiceModule = {
  name: 'openai',
  
  async init(ctx: ServiceContext) {
    openaiConfig = getOpenAIConfig();
    
    if (openaiConfig) {
      ctx.logger.info(`OpenAI service initialized with model: ${openaiConfig.model}`);
    } else {
      ctx.logger.warn('OpenAI env vars missing (OPENAI_API_KEY). Service will run in stub mode');
    }
  },
  
  async registerRoutes(app: Express, ctx: ServiceContext) {
    // POST /openai/chat - Chat completion endpoint
    app.post('/openai/chat', requireOpenAI, async (req, res) => {
      try {
        const { message, systemPrompt } = req.body;
        
        if (!message || typeof message !== 'string') {
          return res.status(400).json({ error: 'Message is required and must be a string' });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiConfig!.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: openaiConfig!.model,
            messages: [
              ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
              { role: 'user', content: message }
            ],
            max_tokens: openaiConfig!.maxTokens,
            temperature: 0.7,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          ctx.logger.error('OpenAI API error', { 
            status: response.status, 
            error: data.error?.message 
          });
          return res.status(400).json({ 
            error: data.error?.message || 'OpenAI request failed' 
          });
        }

        res.json({
          success: true,
          response: data.choices[0]?.message?.content || 'No response generated',
          usage: data.usage,
          model: data.model
        });
      } catch (err) {
        ctx.logger.error('OpenAI chat failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /openai/complete - Text completion endpoint
    app.post('/openai/complete', requireOpenAI, async (req, res) => {
      try {
        const { prompt, maxTokens } = req.body;
        
        if (!prompt || typeof prompt !== 'string') {
          return res.status(400).json({ error: 'Prompt is required and must be a string' });
        }

        const response = await fetch('https://api.openai.com/v1/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiConfig!.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-davinci-003', // Use completion model
            prompt: prompt,
            max_tokens: maxTokens || openaiConfig!.maxTokens,
            temperature: 0.7,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          ctx.logger.error('OpenAI completion error', { 
            status: response.status, 
            error: data.error?.message 
          });
          return res.status(400).json({ 
            error: data.error?.message || 'OpenAI request failed' 
          });
        }

        res.json({
          success: true,
          response: data.choices[0]?.text || 'No response generated',
          usage: data.usage,
          model: data.model
        });
      } catch (err) {
        ctx.logger.error('OpenAI completion failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // GET /openai/models - List available models
    app.get('/openai/models', requireOpenAI, async (req, res) => {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${openaiConfig!.apiKey}`,
          },
        });

        const data = await response.json();
        
        if (!response.ok) {
          ctx.logger.error('OpenAI models error', { 
            status: response.status, 
            error: data.error?.message 
          });
          return res.status(400).json({ 
            error: data.error?.message || 'Failed to fetch models' 
          });
        }

        res.json({
          success: true,
          models: data.data.map((model: any) => ({
            id: model.id,
            owned_by: model.owned_by,
            created: model.created
          }))
        });
      } catch (err) {
        ctx.logger.error('OpenAI models fetch failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // GET /openai/health - Service health check
    app.get('/openai/health', (_req, res) => {
      res.json({
        service: 'openai',
        status: openaiConfig ? 'healthy' : 'unavailable',
        version: '1.0.0',
        endpoints: {
          chat: ['/openai/chat'],
          completion: ['/openai/complete'],
          models: ['/openai/models']
        }
      });
    });

    // Stub endpoints for when OpenAI is not configured
    if (!openaiConfig) {
      app.post('/openai/chat', (_req, res) => {
        res.status(503).json({ error: 'OpenAI service not configured' });
      });
      app.post('/openai/complete', (_req, res) => {
        res.status(503).json({ error: 'OpenAI service not configured' });
      });
      app.get('/openai/models', (_req, res) => {
        res.status(503).json({ error: 'OpenAI service not configured' });
      });
    }
  }
};

export default openaiService;

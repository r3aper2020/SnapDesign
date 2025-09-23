import type { Express, Request, Response, NextFunction } from 'express';
import type { ServiceModule, ServiceContext } from '../../core/types';
import path from 'path';
import dotenv from 'dotenv';
import { verifyFirebaseToken } from '../../core/auth';

// Load service-scoped .env (server/src/services/firebase/.env)
dotenv.config({ path: path.join(__dirname, '.env') });
// Also try loading from the project root as fallback
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

interface FirebaseConfig {
  projectId: string;
  webApiKey: string;
  authDomain: string;
  databaseURL: string;
}

function getFirebaseConfig(): FirebaseConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const webApiKey = process.env.FIREBASE_WEB_API_KEY;

  // Only log in development mode for security
  if (process.env.NODE_ENV === 'development') {
    console.log('Firebase config check:', {
      projectId: projectId ? 'SET' : 'MISSING',
      webApiKey: webApiKey ? 'SET' : 'MISSING',
      allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('FIREBASE_'))
    });
  }

  if (!projectId || !webApiKey) {
    return null;
  }

  return {
    projectId,
    webApiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${projectId}.firebaseio.com`
  };
}

let firebaseConfig: FirebaseConfig | null = null;

function requireFirebase(req: Request, res: Response, next: NextFunction) {
  if (!firebaseConfig) {
    return res.status(503).json({ error: 'Firebase service not configured' });
  }
  next();
}

// Minimal auth input checks only. Firestore CRUD is client-side via security rules.

const firebaseService: ServiceModule = {
  name: 'firebase',
  async init(ctx: ServiceContext) {
    firebaseConfig = getFirebaseConfig();

    if (firebaseConfig) {
      ctx.logger.info(`Firebase service initialized for project: ${firebaseConfig.projectId}`);
    } else {
      ctx.logger.warn('Firebase env vars missing (FIREBASE_PROJECT_ID, FIREBASE_WEB_API_KEY). Service will run in stub mode');
    }
  },
  async registerRoutes(app: Express, ctx: ServiceContext) {
    // Auth endpoints using Firebase REST API

    // POST /auth/signup - Create new user account
    app.post('/auth/signup', requireFirebase, async (req, res) => {
      try {
        const r = req.body as { email?: unknown; password?: unknown };
        const basicValid = !!r && typeof r.email === 'string' && typeof r.password === 'string' && r.email.includes('@') && (r.password as string).length >= 6;
        if (!basicValid) {
          return res.status(400).json({ error: 'Invalid request data' });
        }

        const { email, password, displayName } = req.body as { email: string; password: string; displayName?: string };

        // Additional security: rate limiting could be added here
        // Additional security: email domain validation could be added here

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig!.webApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              displayName,
              returnSecureToken: true
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          // Log the error for debugging but don't expose internal details
          ctx.logger.error('Firebase signup failed', {
            status: response.status,
            error: data.error?.message,
            email: email // Don't log password
          });
          return res.status(400).json({ error: data.error?.message || 'Signup failed' });
        }

        res.json({
          uid: data.localId,
          email: data.email,
          displayName: data.displayName,
          idToken: data.idToken,
          refreshToken: data.refreshToken
        });
      } catch (err) {
        ctx.logger.error('Signup failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /auth/login - Sign in existing user
    app.post('/auth/login', requireFirebase, async (req, res) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' });
        }

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig!.webApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          // Log failed login attempts for security monitoring
          ctx.logger.warn('Firebase login failed', {
            status: response.status,
            error: data.error?.message,
            email: email // Don't log password
          });
          return res.status(401).json({ error: data.error?.message || 'Login failed' });
        }

        res.json({
          uid: data.localId,
          email: data.email,
          displayName: data.displayName,
          idToken: data.idToken,
          refreshToken: data.refreshToken
        });
      } catch (err) {
        ctx.logger.error('Login failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /auth/refresh - Refresh ID token
    app.post('/auth/refresh', requireFirebase, async (req, res) => {
      try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
          return res.status(400).json({ error: 'Refresh token required' });
        }

        const response = await fetch(
          `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig!.webApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grant_type: 'refresh_token',
              refresh_token: refreshToken
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          return res.status(401).json({ error: 'Token refresh failed' });
        }

        res.json({
          idToken: data.id_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in
        });
      } catch (err) {
        ctx.logger.error('Token refresh failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // GET /auth/me - Verify ID token and get user info
    app.get('/auth/me', requireFirebase, async (req, res) => {
      try {
        const authHeader = req.header('authorization') || '';
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.substring('Bearer '.length)
          : undefined;
        if (!token) return res.status(401).json({ error: 'Missing bearer token' });

        // Additional security: token format validation
        if (token.length < 100) {
          return res.status(401).json({ error: 'Invalid token format' });
        }

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig!.webApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token })
          }
        );

        const data = await response.json();

        if (!response.ok || !data.users || data.users.length === 0) {
          // Log invalid token attempts for security monitoring
          ctx.logger.warn('Invalid token verification attempt', {
            status: response.status,
            hasToken: !!token,
            tokenLength: token?.length
          });
          return res.status(401).json({ error: 'Invalid token' });
        }

        const user = data.users[0];
        res.json({
          uid: user.localId,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified === 'true'
        });
      } catch (err) {
        ctx.logger.error('Token verification failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /auth/reset-password - Send password reset email
    app.post('/auth/reset-password', requireFirebase, async (req, res) => {
      try {
        const { email } = req.body;
        if (!email) {
          return res.status(400).json({ error: 'Email required' });
        }

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig!.webApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestType: 'PASSWORD_RESET',
              email
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          return res.status(400).json({ error: data.error?.message || 'Password reset failed' });
        }

        res.json({ message: 'Password reset email sent' });
      } catch (err) {
        ctx.logger.error('Password reset failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // ============================================================================
    // SERVICE HEALTH AND CONFIGURATION ENDPOINTS
    // ============================================================================

    // GET /firebase/health - Service health check
    app.get('/firebase/health', (_req, res) => {
      res.json({
        service: 'firebase',
        status: firebaseConfig ? 'healthy' : 'unavailable',
        version: '1.0.0',
        endpoints: {
          auth: ['/auth/signup', '/auth/login', '/auth/refresh', '/auth/me', '/auth/reset-password'],
          firestore: ['/firestore/config']
        }
      });
    });

    // GET /firestore/config - Get Firebase client config (gated by valid ID token)
    app.get('/firestore/config', (req, res, next) => verifyFirebaseToken(req, res, next, ctx), async (req, res) => {
      try {
        // Token is already verified by middleware
        if (!req.user) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        res.json({
          success: true,
          config: {
            projectId: firebaseConfig!.projectId,
            apiKey: firebaseConfig!.webApiKey,
            authDomain: firebaseConfig!.authDomain,
            databaseURL: firebaseConfig!.databaseURL,
            storageBucket: `${firebaseConfig!.projectId}.appspot.com`,
            messagingSenderId: process.env.FIREBASE_PROJECT_NUMBER,
            appId: process.env.FIREBASE_APP_ID || '1:165511796478:web:your-app-id'
          }
        });
      } catch (err) {
        ctx.logger.error('firestore/config failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // No stub endpoints: guarded by requireFirebase to return 503 if not configured
  }
};

export default firebaseService;
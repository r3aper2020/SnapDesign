import type { Express, Request, Response, NextFunction } from 'express';
import type { ServiceModule, ServiceContext } from '../../core/types';
import path from 'path';
import dotenv from 'dotenv';
import { verifyFirebaseToken } from '../../core/auth';
import * as admin from 'firebase-admin';

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


// Initialize Firebase Admin SDK
function initializeFirebaseAdmin(ctx: ServiceContext) {
  if (!admin.apps.length) {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_CERT as string);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    ctx.logger.info('Firebase Admin SDK initialized');
  }
}

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

        // Create user in Firebase Auth
        // First check if email exists to give a clearer error
        const checkResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${firebaseConfig!.webApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: email,
              continueUri: 'http://localhost'
            })
          }
        );

        const checkData = await checkResponse.json();
        if (checkData.registered) {
          ctx.logger.warn('Attempted signup with existing email', { email });
          return res.status(400).json({ error: 'Email already exists. Please login instead.' });
        }

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

        const authData = await response.json();

        if (!response.ok) {
          ctx.logger.error('Firebase signup failed', {
            status: response.status,
            error: authData.error?.message,
            email: email
          });
          return res.status(400).json({ error: authData.error?.message || 'Signup failed' });
        }

        // Initialize user document with token usage in Firestore
        let tokenUsage = {
          tokenRequestCount: 10,
          nextUpdate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
        };

        try {
          // Initialize Firebase Admin if not already initialized
          if (!admin.apps.length) {
            initializeFirebaseAdmin(ctx);
          }

          const db = admin.firestore();

          // Use Admin SDK to write to Firestore
          await db.collection('users').doc(authData.localId).set({
            email,
            displayName: displayName || email.split('@')[0],
            createdAt: new Date().toISOString(),
            tokenUsage
          });

          ctx.logger.info('Firestore document created successfully', {
            userId: authData.localId,
            tokenUsage
          });
        } catch (err) {
          ctx.logger.error('Failed to initialize Firestore document', err);
          // Continue with signup but use default token values
          res.status(500).json({ error: 'Failed to initialize Firestore document' });
          return;
        }

        res.json({
          uid: authData.localId,
          email: authData.email,
          displayName: authData.displayName,
          idToken: authData.idToken,
          refreshToken: authData.refreshToken,
          tokens: {
            remaining: tokenUsage.tokenRequestCount,
            nextUpdate: tokenUsage.nextUpdate
          }
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

        // Get user's token usage from Firestore using service account
        // Initialize Firebase Admin if not already initialized
        if (!admin.apps.length) {
          initializeFirebaseAdmin(ctx);
        }

        const db = admin.firestore();

        const userDoc = await db.collection('users').doc(data.localId).get();
        const userData = userDoc.data();
        const tokenUsage = userData?.tokenUsage || {
          tokenRequestCount: 10,
          nextUpdate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
        };

        res.json({
          uid: data.localId,
          email: data.email,
          displayName: data.displayName,
          idToken: data.idToken,
          refreshToken: data.refreshToken,
          tokens: {
            remaining: tokenUsage.tokenRequestCount,
            nextUpdate: tokenUsage.nextUpdate
          }
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

        // Get user's token usage from Firestore using service account
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (!serviceAccountPath) {
          throw new Error('GOOGLE_APPLICATION_CREDENTIALS not configured');
        }

        const serviceAccount = require(serviceAccountPath);
        if (!admin.apps.length) {
          initializeFirebaseAdmin(ctx);
        }

        const db = admin.firestore();

        const userDoc = await db.collection('users').doc(data.localId).get();


        const userData = userDoc.data();
        const tokenUsage = userData?.tokenUsage || {
          tokenRequestCount: 10,
          nextUpdate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
        };

        res.json({
          uid: user.localId,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified === 'true',
          tokens: {
            remaining: parseInt(tokenUsage.tokenRequestCount?.integerValue || '0'),
            nextUpdate: tokenUsage.nextUpdate?.stringValue || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
          }
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

    // Firestore User Endpoints
    // POST /firestore/users/:uid - Create user
    app.post('/firestore/users/:uid', (req, res, next) => verifyFirebaseToken(req, res, next, ctx), async (req, res) => {
      try {
        // Ensure user can only create their own data
        if (req.params.uid !== req.user?.uid) {
          return res.status(403).json({ error: 'Unauthorized access to user data' });
        }

        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (!serviceAccountPath) {
          throw new Error('GOOGLE_APPLICATION_CREDENTIALS not configured');
        }

        const serviceAccount = require(serviceAccountPath);
        if (!admin.apps.length) {
          initializeFirebaseAdmin(ctx);
        }

        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(req.params.uid).get();

        // First check if user already exists
        const userData = userDoc.data();
        if (userData) {
          return res.json(userData);
        }

        // Create new user document
        await db.collection('users').doc(req.params.uid).set({
          ...req.body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tokenUsage: {
            tokenRequestCount: 10,
            nextUpdate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
          }
        });

        const newDoc = await db.collection('users').doc(req.params.uid).get();
        res.json(newDoc.data());
      } catch (err) {
        ctx.logger.error('Failed to create user', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // GET /firestore/users/:uid - Get user data
    app.get('/firestore/users/:uid', (req, res, next) => verifyFirebaseToken(req, res, next, ctx), async (req, res) => {
      try {
        // Ensure user can only access their own data
        if (req.params.uid !== req.user?.uid) {
          return res.status(403).json({ error: 'Unauthorized access to user data' });
        }

        if (!admin.apps.length) {
          initializeFirebaseAdmin(ctx);
        }

        const db = admin.firestore();

        const userDoc = await db.collection('users').doc(req.params.uid).get();
        const userData = userDoc.data();

        if (!userData) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json(userData);
      } catch (err) {
        ctx.logger.error('Failed to get user data', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /firestore/users/:uid/last-login - Update user's last login
    app.post('/firestore/users/:uid/last-login', (req, res, next) => verifyFirebaseToken(req, res, next, ctx), async (req, res) => {
      try {
        // Ensure user can only update their own data
        if (req.params.uid !== req.user?.uid) {
          return res.status(403).json({ error: 'Unauthorized access to user data' });
        }

        if (!admin.apps.length) {
          initializeFirebaseAdmin(ctx);
        }

        const db = admin.firestore();

        const now = new Date().toISOString();
        await db.collection('users').doc(req.params.uid).update({
          lastLoginAt: now,
          'stats.lastActiveAt': now,
          updatedAt: now
        });

        res.json({ success: true });
      } catch (err) {
        ctx.logger.error('Failed to update last login', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /firestore/users/:uid/stats - Update user's stats
    app.post('/firestore/users/:uid/stats', (req, res, next) => verifyFirebaseToken(req, res, next, ctx), async (req, res) => {
      try {
        // Ensure user can only update their own data
        if (req.params.uid !== req.user?.uid) {
          return res.status(403).json({ error: 'Unauthorized access to user data' });
        }

        if (!admin.apps.length) {
          initializeFirebaseAdmin(ctx);
        }

        const db = admin.firestore();

        const now = new Date().toISOString();
        const stats = req.body;
        await db.collection('users').doc(req.params.uid).update({
          stats,
          'stats.lastActiveAt': now,
          updatedAt: now
        });

        res.json({ success: true });
      } catch (err) {
        ctx.logger.error('Failed to update user stats', err);
        res.status(500).json({ error: 'Internal server error' });
      }
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
            appId: process.env.FIREBASE_APP_ID || '1:165511796478:web:your-app-id',
            // No need to expose service token when using Admin SDK
          }
        });
      } catch (err) {
        ctx.logger.error('firestore/config failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

  }
};

export default firebaseService;
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { authRouter } from './auth/auth.controller';
import { userRepository } from './users/user.repository';
import { pool } from './config/db';

const PORT = process.env.PORT || 3001;

function createApp(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const express = require('express');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cors = require('cors');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cookieParser = require('cookie-parser');

    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use(cookieParser());
    expressApp.use(
      cors({
        origin: true,
        credentials: true,
      })
    );

    expressApp.get('/health', (_req: any, res: any) => {
      res.status(200).json({ status: 'ok', service: 'scms-identity-service', timestamp: new Date() });
    });

    expressApp.use('/api/v1/auth', authRouter);
    return expressApp;
  } catch {
    // Lightweight Node.js HTTP request handler compatible with http.createServer(app)
    const routes: Array<{ method: string; fullPath: string; handlers: Function[] }> = [
      {
        method: 'GET',
        fullPath: '/health',
        handlers: [
          (_req: any, res: any) => {
            res.status(200).json({ status: 'ok', service: 'scms-identity-service', timestamp: new Date() });
          },
        ],
      },
    ];

    if (authRouter && Array.isArray(authRouter._routes)) {
      for (const r of authRouter._routes) {
        routes.push({
          method: r.method,
          fullPath: `/api/v1/auth${r.path}`,
          handlers: r.handlers,
        });
      }
    }

    const matchPath = (pattern: string, actualPath: string): Record<string, string> | null => {
      const patternParts = pattern.split('/').filter(Boolean);
      const actualParts = actualPath.split('?')[0].split('/').filter(Boolean);
      if (patternParts.length !== actualParts.length) return null;
      const params: Record<string, string> = {};
      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
          params[patternParts[i].slice(1)] = decodeURIComponent(actualParts[i]);
        } else if (patternParts[i] !== actualParts[i]) {
          return null;
        }
      }
      return params;
    };

    const handler: any = (req: http.IncomingMessage, res: http.ServerResponse) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      req.on('end', async () => {
        const rawBody = Buffer.concat(chunks).toString('utf-8');
        let parsedBody: any = {};
        if (rawBody) {
          try {
            parsedBody = JSON.parse(rawBody);
          } catch {
            parsedBody = {};
          }
        }

        const cookies: Record<string, string> = {};
        const cookieHeader = req.headers.cookie || '';
        cookieHeader.split(';').forEach((pair) => {
          const idx = pair.indexOf('=');
          if (idx > -1) {
            cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
          }
        });

        let statusCode = 200;
        const extraCookies: string[] = [];

        const expressReq: any = Object.assign(req, {
          body: parsedBody,
          cookies,
          params: {},
          path: (req.url || '/').split('?')[0],
        });

        const expressRes: any = Object.assign(res, {
          status(code: number) {
            statusCode = code;
            return expressRes;
          },
          cookie(name: string, val: string) {
            extraCookies.push(`${name}=${encodeURIComponent(val)}; Path=/; HttpOnly`);
            return expressRes;
          },
          clearCookie(name: string) {
            extraCookies.push(`${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
            return expressRes;
          },
          json(payload: any) {
            if (!res.headersSent) {
              const headers: Record<string, any> = { 'Content-Type': 'application/json' };
              if (extraCookies.length > 0) {
                headers['Set-Cookie'] = extraCookies;
              }
              res.writeHead(statusCode, headers);
              res.end(JSON.stringify(payload));
            }
            return expressRes;
          },
        });

        const method = (req.method || 'GET').toUpperCase();
        const urlPath = (req.url || '/').split('?')[0];

        for (const r of routes) {
          if (r.method === method) {
            const params = matchPath(r.fullPath, urlPath);
            if (params) {
              expressReq.params = params;
              let idx = 0;
              const next = async (): Promise<void> => {
                const fn = r.handlers[idx++];
                if (fn) {
                  await fn(expressReq, expressRes, next);
                }
              };
              await next();
              return;
            }
          }
        }

        expressRes.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Route not found' });
      });
    };

    handler.listen = (port: number, callback?: () => void) => {
      const server = http.createServer(handler);
      return server.listen(port, callback);
    };

    return handler;
  }
}

export const app = createApp();

export async function startServer(): Promise<void> {
  await pool.query('SELECT 1');
  await userRepository.init();
  console.log('Connected to PostgreSQL sms_identity');

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  SCMS Identity & Access Service running on port ${PORT}`);
    console.log(`  Institution: PUPQC - Syllabus Compliance Monitoring`);
    console.log(`=======================================================`);
  });
}

// Start server if run directly
if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to connect to PostgreSQL sms_identity:', err);
    process.exit(1);
  });
}

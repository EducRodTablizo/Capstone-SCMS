import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 3000;

// Enable reverse proxy trust for cloud providers (Render, Heroku, AWS ELB)
app.set('trust proxy', 1);

// Allowed origins for CORS (Local development, Vercel preview/production, and custom domain)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://sms.pupqc.edu.ph',
];

if (process.env.CLIENT_ORIGIN) {
  allowedOrigins.push(process.env.CLIENT_ORIGIN);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check exact matches
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Check Vercel preview deployments (e.g. https://scms-xxx.vercel.app)
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Check PUPQC subdomains (e.g. https://*.pupqc.edu.ph)
      if (/^https:\/\/.*\.pupqc\.edu\.ph$/.test(origin)) {
        return callback(null, true);
      }

      // Check localhost on any port for development
      if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Downstream microservices map
const SERVICES: Record<string, { port: number; name: string }> = {
  '/api/v1/auth': { port: 3001, name: 'identity-service' },
  '/api/v1/requirements': { port: 3002, name: 'requirements-service' },
  '/api/v1/terms': { port: 3002, name: 'requirements-service' },
  '/api/v1/calendar': { port: 3002, name: 'requirements-service' },
  '/api/v1/submissions': { port: 3003, name: 'submission-service' },
  '/api/v1/signatories': { port: 3003, name: 'submission-service' },
  '/api/v1/integrations/fms/assignments': { port: 3003, name: 'submission-service' },
  '/api/v1/audit-logs': { port: 3004, name: 'audit-log-service' },
  '/api/v1/audit': { port: 3004, name: 'audit-log-service' },
  '/api/v1/compliance': { port: 3005, name: 'compliance-monitoring-service' },
  '/api/v1/integrations': { port: 3005, name: 'compliance-monitoring-service' },
  '/api/v1/catalog/webhooks': { port: 3005, name: 'compliance-monitoring-service' },
  '/api/v1/programs': { port: 3006, name: 'academic-catalog-service' },
  '/api/v1/courses': { port: 3006, name: 'academic-catalog-service' },
  '/api/v1/curricula': { port: 3006, name: 'academic-catalog-service' },
  '/api/v1/block-sections': { port: 3006, name: 'academic-catalog-service' },
  '/api/v1/catalogue': { port: 3006, name: 'academic-catalog-service' },
};

/**
 * Resolves the target base URL for a microservice.
 * Supports environment overrides (e.g. IDENTITY_SERVICE_URL or IDENTITY_SERVICE_HOST)
 * for flexible deployment on Render, Docker, or localhost.
 */
function resolveServiceTarget(serviceName: string, defaultPort: number) {
  const envPrefix = serviceName.toUpperCase().replace(/-/g, '_');
  const serviceUrl = process.env[`${envPrefix}_URL`];
  if (serviceUrl) {
    const formattedUrl = serviceUrl.startsWith('http://') || serviceUrl.startsWith('https://')
      ? serviceUrl
      : `https://${serviceUrl}`;
    const parsed = new URL(formattedUrl);
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80),
      isHttps: parsed.protocol === 'https:',
    };
  }

  const customHost = process.env[`${envPrefix}_HOST`];
  const targetHost = customHost || (process.env.LOCAL_DEV === 'true' ? 'localhost' : serviceName);
  return {
    protocol: 'http:',
    hostname: targetHost,
    port: defaultPort,
    isHttps: false,
  };
}

// Generic reverse proxy handler supporting HTTP/HTTPS targets
function proxyToService(defaultPort: number, serviceName: string) {
  return (req: Request, res: Response) => {
    const target = resolveServiceTarget(serviceName, defaultPort);
    const client = target.isHttps ? https : http;

    console.log(
      `[API Gateway] Proxy: ${req.method} ${req.originalUrl} -> ${target.protocol}//${target.hostname}:${target.port}${req.originalUrl} | Auth: ${req.headers.authorization ? 'Bearer present' : 'None'}`
    );

    const options: http.RequestOptions = {
      hostname: target.hostname,
      port: target.port,
      path: req.originalUrl,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${target.hostname}:${target.port}`,
        'x-forwarded-for': req.ip,
        'x-forwarded-host': req.headers.host || `localhost:${PORT}`,
        'x-forwarded-proto': req.secure ? 'https' : 'http',
      },
    };

    const proxyReq = client.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[API Gateway] Error proxying to ${serviceName} (${target.hostname}:${target.port}):`, err.message);
      if (!res.headersSent) {
        res.status(503).json({
          statusCode: 503,
          message: `Service '${serviceName}' is temporarily unavailable on port ${target.port}. Please verify that the microservice is running.`,
          error: 'Service Unavailable',
          targetService: serviceName,
        });
      }
    });

    req.pipe(proxyReq);
  };
}

// Register proxy routes
for (const [routePrefix, target] of Object.entries(SERVICES)) {
  app.use(routePrefix, proxyToService(target.port, target.name));
}

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const serviceChecks: Record<string, string> = {};

  for (const [route, target] of Object.entries(SERVICES)) {
    if (serviceChecks[target.name]) continue; // Avoid duplicate checks for services mapped to multiple routes

    try {
      const resolved = resolveServiceTarget(target.name, target.port);
      const client = resolved.isHttps ? https : http;

      const isUp = await new Promise<boolean>((resolve) => {
        const pingReq = client.get(
          {
            hostname: resolved.hostname,
            port: resolved.port,
            path: '/health',
            timeout: 2000,
          },
          (pingRes) => {
            resolve(pingRes.statusCode === 200);
          }
        );
        pingReq.on('error', () => resolve(false));
        pingReq.on('timeout', () => {
          pingReq.destroy();
          resolve(false);
        });
      });
      serviceChecks[target.name] = isUp ? 'ONLINE' : 'OFFLINE';
    } catch {
      serviceChecks[target.name] = 'OFFLINE';
    }
  }

  res.status(200).json({
    status: 'ok',
    gateway: 'SCMS Ingress API Gateway',
    port: PORT,
    timestamp: new Date().toISOString(),
    downstreamServices: serviceChecks,
  });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log('=======================================================');
  console.log(`  SCMS API Gateway running on port ${PORT}`);
  console.log('  Single Entry Point & Reverse Proxy for all microservices');
  console.log('  Routes:');
  console.log('    /api/v1/auth         -> Identity Service (3001)');
  console.log('    /api/v1/requirements -> Requirements Service (3002)');
  console.log('    /api/v1/submissions  -> Submission Service (3003)');
  console.log('    /api/v1/audit-logs   -> Audit Log Service (3004)');
  console.log('    /api/v1/compliance   -> Compliance Service (3005)');
  console.log('    /api/v1/programs     -> Academic Catalog Service (3006)');
  console.log('=======================================================');
});

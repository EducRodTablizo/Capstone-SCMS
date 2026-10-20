import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Enable CORS for frontend Vite client
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Downstream microservices map
const SERVICES: Record<string, { port: number; name: string }> = {
  '/api/v1/auth': { port: 3001, name: 'identity-service' },
  '/api/v1/requirements': { port: 3002, name: 'requirements-service' },
  '/api/v1/submissions': { port: 3003, name: 'submission-service' },
  '/api/v1/audit-logs': { port: 3004, name: 'audit-log-service' },
  '/api/v1/compliance': { port: 3005, name: 'compliance-monitoring-service' },
  '/api/v1/programs': { port: 3006, name: 'academic-catalog-service' },
  '/api/v1/courses': { port: 3006, name: 'academic-catalog-service' },
  '/api/v1/curricula': { port: 3006, name: 'academic-catalog-service' },
  '/api/v1/block-sections': { port: 3006, name: 'academic-catalog-service' },
  '/api/v1/catalogue': { port: 3006, name: 'academic-catalog-service' },
};

// Generic reverse proxy handler using native Node.js HTTP
function proxyToService(targetPort: number, serviceName: string) {
  return (req: Request, res: Response) => {
    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: targetPort,
      path: req.originalUrl,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${targetPort}`,
        'x-forwarded-for': req.ip,
        'x-forwarded-host': req.headers.host || 'localhost:3000',
        'x-forwarded-proto': 'http',
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[API Gateway] Error proxying to ${serviceName} (Port ${targetPort}):`, err.message);
      if (!res.headersSent) {
        res.status(503).json({
          statusCode: 503,
          message: `Service '${serviceName}' is temporarily unavailable on port ${targetPort}. Please verify that the microservice is running.`,
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
    try {
      const isUp = await new Promise<boolean>((resolve) => {
        const pingReq = http.get(`http://localhost:${target.port}/health`, (pingRes) => {
          resolve(pingRes.statusCode === 200);
        });
        pingReq.on('error', () => resolve(false));
        pingReq.setTimeout(1000, () => {
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

app.listen(PORT, () => {
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

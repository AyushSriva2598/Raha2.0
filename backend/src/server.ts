import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { config } from './config/index.js';
import { realtimeService } from './services/realtimeService.js';
import { db } from './db/db.js';

import assessmentsRouter from './routes/assessments.js';
import eventsRouter from './routes/events.js';
import lakesRouter from './routes/lakes.js';
import safePointsRouter from './routes/safePoints.js';
import userRouter from './routes/user.js';
import alertsRouter from './routes/alerts.js';
import scenarioRouter from './routes/scenario.js';
import routesRouter from './routes/routes.js';
import authRouter from './routes/auth.js';
import internalRouter from './routes/internal.js';
import realtimeRouter from './routes/realtime.js';
import feedRouter from './routes/feed.js';
import routeRouter from './routes/route.js';
import glofRouter from './routes/glof.js';

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  realtimeService.registerWsClient(ws);
});

// Middlewares
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  if (req.path !== '/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'raha-product-backend',
    timestamp: new Date().toISOString(),
    postgresConnected: db.isConnected,
  });
});

// Mount API routes (100% matched to mobile app client contracts)
app.use('/api/assessments', assessmentsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/lakes', lakesRouter);
app.use('/api/safe-points', safePointsRouter);
app.use('/api/user', userRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/scenario', scenarioRouter);
app.use('/api/routes', routesRouter);
app.use('/api/auth', authRouter);
app.use('/api/internal', internalRouter);
app.use('/api/realtime', realtimeRouter);
app.use('/api/feed', feedRouter);
app.use('/api/route', routeRouter);
app.use('/api/glof', glofRouter);

// Global 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start HTTP + WS server
server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🏔️  Raha Glacial Threat Backend API Server running`);
  console.log(`🚀 Port: ${config.port}`);
  console.log(`🌐 REST API: http://localhost:${config.port}/api`);
  console.log(`⚡ WebSocket: ws://localhost:${config.port}/ws`);
  console.log(`📡 SSE Stream: http://localhost:${config.port}/api/realtime/stream`);
  console.log(`🩺 Health: http://localhost:${config.port}/health`);
  console.log(`=======================================================`);
});

export default app;

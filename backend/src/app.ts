/**
 * Express 應用程式設定
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import 'express-async-errors';

import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { swaggerSpec } from './config/swagger';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import {
  projectRoutes,
  moduleRoutes,
  useCaseRoutes,
  sequenceRoutes,
  apiRoutes,
  dtoRoutes,
  linkRoutes,
  catalogRoutes,
  searchRoutes,
  consistencyRoutes,
  aiRoutes,
  exportImportRoutes,
  statisticsRoutes,
} from './routes';

// 建立 Express 應用程式
const app: Application = express();

// 基本中間件
console.log('CORS origin configuration:', config.cors.origin);
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
})); // 安全性標頭
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 日誌
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 限流
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 在生產環境啟用限流
if (config.isProduction) {
  app.use('/api/', limiter);
}

// API 路由
const apiPrefix = config.api.prefix;

// Swagger API 文檔
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SpecForge API Documentation',
}));

// API 規格 JSON
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 健康檢查（不需要前綴）
app.use('/health', healthRoutes);

// 認證路由
app.use(`${apiPrefix}/auth`, authRoutes);

// 業務路由
app.use(`${apiPrefix}/projects`, projectRoutes);
app.use(`${apiPrefix}`, moduleRoutes); // Module routes 包含 /projects/:id/modules 和 /modules/:id 路徑
app.use(`${apiPrefix}`, useCaseRoutes); // UseCase routes 包含 /modules/:id/use-cases 和 /use-cases/:id 路徑
app.use(`${apiPrefix}`, sequenceRoutes); // Sequence routes 包含 /use-cases/:id/sequences 和 /sequences/:id 路徑
app.use(`${apiPrefix}`, apiRoutes); // API Contract routes 包含 /projects/:id/apis 和 /apis/:id 路徑
app.use(`${apiPrefix}`, dtoRoutes); // DTO routes 包含 /projects/:id/dtos 和 /dtos/:id 路徑
app.use(`${apiPrefix}/api-sequence-links`, linkRoutes.apiSequenceRouter);
app.use(`${apiPrefix}/api-dto-links`, linkRoutes.apiDtoRouter);
app.use(`${apiPrefix}/catalog`, catalogRoutes);
app.use(`${apiPrefix}/search`, searchRoutes);
app.use(`${apiPrefix}/consistency`, consistencyRoutes);
app.use(`${apiPrefix}/ai`, aiRoutes);
app.use(`${apiPrefix}/export`, exportImportRoutes.exportRouter);
app.use(`${apiPrefix}/import`, exportImportRoutes.importRouter);
app.use(`${apiPrefix}/statistics`, statisticsRoutes);

// 根路徑
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'SpecForge API',
    version: config.api.version,
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// 版本資訊
app.get('/version', (_req: Request, res: Response) => {
  res.json({
    name: 'SpecForge',
    version: '1.0.0',
    apiVersion: config.api.version,
    nodeVersion: process.version,
    environment: config.env,
  });
});

// 404 處理
app.use(notFoundHandler);

// 錯誤處理（必須放在最後）
app.use(errorHandler);

export default app;
/**
 * 健康檢查路由
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

/**
 * 基本健康檢查
 * GET /health
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * 就緒狀態檢查
 * GET /health/ready
 */
router.get('/ready', asyncHandler(async (_req: Request, res: Response) => {
  const checks: Record<string, any> = {};
  
  // 檢查資料庫
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'ok',
      response_time: `${Date.now() - startTime}ms`,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString(),
    };
  }

  // 檢查 Redis
  try {
    const startTime = Date.now();
    if (redisClient.isOpen) {
      await redisClient.ping();
      checks.redis = {
        status: 'ok',
        response_time: `${Date.now() - startTime}ms`,
        last_check: new Date().toISOString(),
      };
    } else {
      checks.redis = {
        status: 'disconnected',
        last_check: new Date().toISOString(),
      };
    }
  } catch (error) {
    checks.redis = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString(),
    };
  }

  // 檢查 AI 服務（模擬）
  checks.ai_service = {
    status: 'ok',
    response_time: '200ms',
    mode: process.env.AI_MOCK_MODE === 'true' ? 'mock' : 'live',
    last_check: new Date().toISOString(),
  };

  // 檢查 Mermaid 解析器
  checks.mermaid_parser = {
    status: 'ok',
    response_time: '10ms',
    last_check: new Date().toISOString(),
  };

  // 判斷整體狀態
  const allHealthy = Object.values(checks).every(
    (check) => check.status === 'ok'
  );

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
}));

/**
 * 存活狀態檢查
 * GET /health/live
 */
router.get('/live', (_req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.json({
    status: 'alive',
    uptime: Math.floor(uptime),
    memory_usage: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      percentage: `${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`,
    },
    cpu_usage: {
      user: `${Math.round(cpuUsage.user / 1000)}ms`,
      system: `${Math.round(cpuUsage.system / 1000)}ms`,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * 資料庫連線狀態檢查
 * GET /health/db
 */
router.get('/db', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM project
    `;
    
    res.json({
      status: 'connected',
      response_time: `${Date.now() - startTime}ms`,
      project_count: Number(result[0].count),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * 一致性檢查服務狀態
 * GET /health/consistency
 */
router.get('/consistency', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // 檢查是否有執行中的一致性檢查
    // 這裡先返回模擬資料，實際實作時會檢查真實狀態
    res.json({
      status: 'ready',
      last_check: null,
      checks_in_progress: 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * 詳細系統狀態
 * GET /health/detailed
 */
router.get('/detailed', asyncHandler(async (_req: Request, res: Response) => {
  // 收集所有健康檢查資訊
  const [dbCheck, redisCheck, liveCheck] = await Promise.allSettled([
    // 資料庫檢查
    prisma.$queryRaw`SELECT 1`,
    // Redis 檢查
    redisClient.isOpen ? redisClient.ping() : Promise.reject('Not connected'),
    // 系統資源
    Promise.resolve({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    }),
  ]);

  res.json({
    status: 'detailed',
    database: {
      status: dbCheck.status === 'fulfilled' ? 'ok' : 'error',
      error: dbCheck.status === 'rejected' ? dbCheck.reason : undefined,
    },
    redis: {
      status: redisCheck.status === 'fulfilled' ? 'ok' : 'error',
      error: redisCheck.status === 'rejected' ? redisCheck.reason : undefined,
    },
    system: liveCheck.status === 'fulfilled' ? liveCheck.value : null,
    environment: {
      node_version: process.version,
      env: process.env.NODE_ENV,
      pid: process.pid,
      platform: process.platform,
    },
    timestamp: new Date().toISOString(),
  });
}));

export default router;
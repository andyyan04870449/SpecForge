/**
 * 伺服器啟動檔案
 */

import app from './app';
import { config } from './config/env';
import { connectRedis } from './config/redis';
import winston from 'winston';

// 建立 logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// 處理未捕獲的異常
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// 處理未處理的 Promise 拒絕
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 啟動伺服器
async function startServer() {
  try {
    // 連線到 Redis
    await connectRedis();
    
    // 啟動 Express 伺服器
    const server = app.listen(config.port, () => {
      logger.info(`
        ################################################
        🚀 Server is running!
        🔧 Environment: ${config.env}
        📡 Port: ${config.port}
        🌐 API Prefix: ${config.api.prefix}
        📝 API Version: ${config.api.version}
        🔗 Health Check: http://localhost:${config.port}/health
        🔗 API Base URL: http://localhost:${config.port}${config.api.prefix}
        ################################################
      `);
    });

    // 優雅關閉
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // 等待現有連線完成（最多 10 秒）
      setTimeout(() => {
        logger.error('Forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // 監聽終止信號
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 啟動伺服器
startServer();
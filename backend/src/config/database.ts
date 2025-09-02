/**
 * 資料庫連線配置
 */

import { PrismaClient } from '@prisma/client';
import { config } from './env';
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

// 建立 Prisma Client 實例
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: config.isDevelopment
      ? ['query', 'error', 'warn']
      : ['error'],
    errorFormat: config.isDevelopment ? 'pretty' : 'minimal',
  });
};

declare global {
  var prisma: PrismaClient | undefined;
}

// 確保只有一個 Prisma Client 實例
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (config.isDevelopment) {
  globalThis.prisma = prisma;
}

// 連線事件處理
prisma.$connect()
  .then(() => {
    logger.info('✅ Database connected successfully');
  })
  .catch((error) => {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// 優雅關閉
process.on('beforeExit', async () => {
  logger.info('Disconnecting from database...');
  await prisma.$disconnect();
});

export default prisma;
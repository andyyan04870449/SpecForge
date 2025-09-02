/**
 * Redis 連線配置
 */

import { createClient } from 'redis';
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

// 建立 Redis 客戶端
export const redisClient = createClient({
  url: config.redis.url,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis: Max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

// 錯誤處理
redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redisClient.on('ready', () => {
  logger.info('✅ Redis client ready');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting...');
});

// 連線到 Redis
export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // 在開發環境中，Redis 連線失敗不應該阻止應用啟動
    if (config.isProduction) {
      throw error;
    }
  }
}

// 斷開 Redis 連線
export async function disconnectRedis(): Promise<void> {
  try {
    await redisClient.quit();
    logger.info('Redis disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
}

// 快取助手函數
export class CacheHelper {
  private static DEFAULT_TTL = 300; // 5 minutes

  /**
   * 設定快取
   */
  static async set(
    key: string,
    value: any,
    ttl: number = CacheHelper.DEFAULT_TTL
  ): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      await redisClient.setEx(key, ttl, stringValue);
    } catch (error) {
      logger.error(`Failed to set cache for key ${key}:`, error);
    }
  }

  /**
   * 取得快取
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Failed to get cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 刪除快取
   */
  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error(`Failed to delete cache for key ${key}:`, error);
    }
  }

  /**
   * 刪除符合模式的快取
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      logger.error(`Failed to delete cache for pattern ${pattern}:`, error);
    }
  }

  /**
   * 檢查快取是否存在
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to check cache existence for key ${key}:`, error);
      return false;
    }
  }
}

export default redisClient;
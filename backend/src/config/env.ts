/**
 * 環境變數配置與驗證
 */

import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 環境變數 Schema
const envSchema = Joi.object({
  // 基本設定
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  
  // 資料庫
  DATABASE_URL: Joi.string().required(),
  
  // Redis
  REDIS_URL: Joi.string().required(),
  
  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  
  // API
  API_VERSION: Joi.string().default('v1'),
  API_PREFIX: Joi.string().default('/api/v1'),
  
  // 限流
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // AI 服務
  OPENAI_API_KEY: Joi.string().allow('').optional(),
  CLAUDE_API_KEY: Joi.string().allow('').optional(),
  AI_MOCK_MODE: Joi.boolean().default(true),
  
  // 日誌
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  LOG_PATH: Joi.string().default('./logs'),
  
  // 系統限制
  MAX_FILE_SIZE_MB: Joi.number().default(10),
  MAX_MERMAID_SIZE_KB: Joi.number().default(100),
  MAX_JSON_SCHEMA_DEPTH: Joi.number().default(10),
  MAX_BATCH_SIZE: Joi.number().default(100),
  
  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:3001'),
}).unknown();

// 驗證環境變數
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

// 匯出配置
export const config = {
  env: envVars.NODE_ENV as 'development' | 'test' | 'production',
  port: envVars.PORT as number,
  
  database: {
    url: envVars.DATABASE_URL as string,
  },
  
  redis: {
    url: envVars.REDIS_URL as string,
  },
  
  jwt: {
    secret: envVars.JWT_SECRET as string,
    expiresIn: envVars.JWT_EXPIRES_IN as string,
  },
  
  api: {
    version: envVars.API_VERSION as string,
    prefix: envVars.API_PREFIX as string,
  },
  
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS as number,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS as number,
  },
  
  ai: {
    openaiApiKey: envVars.OPENAI_API_KEY as string,
    claudeApiKey: envVars.CLAUDE_API_KEY as string,
    mockMode: envVars.AI_MOCK_MODE as boolean,
  },
  
  logging: {
    level: envVars.LOG_LEVEL as string,
    path: envVars.LOG_PATH as string,
  },
  
  limits: {
    maxFileSizeMB: envVars.MAX_FILE_SIZE_MB as number,
    maxMermaidSizeKB: envVars.MAX_MERMAID_SIZE_KB as number,
    maxJsonSchemaDepth: envVars.MAX_JSON_SCHEMA_DEPTH as number,
    maxBatchSize: envVars.MAX_BATCH_SIZE as number,
  },
  
  cors: {
    origin: envVars.CORS_ORIGIN as string,
  },
  
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',
  isProduction: envVars.NODE_ENV === 'production',
};

export default config;
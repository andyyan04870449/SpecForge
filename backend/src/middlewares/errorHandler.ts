/**
 * 錯誤處理中間件
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { AppError, ErrorCode } from '../types/errors';
import { Prisma } from '@prisma/client';

// 建立 logger（稍後會移到獨立的 logger 模組）
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
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

/**
 * 處理 Prisma 錯誤
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': {
      // 唯一約束違反
      const field = (error.meta?.target as string[])?.[0] || 'field';
      return new AppError(
        409,
        ErrorCode.BIZ_DUPLICATE,
        `Duplicate value for ${field}`,
        { field }
      );
    }
    case 'P2025':
      // 記錄不存在
      return new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        'Record not found'
      );
    case 'P2003':
      // 外鍵約束違反
      return new AppError(
        400,
        ErrorCode.BIZ_VALIDATION_ERROR,
        'Foreign key constraint violation',
        { field: error.meta?.field_name as string }
      );
    default:
      return new AppError(
        500,
        ErrorCode.SYS_DATABASE_ERROR,
        'Database operation failed',
        { originalError: error.message }
      );
  }
}

/**
 * 統一錯誤回應格式
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    request_id: string;
    timestamp: string;
  };
}

/**
 * 錯誤處理中間件
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 生成請求 ID
  const requestId = uuidv4();
  
  // 預設錯誤
  let statusCode = 500;
  let errorCode = ErrorCode.SYS_INTERNAL_ERROR;
  let message = 'Internal server error';
  let details: any = undefined;
  let isOperational = false;

  // 處理不同類型的錯誤
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
    isOperational = error.isOperational;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const appError = handlePrismaError(error);
    statusCode = appError.statusCode;
    errorCode = appError.code;
    message = appError.message;
    details = appError.details;
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    errorCode = ErrorCode.VAL_INVALID_INPUT;
    message = 'Invalid input data';
    details = { originalError: error.message };
  } else if (error.name === 'ValidationError') {
    // Joi validation error
    statusCode = 400;
    errorCode = ErrorCode.VAL_INVALID_INPUT;
    message = error.message;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = ErrorCode.AUTH_INVALID_TOKEN;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = ErrorCode.AUTH_TOKEN_EXPIRED;
    message = 'Token expired';
  }

  // 記錄錯誤
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]({
    request_id: requestId,
    method: req.method,
    url: req.url,
    status_code: statusCode,
    error_code: errorCode,
    message,
    details,
    stack: error.stack,
    is_operational: isOperational,
  });

  // 在生產環境隱藏敏感錯誤資訊
  if (process.env.NODE_ENV === 'production' && !isOperational) {
    message = 'An error occurred while processing your request';
    details = undefined;
  }

  // 回應錯誤
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      details,
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 處理中間件
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = new AppError(
    404,
    ErrorCode.BIZ_NOT_FOUND,
    `Route ${req.method} ${req.url} not found`
  );
  next(error);
}

/**
 * 非同步錯誤包裝器
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
/**
 * 錯誤類型定義
 */

export enum ErrorCode {
  // 業務邏輯錯誤
  BIZ_VALIDATION_ERROR = 'BIZ_VALIDATION_ERROR',
  BIZ_NOT_FOUND = 'BIZ_NOT_FOUND',
  BIZ_DUPLICATE = 'BIZ_DUPLICATE',
  BIZ_INVALID_OPERATION = 'BIZ_INVALID_OPERATION',
  BIZ_CONSISTENCY_ERROR = 'BIZ_CONSISTENCY_ERROR',
  
  // 系統錯誤
  SYS_DATABASE_ERROR = 'SYS_DATABASE_ERROR',
  SYS_EXTERNAL_API_ERROR = 'SYS_EXTERNAL_API_ERROR',
  SYS_INTERNAL_ERROR = 'SYS_INTERNAL_ERROR',
  SYS_REDIS_ERROR = 'SYS_REDIS_ERROR',
  
  // 認證授權錯誤
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSION = 'AUTH_INSUFFICIENT_PERMISSION',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  
  // 驗證錯誤
  VAL_INVALID_INPUT = 'VAL_INVALID_INPUT',
  VAL_MISSING_FIELD = 'VAL_MISSING_FIELD',
  VAL_INVALID_FORMAT = 'VAL_INVALID_FORMAT',
  VAL_EXCEEDS_LIMIT = 'VAL_EXCEEDS_LIMIT',
}

export interface ErrorDetails {
  field?: string;
  reason?: string;
  [key: string]: any;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetails;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: ErrorDetails,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 預定義的錯誤類別
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(400, ErrorCode.BIZ_VALIDATION_ERROR, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(404, ErrorCode.BIZ_NOT_FOUND, message);
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string, field: string, value: string) {
    super(
      409,
      ErrorCode.BIZ_DUPLICATE,
      `${resource} with ${field} '${value}' already exists`,
      { field, value }
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(401, ErrorCode.AUTH_UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, ErrorCode.AUTH_INSUFFICIENT_PERMISSION, message);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(500, ErrorCode.SYS_DATABASE_ERROR, message, { originalError }, false);
  }
}

export class ExternalAPIError extends AppError {
  constructor(service: string, message: string, originalError?: any) {
    super(
      503,
      ErrorCode.SYS_EXTERNAL_API_ERROR,
      `External service '${service}' error: ${message}`,
      { service, originalError },
      false
    );
  }
}
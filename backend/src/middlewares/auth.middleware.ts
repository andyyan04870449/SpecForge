/**
 * 認證中介軟體 - JWT Token 驗證
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

// 擴展 Request 類型定義
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * JWT Token 認證中介軟體
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { 
        code: 'AUTH_TOKEN_MISSING', 
        message: '缺少認證 Token' 
      },
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const payload = await authService.verifyAccessToken(token);
    req.user = payload; // 將使用者資訊附加到請求物件
    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: { 
        code: 'AUTH_TOKEN_INVALID', 
        message: 'Token 無效或已過期' 
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 可選認證中介軟體 - Token 存在時解析，不存在時不報錯
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (token) {
    try {
      const payload = await authService.verifyAccessToken(token);
      req.user = payload;
    } catch (error) {
      // 忽略錯誤，繼續處理
    }
  }
  
  next();
};
/**
 * 認證路由 - 最小化實現
 */

import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const authService = new AuthService();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: 用戶註冊
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: 註冊成功
 */
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email 和密碼為必填'
      }
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '密碼長度至少 6 位'
      }
    });
  }

  try {
    const result = await authService.register(email, password, name);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: error.message
      }
    });
  }
}));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: 用戶登入
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 登入成功
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email 和密碼為必填'
      }
    });
  }

  try {
    const result = await authService.login(email, password);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_FAILED',
        message: error.message
      }
    });
  }
}));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: 刷新 Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: 刷新成功
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Refresh token 為必填'
      }
    });
  }

  try {
    const result = await authService.refreshToken(refreshToken);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_REFRESH_FAILED',
        message: error.message
      }
    });
  }
}));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: 用戶登出
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: 登出成功
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Refresh token 為必填'
      }
    });
  }

  try {
    const result = await authService.logout(refreshToken);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: error.message
      }
    });
  }
}));

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: 取得個人資料
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *       401:
 *         description: 未認證
 */
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: '需要認證'
      }
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = await authService.verifyAccessToken(token);
    const user = await authService.getUserById(payload.userId);
    
    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_INVALID',
        message: error.message
      }
    });
  }
}));

export default router;
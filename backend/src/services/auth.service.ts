/**
 * 認證服務 - 最小化實現
 */

import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'specforge-secret-key-2024';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'specforge-refresh-secret-2024';
  private readonly ACCESS_TOKEN_EXPIRES = 15 * 60; // 15 分鐘
  private readonly REFRESH_TOKEN_EXPIRES = 7 * 24 * 60 * 60; // 7 天

  /**
   * 用戶註冊
   */
  async register(email: string, password: string, name?: string) {
    // 檢查 email 是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('Email 已被註冊');
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 12);

    // 創建用戶
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        emailVerified: true, // 暫時設為已驗證
        lastPasswordChange: new Date()
      }
    });

    // 生成 tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tokens
    };
  }

  /**
   * 用戶登入
   */
  async login(email: string, password: string) {
    // 查找用戶
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('用戶不存在');
    }

    // 檢查帳號狀態
    if (!user.isActive) {
      throw new Error('帳號未啟用');
    }

    if (user.isLocked) {
      throw new Error(`帳號已被鎖定: ${user.lockReason || '請聯繫管理員'}`);
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // 增加失敗次數
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: user.failedLoginAttempts + 1,
          isLocked: user.failedLoginAttempts >= 4, // 5次失敗後鎖定
          lockReason: user.failedLoginAttempts >= 4 ? '登入失敗次數過多' : null
        }
      });

      throw new Error('密碼錯誤');
    }

    // 重置失敗次數，更新最後登入時間
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date()
      }
    });

    // 生成 tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tokens
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string) {
    // 查找 refresh token
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!tokenRecord) {
      throw new Error('Invalid refresh token');
    }

    // 檢查是否已撤銷
    if (tokenRecord.isRevoked) {
      throw new Error('Token has been revoked');
    }

    // 檢查是否過期
    if (new Date() > tokenRecord.expiresAt) {
      throw new Error('Refresh token expired');
    }

    // 撤銷舊 token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        isRevoked: true,
        revokedAt: new Date()
      }
    });

    // 生成新 tokens
    const tokens = await this.generateTokens(tokenRecord.user);

    return {
      tokens
    };
  }

  /**
   * 登出
   */
  async logout(refreshToken: string) {
    // 撤銷 refresh token
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });

    if (tokenRecord && !tokenRecord.isRevoked) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          isRevoked: true,
          revokedAt: new Date()
        }
      });
    }

    return { message: '登出成功' };
  }

  /**
   * 驗證 Access Token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  /**
   * 取得用戶資料
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('用戶不存在');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt
    };
  }

  /**
   * 生成 Token 對
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // 生成 access token
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES
    });

    // 生成 refresh token
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshToken = jwt.sign(
      { token: refreshTokenValue },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES }
    );

    // 儲存 refresh token 到資料庫
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES * 1000)
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRES,
      refreshExpiresIn: this.REFRESH_TOKEN_EXPIRES
    };
  }
}
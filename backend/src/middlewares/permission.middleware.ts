/**
 * 權限檢查中介軟體 - 專案權限驗證
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 擴展 Request 類型定義
declare global {
  namespace Express {
    interface Request {
      projectMember?: {
        id: string;
        projectId: string;
        userId: string;
        role: 'OWNER' | 'EDITOR' | 'VIEWER';
        permissions: any;
      };
    }
  }
}

// 角色權限層級定義
const ROLE_HIERARCHY = {
  'VIEWER': 1,
  'EDITOR': 2,
  'OWNER': 3
} as const;

type ProjectRole = keyof typeof ROLE_HIERARCHY;

/**
 * 檢查專案權限的中介軟體
 * @param requiredRole 需要的最低權限角色
 */
export const checkProjectPermission = (requiredRole: ProjectRole = 'VIEWER') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 確保已經通過認證
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { 
          code: 'AUTH_REQUIRED', 
          message: '需要認證' 
        },
        timestamp: new Date().toISOString()
      });
    }

    // 從路徑參數或查詢參數獲取專案 ID
    const projectId = req.params.projectId || req.query.project_id as string || req.body.project_id;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'PROJECT_ID_MISSING', 
          message: '缺少專案 ID' 
        },
        timestamp: new Date().toISOString()
      });
    }

    const userId = req.user.userId;
    
    try {
      // 檢查專案是否存在
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: { 
            code: 'PROJECT_NOT_FOUND', 
            message: '專案不存在' 
          },
          timestamp: new Date().toISOString()
        });
      }

      // 檢查是否為專案擁有者
      if (project.ownerId === userId) {
        req.projectMember = {
          id: 'owner',
          projectId: project.id,
          userId: userId,
          role: 'OWNER',
          permissions: {}
        };
        return next();
      }

      // 檢查專案成員表
      const member = await prisma.projectMember.findFirst({
        where: {
          projectId: projectId,
          userId: userId
        }
      });
      
      if (!member) {
        return res.status(403).json({
          success: false,
          error: { 
            code: 'PERMISSION_DENIED', 
            message: '無權限存取此專案' 
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // 檢查角色權限
      const userRoleLevel = ROLE_HIERARCHY[member.role];
      const requiredLevel = ROLE_HIERARCHY[requiredRole];
      
      if (userRoleLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: { 
            code: 'INSUFFICIENT_PERMISSION', 
            message: '權限不足' 
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // 將專案成員資訊附加到請求物件
      req.projectMember = {
        id: member.id,
        projectId: member.projectId,
        userId: member.userId,
        role: member.role,
        permissions: member.permissions
      };
      
      next();
    } catch (error: any) {
      console.error('權限檢查錯誤:', error);
      return res.status(500).json({
        success: false,
        error: { 
          code: 'PERMISSION_CHECK_FAILED', 
          message: '權限檢查失敗' 
        },
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * 檢查專案所有權（只有擁有者才能執行的操作）
 */
export const checkProjectOwnership = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { 
        code: 'AUTH_REQUIRED', 
        message: '需要認證' 
      },
      timestamp: new Date().toISOString()
    });
  }

  const projectId = req.params.projectId || req.query.project_id as string || req.body.project_id;
  
  if (!projectId) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'PROJECT_ID_MISSING', 
        message: '缺少專案 ID' 
      },
      timestamp: new Date().toISOString()
    });
  }

  const userId = req.user.userId;
  
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { 
          code: 'PROJECT_NOT_FOUND', 
          message: '專案不存在' 
        },
        timestamp: new Date().toISOString()
      });
    }

    if (project.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: { 
          code: 'OWNER_PERMISSION_REQUIRED', 
          message: '需要專案擁有者權限' 
        },
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  } catch (error: any) {
    console.error('所有權檢查錯誤:', error);
    return res.status(500).json({
      success: false,
      error: { 
        code: 'OWNERSHIP_CHECK_FAILED', 
        message: '所有權檢查失敗' 
      },
      timestamp: new Date().toISOString()
    });
  }
};
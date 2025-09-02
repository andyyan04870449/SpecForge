import { PrismaClient, Module, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError, ErrorCode } from '../types/errors';
import { CodeGeneratorService } from './codeGenerator.service';

export interface CreateModuleInput {
  projectId: string;
  title: string;
  description?: string;
  parentId?: string;
  order?: number;
}

export interface UpdateModuleInput {
  title?: string;
  description?: string;
  parentId?: string | null;
  order?: number;
}

export interface ModuleListParams {
  projectId: string;
  parentId?: string | null;
  includeChildren?: boolean;
  sortBy?: 'modCode' | 'title' | 'order' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ModuleWithChildren extends Module {
  children?: ModuleWithChildren[];
  parent?: Module | null;
  _count?: {
    children: number;
    useCases: number;
  };
}

export class ModuleService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * 建立模組
   */
  async create(data: CreateModuleInput): Promise<Module> {
    // 驗證專案是否存在
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Project with ID ${data.projectId} not found`
      );
    }

    // 如果有 parentId，驗證父模組是否存在且屬於同一專案
    if (data.parentId) {
      const parentModule = await this.prisma.module.findFirst({
        where: {
          id: data.parentId,
          projectId: data.projectId,
        },
      });

      if (!parentModule) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `Parent module with ID ${data.parentId} not found in this project`
        );
      }
    }

    // 生成模組代碼
    const modCode = await CodeGeneratorService.generateModuleCode(
      data.projectId
    );

    // 如果沒有指定順序，自動分配
    let order = data.order;
    if (order === undefined) {
      const maxOrder = await this.prisma.module.aggregate({
        where: {
          projectId: data.projectId,
          parentId: data.parentId || null,
        },
        _max: {
          order: true,
        },
      });
      order = (maxOrder._max.order || 0) + 1;
    }

    return this.prisma.module.create({
      data: {
        projectId: data.projectId,
        modCode,
        title: data.title,
        description: data.description,
        parentId: data.parentId,
        order,
      },
    });
  }

  /**
   * 查詢模組列表
   */
  async findAll(params: ModuleListParams): Promise<{
    data: ModuleWithChildren[];
    total: number;
  }> {
    const {
      projectId,
      parentId,
      includeChildren = false,
      sortBy = 'order',
      sortOrder = 'asc',
    } = params;

    const where: Prisma.ModuleWhereInput = {
      projectId,
    };

    // 如果指定了 parentId（包括 null），則過濾
    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    const modules = await this.prisma.module.findMany({
      where,
      include: {
        parent: true,
        _count: {
          select: {
            children: true,
            useCases: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    // 如果需要包含子模組，建立樹狀結構
    if (includeChildren && parentId === null) {
      const moduleMap = new Map<string, ModuleWithChildren>();
      const rootModules: ModuleWithChildren[] = [];

      // 第一遍：將所有模組放入 Map
      modules.forEach(module => {
        moduleMap.set(module.id, { ...module, children: [] });
      });

      // 第二遍：建立父子關係
      modules.forEach(module => {
        const moduleWithChildren = moduleMap.get(module.id)!;
        if (module.parentId) {
          const parent = moduleMap.get(module.parentId);
          if (parent) {
            parent.children!.push(moduleWithChildren);
          }
        } else {
          rootModules.push(moduleWithChildren);
        }
      });

      return {
        data: rootModules,
        total: modules.length,
      };
    }

    return {
      data: modules,
      total: modules.length,
    };
  }

  /**
   * 取得單一模組詳情
   */
  async findById(id: string): Promise<ModuleWithChildren> {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        project: true,
        parent: true,
        children: {
          orderBy: { order: 'asc' },
        },
        useCases: {
          orderBy: { ucCode: 'asc' },
        },
        _count: {
          select: {
            children: true,
            useCases: true,
          },
        },
      },
    });

    if (!module) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Module with ID ${id} not found`
      );
    }

    return module;
  }

  /**
   * 更新模組
   */
  async update(id: string, data: UpdateModuleInput): Promise<Module> {
    const existingModule = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!existingModule) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Module with ID ${id} not found`
      );
    }

    // 如果要更新父模組，需要檢查
    if (data.parentId !== undefined) {
      // 不能將模組設為自己的子模組
      if (data.parentId === id) {
        throw new AppError(
          400,
          ErrorCode.BIZ_VALIDATION_ERROR,
          'Module cannot be its own parent'
        );
      }

      // 如果設定了新的父模組，檢查是否會造成循環
      if (data.parentId) {
        const wouldCreateCycle = await this.checkCyclicDependency(
          id,
          data.parentId
        );
        if (wouldCreateCycle) {
          throw new AppError(
            400,
            ErrorCode.BIZ_VALIDATION_ERROR,
            'This change would create a circular dependency'
          );
        }

        // 驗證父模組是否存在且屬於同一專案
        const parentModule = await this.prisma.module.findFirst({
          where: {
            id: data.parentId,
            projectId: existingModule.projectId,
          },
        });

        if (!parentModule) {
          throw new AppError(
            404,
            ErrorCode.BIZ_NOT_FOUND,
            `Parent module with ID ${data.parentId} not found in this project`
          );
        }
      }
    }

    return this.prisma.module.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 刪除模組
   */
  async delete(id: string): Promise<void> {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            useCases: true,
          },
        },
      },
    });

    if (!module) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Module with ID ${id} not found`
      );
    }

    // 檢查是否有子模組
    if (module._count.children > 0) {
      throw new AppError(
        400,
        ErrorCode.BIZ_VALIDATION_ERROR,
        `Cannot delete module with ${module._count.children} child module(s)`
      );
    }

    // 檢查是否有用例
    if (module._count.useCases > 0) {
      throw new AppError(
        400,
        ErrorCode.BIZ_VALIDATION_ERROR,
        `Cannot delete module with ${module._count.useCases} use case(s)`
      );
    }

    await this.prisma.module.delete({
      where: { id },
    });
  }

  /**
   * 取得模組樹狀結構
   */
  async getModuleTree(projectId: string): Promise<ModuleWithChildren[]> {
    const modules = await this.prisma.module.findMany({
      where: { projectId },
      include: {
        _count: {
          select: {
            children: true,
            useCases: true,
          },
        },
      },
      orderBy: [
        { parentId: 'asc' },
        { order: 'asc' },
      ],
    });

    // 建立樹狀結構
    const moduleMap = new Map<string, ModuleWithChildren>();
    const rootModules: ModuleWithChildren[] = [];

    // 第一遍：將所有模組放入 Map
    modules.forEach(module => {
      moduleMap.set(module.id, { ...module, children: [] });
    });

    // 第二遍：建立父子關係
    modules.forEach(module => {
      const moduleWithChildren = moduleMap.get(module.id)!;
      if (module.parentId) {
        const parent = moduleMap.get(module.parentId);
        if (parent) {
          parent.children!.push(moduleWithChildren);
        }
      } else {
        rootModules.push(moduleWithChildren);
      }
    });

    return rootModules;
  }

  /**
   * 移動模組順序
   */
  async reorder(id: string, newOrder: number): Promise<Module> {
    const module = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Module with ID ${id} not found`
      );
    }

    // 取得同層級的所有模組
    const siblings = await this.prisma.module.findMany({
      where: {
        projectId: module.projectId,
        parentId: module.parentId,
        id: { not: id },
      },
      orderBy: { order: 'asc' },
    });

    // 更新順序
    const updates: Promise<any>[] = [];

    if (newOrder < module.order) {
      // 向上移動
      siblings.forEach(sibling => {
        if (sibling.order >= newOrder && sibling.order < module.order) {
          updates.push(
            this.prisma.module.update({
              where: { id: sibling.id },
              data: { order: sibling.order + 1 },
            })
          );
        }
      });
    } else if (newOrder > module.order) {
      // 向下移動
      siblings.forEach(sibling => {
        if (sibling.order > module.order && sibling.order <= newOrder) {
          updates.push(
            this.prisma.module.update({
              where: { id: sibling.id },
              data: { order: sibling.order - 1 },
            })
          );
        }
      });
    }

    // 更新目標模組的順序
    updates.push(
      this.prisma.module.update({
        where: { id },
        data: { order: newOrder },
      })
    );

    await Promise.all(updates);

    return this.findById(id);
  }

  /**
   * 檢查循環依賴
   */
  private async checkCyclicDependency(
    moduleId: string,
    potentialParentId: string
  ): Promise<boolean> {
    if (moduleId === potentialParentId) {
      return true;
    }

    const parent = await this.prisma.module.findUnique({
      where: { id: potentialParentId },
    });

    if (!parent || !parent.parentId) {
      return false;
    }

    return this.checkCyclicDependency(moduleId, parent.parentId);
  }
}

export default new ModuleService();
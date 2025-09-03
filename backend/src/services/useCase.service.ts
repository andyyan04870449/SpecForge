import { PrismaClient, UseCase, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError, ErrorCode } from '../types/errors';
import { CodeGeneratorService } from './codeGenerator.service';

export interface CreateUseCaseInput {
  moduleId: string;
  title: string;
  summary?: string;
}

export interface UpdateUseCaseInput {
  title?: string;
  summary?: string;
}

export interface UseCaseListParams {
  moduleId?: string;
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'ucCode' | 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UseCaseWithRelations extends UseCase {
  module?: any;
  project?: any;
  sequenceDiagrams?: any[];
  _count?: {
    sequenceDiagrams: number;
  };
}

export class UseCaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * 建立用例
   */
  async create(data: CreateUseCaseInput): Promise<UseCase> {
    // 驗證模組是否存在
    const module = await this.prisma.module.findUnique({
      where: { id: data.moduleId },
      include: { project: true },
    });

    if (!module) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Module with ID ${data.moduleId} not found`
      );
    }

    // 生成用例代碼
    const ucCode = await CodeGeneratorService.generateUseCaseCode(
      module.projectId,
      data.moduleId
    );

    return this.prisma.useCase.create({
      data: {
        projectId: module.projectId,
        moduleId: data.moduleId,
        ucCode,
        title: data.title,
        summary: data.summary,
      },
    });
  }

  /**
   * 查詢用例列表
   */
  async findAll(params: UseCaseListParams = {}): Promise<{
    data: UseCaseWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      moduleId,
      projectId,
      search,
      page = 1,
      limit = 10,
      sortBy = 'ucCode',
      sortOrder = 'asc',
    } = params;

    // 確保 page 和 limit 是數字
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    
    const skip = (pageNum - 1) * limitNum;
    
    const where: Prisma.UseCaseWhereInput = {};
    
    if (moduleId) {
      where.moduleId = moduleId;
    }
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { ucCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.useCase.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          module: true,
          project: true,
          _count: {
            select: {
              sequenceDiagrams: true,
            },
          },
        },
      }),
      this.prisma.useCase.count({ where }),
    ]);

    return {
      data,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * 取得單一用例詳情
   */
  async findById(id: string): Promise<UseCaseWithRelations> {
    const useCase = await this.prisma.useCase.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            parent: true,
          },
        },
        project: true,
        sequenceDiagrams: {
          orderBy: { sdCode: 'asc' },
        },
        _count: {
          select: {
            sequenceDiagrams: true,
          },
        },
      },
    });

    if (!useCase) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `UseCase with ID ${id} not found`
      );
    }

    return useCase;
  }

  /**
   * 更新用例
   */
  async update(id: string, data: UpdateUseCaseInput): Promise<UseCase> {
    const existingUseCase = await this.prisma.useCase.findUnique({
      where: { id },
    });

    if (!existingUseCase) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `UseCase with ID ${id} not found`
      );
    }

    return this.prisma.useCase.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 刪除用例
   */
  async delete(id: string): Promise<void> {
    const useCase = await this.prisma.useCase.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sequenceDiagrams: true,
          },
        },
      },
    });

    if (!useCase) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `UseCase with ID ${id} not found`
      );
    }

    // 檢查是否有序列圖
    if (useCase._count.sequenceDiagrams > 0) {
      throw new AppError(
        400,
        ErrorCode.BIZ_VALIDATION_ERROR,
        `Cannot delete use case with ${useCase._count.sequenceDiagrams} sequence diagram(s)`
      );
    }

    await this.prisma.useCase.delete({
      where: { id },
    });
  }

  /**
   * 批量建立用例
   */
  async createBatch(
    moduleId: string,
    useCases: Array<{ title: string; summary?: string }>
  ): Promise<UseCase[]> {
    // 驗證模組是否存在
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { project: true },
    });

    if (!module) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Module with ID ${moduleId} not found`
      );
    }

    const createdUseCases: UseCase[] = [];

    // 使用事務批量建立
    await this.prisma.$transaction(async (tx) => {
      for (const useCase of useCases) {
        const ucCode = await CodeGeneratorService.generateUseCaseCode(
          module.projectId,
          moduleId
        );

        const created = await tx.useCase.create({
          data: {
            projectId: module.projectId,
            moduleId,
            ucCode,
            title: useCase.title,
            summary: useCase.summary,
          },
        });

        createdUseCases.push(created);
      }
    });

    return createdUseCases;
  }

  /**
   * 複製用例
   */
  async duplicate(id: string, newTitle: string): Promise<UseCase> {
    const sourceUseCase = await this.prisma.useCase.findUnique({
      where: { id },
    });

    if (!sourceUseCase) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `UseCase with ID ${id} not found`
      );
    }

    // 生成新的用例代碼
    const ucCode = await CodeGeneratorService.generateUseCaseCode(
      sourceUseCase.projectId,
      sourceUseCase.moduleId
    );

    return this.prisma.useCase.create({
      data: {
        projectId: sourceUseCase.projectId,
        moduleId: sourceUseCase.moduleId,
        ucCode,
        title: newTitle,
        summary: sourceUseCase.summary,
      },
    });
  }

  /**
   * 移動用例到其他模組
   */
  async moveToModule(id: string, targetModuleId: string): Promise<UseCase> {
    const useCase = await this.prisma.useCase.findUnique({
      where: { id },
    });

    if (!useCase) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `UseCase with ID ${id} not found`
      );
    }

    // 驗證目標模組是否存在且屬於同一專案
    const targetModule = await this.prisma.module.findFirst({
      where: {
        id: targetModuleId,
        projectId: useCase.projectId,
      },
    });

    if (!targetModule) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Target module with ID ${targetModuleId} not found in the same project`
      );
    }

    return this.prisma.useCase.update({
      where: { id },
      data: {
        moduleId: targetModuleId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 取得模組下的所有用例統計
   */
  async getStatsByModule(moduleId: string): Promise<any> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Module with ID ${moduleId} not found`
      );
    }

    const [useCaseCount, sequenceCount] = await Promise.all([
      this.prisma.useCase.count({
        where: { moduleId },
      }),
      this.prisma.sequenceDiagram.count({
        where: {
          useCase: {
            moduleId,
          },
        },
      }),
    ]);

    const useCases = await this.prisma.useCase.findMany({
      where: { moduleId },
      include: {
        _count: {
          select: {
            sequenceDiagrams: true,
          },
        },
      },
      orderBy: { ucCode: 'asc' },
    });

    return {
      module: {
        id: module.id,
        title: module.title,
        modCode: module.modCode,
      },
      statistics: {
        totalUseCases: useCaseCount,
        totalSequenceDiagrams: sequenceCount,
        averageSequencesPerUseCase: useCaseCount > 0 
          ? (sequenceCount / useCaseCount).toFixed(2) 
          : 0,
      },
      useCases: useCases.map(uc => ({
        id: uc.id,
        ucCode: uc.ucCode,
        title: uc.title,
        sequenceCount: uc._count.sequenceDiagrams,
      })),
    };
  }
}

export default new UseCaseService();
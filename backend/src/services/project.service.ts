import { PrismaClient, Project, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError, ErrorCode } from '../types/errors';
import { CodeGeneratorService } from './codeGenerator.service';

export interface CreateProjectInput {
  name: string;
  description?: string;
  version?: string;
  ownerId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  version?: string;
  status?: 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  ownerId?: string;
}

export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export class ProjectService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: CreateProjectInput): Promise<Project> {
    const projectCode = await CodeGeneratorService.generateProjectCode(data.name);
    
    return this.prisma.project.create({
      data: {
        ...data,
        projectCode,
        status: 'PLANNING',
      },
    });
  }

  async findAll(params: ProjectListParams = {}, userId?: string): Promise<{
    data: Project[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;
    
    const where: Prisma.ProjectWhereInput = {};
    
    // 權限過濾：只顯示有權限的專案
    if (userId) {
      where.OR = [
        { ownerId: userId }, // 擁有者
        { 
          members: { 
            some: { 
              userId: userId,
              role: { in: ['OWNER', 'EDITOR', 'VIEWER'] }
            } 
          } 
        }
      ];
    }
    
    // 搜尋條件
    const searchConditions: Prisma.ProjectWhereInput[] = [];
    if (search) {
      searchConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { projectCode: { contains: search, mode: 'insensitive' } },
        ]
      });
    }
    
    if (status) {
      searchConditions.push({ status });
    }
    
    // 合併權限過濾和搜尋條件
    if (searchConditions.length > 0) {
      if (where.OR) {
        // 如果已有權限過濾，需要同時滿足權限和搜尋條件
        where.AND = [
          { OR: where.OR },
          ...searchConditions
        ];
        delete where.OR;
      } else {
        // 沒有權限過濾時，直接使用搜尋條件
        where.AND = searchConditions;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          members: userId ? {
            where: { userId },
            select: { role: true }
          } : false
        }
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, userId?: string): Promise<Project> {
    // 建構權限過濾條件
    const where: Prisma.ProjectWhereInput = { id };
    
    if (userId) {
      where.OR = [
        { ownerId: userId },
        { 
          members: { 
            some: { 
              userId: userId,
              role: { in: ['OWNER', 'EDITOR', 'VIEWER'] }
            } 
          } 
        }
      ];
      // 需要同時滿足 ID 匹配和權限條件
      where.AND = [
        { id },
        { OR: where.OR }
      ];
      delete where.OR;
      delete where.id;
    }

    const project = await this.prisma.project.findFirst({
      where,
      include: {
        modules: {
          orderBy: { modCode: 'asc' },
        },
        apis: {
          orderBy: { apiCode: 'asc' },
        },
        dtos: {
          orderBy: { dtoCode: 'asc' },
        },
        _count: {
          select: {
            modules: true,
            apis: true,
            dtos: true,
          },
        },
      },
    });

    if (!project) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Project with ID ${id} not found`
      );
    }

    return project;
  }

  async update(id: string, data: UpdateProjectInput): Promise<Project> {
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Project with ID ${id} not found`
      );
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Project with ID ${id} not found`
      );
    }

    await this.prisma.project.delete({
      where: { id },
    });
  }

  async getStatistics(id: string): Promise<any> {
    const project = await this.findById(id);

    const [moduleCount, useCaseCount, sequenceCount, apiCount, dtoCount] = await Promise.all([
      this.prisma.module.count({ where: { projectId: id } }),
      this.prisma.useCase.count({ where: { projectId: id } }),
      this.prisma.sequenceDiagram.count({ where: { projectId: id } }),
      this.prisma.apiContract.count({ where: { projectId: id } }),
      this.prisma.dtoSchema.count({ where: { projectId: id } }),
    ]);

    return {
      project: {
        id: project.id,
        name: project.name,
        projectCode: project.projectCode,
        status: project.status,
      },
      statistics: {
        modules: moduleCount,
        useCases: useCaseCount,
        sequences: sequenceCount,
        apis: apiCount,
        dtos: dtoCount,
        lastUpdated: project.updatedAt,
      },
    };
  }

  // 專案成員管理功能
  async getProjectMember(projectId: string, userId: string) {
    return this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId
      }
    });
  }

  async addProjectMember(projectId: string, userId: string, role: string, invitedBy: string) {
    // 檢查是否已經是成員
    const existingMember = await this.getProjectMember(projectId, userId);
    if (existingMember) {
      throw new AppError(
        400,
        ErrorCode.BIZ_VALIDATION_ERROR,
        '使用者已經是專案成員'
      );
    }

    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
        invitedBy,
        acceptedAt: new Date() // 直接接受邀請
      }
    });
  }

  async updateProjectMember(projectId: string, userId: string, role: string) {
    const member = await this.getProjectMember(projectId, userId);
    if (!member) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        '專案成員不存在'
      );
    }

    return this.prisma.projectMember.update({
      where: { id: member.id },
      data: { role }
    });
  }

  async removeProjectMember(projectId: string, userId: string) {
    const member = await this.getProjectMember(projectId, userId);
    if (!member) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        '專案成員不存在'
      );
    }

    await this.prisma.projectMember.delete({
      where: { id: member.id }
    });
  }

  async getProjectMembers(projectId: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}

export default new ProjectService();
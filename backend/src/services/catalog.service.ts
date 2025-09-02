/**
 * 目錄服務 - 提供專案完整目錄樹
 */

import { PrismaClient } from '@prisma/client';
import { AppError, ErrorCode } from '../types/errors';
import winston from 'winston';

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

export interface CatalogNode {
  id: string;
  type: 'project' | 'module' | 'useCase' | 'sequence' | 'api' | 'dto';
  code: string;
  title: string;
  description?: string;
  children?: CatalogNode[];
  metadata?: Record<string, any>;
}

export interface ProjectCatalog {
  project: {
    id: string;
    projectCode: string;
    name: string;
    description?: string;
  };
  modules: CatalogNode[];
  apis: {
    byDomain: Record<string, any[]>;
    total: number;
  };
  dtos: {
    byKind: Record<string, any[]>;
    total: number;
  };
  statistics: {
    totalModules: number;
    totalUseCases: number;
    totalSequences: number;
    totalApis: number;
    totalDtos: number;
    parseErrors: number;
  };
}

export class CatalogService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 取得專案完整目錄樹
   */
  async getProjectCatalog(projectId: string): Promise<ProjectCatalog> {
    try {
      // 取得專案資訊
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `Project with ID ${projectId} not found`
        );
      }

      // 並行取得所有資料
      const [modules, apis, dtos, sequences] = await Promise.all([
        this.getModulesWithHierarchy(projectId),
        this.getApisByDomain(projectId),
        this.getDtosByKind(projectId),
        this.getSequencesWithErrors(projectId),
      ]);

      // 計算統計
      const statistics = await this.calculateStatistics(projectId, sequences);

      return {
        project: {
          id: project.id,
          projectCode: project.projectCode,
          name: project.name,
          description: project.description || undefined,
        },
        modules,
        apis,
        dtos,
        statistics,
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to get project catalog:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to get project catalog',
        error
      );
    }
  }

  /**
   * 取得模組階層結構
   */
  private async getModulesWithHierarchy(projectId: string): Promise<CatalogNode[]> {
    // 取得所有模組和用例
    const modules = await this.prisma.module.findMany({
      where: { projectId },
      include: {
        useCases: {
          include: {
            sequenceDiagrams: {
              select: {
                id: true,
                sdCode: true,
                title: true,
                parseStatus: true,
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // 建立模組映射
    const moduleMap = new Map<string, CatalogNode>();
    const rootModules: CatalogNode[] = [];

    // 第一遍：建立所有模組節點
    modules.forEach(module => {
      const node: CatalogNode = {
        id: module.id,
        type: 'module',
        code: module.modCode,
        title: module.title,
        description: module.description || undefined,
        children: [],
        metadata: {
          parentId: module.parentId,
          order: module.order,
          useCaseCount: module.useCases.length,
        },
      };

      // 加入用例作為子節點
      module.useCases.forEach(useCase => {
        const useCaseNode: CatalogNode = {
          id: useCase.id,
          type: 'useCase',
          code: useCase.ucCode,
          title: useCase.title,
          description: useCase.summary || undefined,
          children: [],
          metadata: {
            sequenceCount: useCase.sequenceDiagrams.length,
          },
        };

        // 加入序列圖作為子節點
        useCase.sequenceDiagrams.forEach(sequence => {
          useCaseNode.children!.push({
            id: sequence.id,
            type: 'sequence',
            code: sequence.sdCode,
            title: sequence.title,
            metadata: {
              parseStatus: sequence.parseStatus,
            },
          });
        });

        node.children!.push(useCaseNode);
      });

      moduleMap.set(module.id, node);
    });

    // 第二遍：建立階層關係
    moduleMap.forEach(node => {
      if (node.metadata?.parentId) {
        const parent = moduleMap.get(node.metadata.parentId);
        if (parent) {
          parent.children!.push(node);
        }
      } else {
        rootModules.push(node);
      }
    });

    return rootModules;
  }

  /**
   * 依 Domain 分組取得 APIs
   */
  private async getApisByDomain(projectId: string): Promise<{
    byDomain: Record<string, any[]>;
    total: number;
  }> {
    const apis = await this.prisma.apiContract.findMany({
      where: { projectId },
      select: {
        id: true,
        apiCode: true,
        title: true,
        method: true,
        endpoint: true,
        domain: true,
        _count: {
          select: {
            apiSequenceLinks: true,
            apiDtoLinks: true,
          },
        },
      },
      orderBy: [
        { domain: 'asc' },
        { endpoint: 'asc' },
      ],
    });

    const byDomain: Record<string, any[]> = {};
    
    apis.forEach(api => {
      if (!byDomain[api.domain]) {
        byDomain[api.domain] = [];
      }
      
      byDomain[api.domain].push({
        id: api.id,
        code: api.apiCode,
        title: api.title,
        method: api.method,
        endpoint: api.endpoint,
        sequenceLinks: api._count.apiSequenceLinks,
        dtoLinks: api._count.apiDtoLinks,
      });
    });

    return {
      byDomain,
      total: apis.length,
    };
  }

  /**
   * 依 Kind 分組取得 DTOs
   */
  private async getDtosByKind(projectId: string): Promise<{
    byKind: Record<string, any[]>;
    total: number;
  }> {
    const dtos = await this.prisma.dtoSchema.findMany({
      where: { projectId },
      select: {
        id: true,
        dtoCode: true,
        title: true,
        kind: true,
        _count: {
          select: {
            apiDtoLinks: true,
          },
        },
      },
      orderBy: [
        { kind: 'asc' },
        { title: 'asc' },
      ],
    });

    const byKind: Record<string, any[]> = {};
    
    dtos.forEach(dto => {
      if (!byKind[dto.kind]) {
        byKind[dto.kind] = [];
      }
      
      byKind[dto.kind].push({
        id: dto.id,
        code: dto.dtoCode,
        title: dto.title,
        apiLinks: dto._count.apiDtoLinks,
      });
    });

    return {
      byKind,
      total: dtos.length,
    };
  }

  /**
   * 取得序列圖和解析錯誤
   */
  private async getSequencesWithErrors(projectId: string): Promise<any[]> {
    return this.prisma.sequenceDiagram.findMany({
      where: { projectId },
      select: {
        id: true,
        parseStatus: true,
        parseError: true,
      },
    });
  }

  /**
   * 計算統計資料
   */
  private async calculateStatistics(
    projectId: string,
    sequences: any[]
  ): Promise<any> {
    const [moduleCount, useCaseCount, apiCount, dtoCount] = await Promise.all([
      this.prisma.module.count({ where: { projectId } }),
      this.prisma.useCase.count({ where: { projectId } }),
      this.prisma.apiContract.count({ where: { projectId } }),
      this.prisma.dtoSchema.count({ where: { projectId } }),
    ]);

    const parseErrors = sequences.filter(s => s.parseStatus === 'error').length;

    return {
      totalModules: moduleCount,
      totalUseCases: useCaseCount,
      totalSequences: sequences.length,
      totalApis: apiCount,
      totalDtos: dtoCount,
      parseErrors,
    };
  }

  /**
   * 取得模組目錄
   */
  async getModuleCatalog(projectId: string): Promise<CatalogNode[]> {
    try {
      return this.getModulesWithHierarchy(projectId);
    } catch (error: any) {
      logger.error('Failed to get module catalog:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to get module catalog',
        error
      );
    }
  }

  /**
   * 取得 API 目錄
   */
  async getApiCatalog(
    projectId: string,
    domain?: string
  ): Promise<any> {
    try {
      const where: any = { projectId };
      if (domain) {
        where.domain = domain;
      }

      const apis = await this.prisma.apiContract.findMany({
        where,
        select: {
          id: true,
          apiCode: true,
          title: true,
          method: true,
          endpoint: true,
          domain: true,
          description: true,
          _count: {
            select: {
              apiSequenceLinks: true,
              apiDtoLinks: true,
            },
          },
        },
        orderBy: [
          { domain: 'asc' },
          { endpoint: 'asc' },
        ],
      });

      // 分組整理
      const catalog: Record<string, any> = {};
      
      apis.forEach(api => {
        if (!catalog[api.domain]) {
          catalog[api.domain] = {
            domain: api.domain,
            apis: [],
            statistics: {
              total: 0,
              byMethod: {},
            },
          };
        }
        
        catalog[api.domain].apis.push({
          id: api.id,
          code: api.apiCode,
          title: api.title,
          method: api.method,
          endpoint: api.endpoint,
          description: api.description,
          links: {
            sequences: api._count.apiSequenceLinks,
            dtos: api._count.apiDtoLinks,
          },
        });
        
        catalog[api.domain].statistics.total++;
        
        if (!catalog[api.domain].statistics.byMethod[api.method]) {
          catalog[api.domain].statistics.byMethod[api.method] = 0;
        }
        catalog[api.domain].statistics.byMethod[api.method]++;
      });

      return {
        domains: Object.values(catalog),
        totalDomains: Object.keys(catalog).length,
        totalApis: apis.length,
      };
    } catch (error: any) {
      logger.error('Failed to get API catalog:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to get API catalog',
        error
      );
    }
  }

  /**
   * 取得 DTO 目錄
   */
  async getDtoCatalog(
    projectId: string,
    kind?: 'request' | 'response'
  ): Promise<any> {
    try {
      const where: any = { projectId };
      if (kind) {
        where.kind = kind;
      }

      const dtos = await this.prisma.dtoSchema.findMany({
        where,
        select: {
          id: true,
          dtoCode: true,
          title: true,
          kind: true,
          _count: {
            select: {
              apiDtoLinks: true,
            },
          },
        },
        orderBy: [
          { kind: 'asc' },
          { title: 'asc' },
        ],
      });

      // 分組整理
      const byKind: Record<string, any[]> = {
        request: [],
        response: [],
      };
      
      dtos.forEach(dto => {
        byKind[dto.kind].push({
          id: dto.id,
          code: dto.dtoCode,
          title: dto.title,
          usageCount: dto._count.apiDtoLinks,
        });
      });

      return {
        request: byKind.request,
        response: byKind.response,
        statistics: {
          totalRequest: byKind.request.length,
          totalResponse: byKind.response.length,
          total: dtos.length,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get DTO catalog:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to get DTO catalog',
        error
      );
    }
  }
}

export default CatalogService;
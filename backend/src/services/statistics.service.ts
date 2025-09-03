/**
 * 統計服務
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

export interface ProjectStatistics {
  projectId: string;
  summary: {
    totalModules: number;
    totalUseCases: number;
    totalSequences: number;
    totalApis: number;
    totalDtos: number;
    totalLinks: number;
  };
  quality: {
    sequencesWithErrors: number;
    sequencesWithoutErrors: number;
    apisWithLinks: number;
    apisWithoutLinks: number;
    dtosInUse: number;
    dtosNotInUse: number;
  };
  coverage: {
    useCasesWithSequences: number;
    useCasesWithoutSequences: number;
    sequencesWithApis: number;
    sequencesWithoutApis: number;
    apisWithDtos: number;
    apisWithoutDtos: number;
  };
  distribution: {
    modulesByDepth: Record<number, number>;
    apisByDomain: Record<string, number>;
    apisByMethod: Record<string, number>;
    dtosByKind: Record<string, number>;
  };
  trends: {
    recentlyUpdated: {
      modules: number;
      useCases: number;
      sequences: number;
      apis: number;
      dtos: number;
    };
  };
}

export class StatisticsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 取得專案完整統計資訊
   */
  async getProjectStatistics(projectId: string): Promise<ProjectStatistics> {
    try {
      // 驗證專案存在
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

      // 並行取得所有統計資料
      const [
        summary,
        quality,
        coverage,
        distribution,
        trends,
      ] = await Promise.all([
        this.getSummaryStats(projectId),
        this.getQualityStats(projectId),
        this.getCoverageStats(projectId),
        this.getDistributionStats(projectId),
        this.getTrendsStats(projectId),
      ]);

      return {
        projectId,
        summary,
        quality,
        coverage,
        distribution,
        trends,
      };
    } catch (error: any) {
      logger.error('Failed to get project statistics:', error);
      throw error;
    }
  }

  /**
   * 取得摘要統計
   */
  private async getSummaryStats(projectId: string) {
    const [
      totalModules,
      totalUseCases,
      totalSequences,
      totalApis,
      totalDtos,
      totalApiSequenceLinks,
      totalApiDtoLinks,
    ] = await Promise.all([
      this.prisma.module.count({ where: { projectId } }),
      this.prisma.useCase.count({ where: { projectId } }),
      this.prisma.sequenceDiagram.count({ where: { projectId } }),
      this.prisma.apiContract.count({ where: { projectId } }),
      this.prisma.dtoSchema.count({ where: { projectId } }),
      this.prisma.apiSequenceLink.count({
        where: { api: { projectId } },
      }),
      this.prisma.apiDtoLink.count({
        where: { api: { projectId } },
      }),
    ]);

    return {
      totalModules,
      totalUseCases,
      totalSequences,
      totalApis,
      totalDtos,
      totalLinks: totalApiSequenceLinks + totalApiDtoLinks,
    };
  }

  /**
   * 取得品質統計
   */
  private async getQualityStats(projectId: string) {
    const [
      sequencesWithErrors,
      sequencesWithoutErrors,
      apisWithLinks,
      dtosInUse,
    ] = await Promise.all([
      this.prisma.sequenceDiagram.count({
        where: {
          projectId,
          parseStatus: 'error',
        },
      }),
      this.prisma.sequenceDiagram.count({
        where: {
          projectId,
          parseStatus: 'success',
        },
      }),
      this.prisma.apiContract.count({
        where: {
          projectId,
          OR: [
            { apiSequenceLinks: { some: {} } },
            { apiDtoLinks: { some: {} } },
          ],
        },
      }),
      this.prisma.dtoSchema.count({
        where: {
          projectId,
          apiDtoLinks: { some: {} },
        },
      }),
    ]);

    const totalApis = await this.prisma.apiContract.count({
      where: { projectId },
    });
    const totalDtos = await this.prisma.dtoSchema.count({
      where: { projectId },
    });

    return {
      sequencesWithErrors,
      sequencesWithoutErrors,
      apisWithLinks,
      apisWithoutLinks: totalApis - apisWithLinks,
      dtosInUse,
      dtosNotInUse: totalDtos - dtosInUse,
    };
  }

  /**
   * 取得覆蓋率統計
   */
  private async getCoverageStats(projectId: string) {
    const [
      useCasesWithSequences,
      totalUseCases,
      sequencesWithApis,
      totalSequences,
      apisWithDtos,
      totalApis,
    ] = await Promise.all([
      this.prisma.useCase.count({
        where: {
          projectId,
          sequenceDiagrams: { some: {} },
        },
      }),
      this.prisma.useCase.count({ where: { projectId } }),
      this.prisma.sequenceDiagram.count({
        where: {
          projectId,
          apiSequenceLinks: { some: {} },
        },
      }),
      this.prisma.sequenceDiagram.count({ where: { projectId } }),
      this.prisma.apiContract.count({
        where: {
          projectId,
          apiDtoLinks: { some: {} },
        },
      }),
      this.prisma.apiContract.count({ where: { projectId } }),
    ]);

    return {
      useCasesWithSequences,
      useCasesWithoutSequences: totalUseCases - useCasesWithSequences,
      sequencesWithApis,
      sequencesWithoutApis: totalSequences - sequencesWithApis,
      apisWithDtos,
      apisWithoutDtos: totalApis - apisWithDtos,
    };
  }

  /**
   * 取得分佈統計
   */
  private async getDistributionStats(projectId: string) {
    // 模組深度分佈
    const modules = await this.prisma.module.findMany({
      where: { projectId },
      select: { parentId: true },
    });

    const modulesByDepth: Record<number, number> = {};
    const calculateDepth = (moduleId: string | null, depth = 0): number => {
      if (!moduleId) return depth;
      const module = modules.find(m => m.parentId === moduleId);
      if (!module) return depth;
      return calculateDepth(module.parentId, depth + 1);
    };

    modules.forEach(module => {
      const depth = calculateDepth(module.parentId);
      modulesByDepth[depth] = (modulesByDepth[depth] || 0) + 1;
    });

    // API 領域分佈
    const apisByDomainResult = await this.prisma.apiContract.groupBy({
      by: ['domain'],
      where: { projectId },
      _count: true,
    });

    const apisByDomain: Record<string, number> = {};
    apisByDomainResult.forEach(item => {
      apisByDomain[item.domain || 'UNKNOWN'] = item._count;
    });

    // API 方法分佈
    const apisByMethodResult = await this.prisma.apiContract.groupBy({
      by: ['method'],
      where: { projectId },
      _count: true,
    });

    const apisByMethod: Record<string, number> = {};
    apisByMethodResult.forEach(item => {
      apisByMethod[item.method] = item._count;
    });

    // DTO 類型分佈
    const dtosByKindResult = await this.prisma.dtoSchema.groupBy({
      by: ['kind'],
      where: { projectId },
      _count: true,
    });

    const dtosByKind: Record<string, number> = {};
    dtosByKindResult.forEach(item => {
      dtosByKind[item.kind] = item._count;
    });

    return {
      modulesByDepth,
      apisByDomain,
      apisByMethod,
      dtosByKind,
    };
  }

  /**
   * 取得趨勢統計（最近7天更新）
   */
  private async getTrendsStats(projectId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      modules,
      useCases,
      sequences,
      apis,
      dtos,
    ] = await Promise.all([
      this.prisma.module.count({
        where: {
          projectId,
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.useCase.count({
        where: {
          projectId,
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.sequenceDiagram.count({
        where: {
          projectId,
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.apiContract.count({
        where: {
          projectId,
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.dtoSchema.count({
        where: {
          projectId,
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return {
      recentlyUpdated: {
        modules,
        useCases,
        sequences,
        apis,
        dtos,
      },
    };
  }

  /**
   * 取得簡易統計（用於 Dashboard）
   */
  async getSimpleStatistics(projectId: string) {
    const stats = await this.getSummaryStats(projectId);
    const quality = await this.getQualityStats(projectId);

    return {
      projectId,
      ...stats,
      errorRate: stats.totalSequences > 0
        ? (quality.sequencesWithErrors / stats.totalSequences) * 100
        : 0,
      linkCoverage: stats.totalApis > 0
        ? (quality.apisWithLinks / stats.totalApis) * 100
        : 0,
    };
  }
}

export default StatisticsService;
/**
 * 搜尋服務 - 提供跨資源搜尋功能
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

export interface SearchResult {
  type: 'project' | 'module' | 'useCase' | 'sequence' | 'api' | 'dto';
  id: string;
  code: string;
  title: string;
  description?: string;
  projectId: string;
  projectName?: string;
  parentInfo?: {
    type: string;
    id: string;
    title: string;
  };
  matchedFields: string[];
  score?: number;
}

export interface SearchOptions {
  query: string;
  projectId?: string;
  types?: string[];
  limit?: number;
  page?: number;
}

export class SearchService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 執行全域搜尋
   */
  async search(options: SearchOptions): Promise<{
    results: SearchResult[];
    meta: {
      total: number;
      page: number;
      limit: number;
      query: string;
    };
  }> {
    try {
      const { query, projectId, types, limit = 20, page = 1 } = options;
      
      if (!query || query.trim().length < 2) {
        throw new AppError(
          400,
          ErrorCode.VAL_INVALID_INPUT,
          'Search query must be at least 2 characters'
        );
      }

      const searchTerm = query.trim().toLowerCase();
      const results: SearchResult[] = [];
      const searchTypes = types || ['project', 'module', 'useCase', 'sequence', 'api', 'dto'];

      // 並行搜尋所有資源類型
      const searchPromises: Promise<SearchResult[]>[] = [];

      if (searchTypes.includes('project') && !projectId) {
        searchPromises.push(this.searchProjects(searchTerm));
      }

      if (searchTypes.includes('module')) {
        searchPromises.push(this.searchModules(searchTerm, projectId));
      }

      if (searchTypes.includes('useCase')) {
        searchPromises.push(this.searchUseCases(searchTerm, projectId));
      }

      if (searchTypes.includes('sequence')) {
        searchPromises.push(this.searchSequences(searchTerm, projectId));
      }

      if (searchTypes.includes('api')) {
        searchPromises.push(this.searchApis(searchTerm, projectId));
      }

      if (searchTypes.includes('dto')) {
        searchPromises.push(this.searchDtos(searchTerm, projectId));
      }

      const searchResults = await Promise.all(searchPromises);
      searchResults.forEach(r => results.push(...r));

      // 排序（按相關性分數）
      results.sort((a, b) => (b.score || 0) - (a.score || 0));

      // 分頁
      const startIndex = (page - 1) * limit;
      const paginatedResults = results.slice(startIndex, startIndex + limit);

      return {
        results: paginatedResults,
        meta: {
          total: results.length,
          page,
          limit,
          query,
        },
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Search failed:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Search failed',
        error
      );
    }
  }

  /**
   * 搜尋專案
   */
  private async searchProjects(searchTerm: string): Promise<SearchResult[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { projectCode: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
    });

    return projects.map(project => ({
      type: 'project' as const,
      id: project.id,
      code: project.projectCode,
      title: project.name,
      description: project.description || undefined,
      projectId: project.id,
      matchedFields: this.getMatchedFields(project, searchTerm, ['name', 'projectCode', 'description']),
      score: this.calculateScore(project, searchTerm, ['name', 'projectCode', 'description']),
    }));
  }

  /**
   * 搜尋模組
   */
  private async searchModules(searchTerm: string, projectId?: string): Promise<SearchResult[]> {
    const where: any = {
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { modCode: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const modules = await this.prisma.module.findMany({
      where,
      include: {
        project: {
          select: { name: true },
        },
        parent: {
          select: { id: true, title: true },
        },
      },
    });

    return modules.map(module => ({
      type: 'module' as const,
      id: module.id,
      code: module.modCode,
      title: module.title,
      description: module.description || undefined,
      projectId: module.projectId,
      projectName: module.project.name,
      parentInfo: module.parent ? {
        type: 'module',
        id: module.parent.id,
        title: module.parent.title,
      } : undefined,
      matchedFields: this.getMatchedFields(module, searchTerm, ['title', 'modCode', 'description']),
      score: this.calculateScore(module, searchTerm, ['title', 'modCode', 'description']),
    }));
  }

  /**
   * 搜尋使用案例
   */
  private async searchUseCases(searchTerm: string, projectId?: string): Promise<SearchResult[]> {
    const where: any = {
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { ucCode: { contains: searchTerm, mode: 'insensitive' } },
        { summary: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const useCases = await this.prisma.useCase.findMany({
      where,
      include: {
        project: {
          select: { name: true },
        },
        module: {
          select: { id: true, title: true },
        },
      },
    });

    return useCases.map(useCase => ({
      type: 'useCase' as const,
      id: useCase.id,
      code: useCase.ucCode,
      title: useCase.title,
      description: useCase.summary || undefined,
      projectId: useCase.projectId,
      projectName: useCase.project.name,
      parentInfo: {
        type: 'module',
        id: useCase.module.id,
        title: useCase.module.title,
      },
      matchedFields: this.getMatchedFields(useCase, searchTerm, ['title', 'ucCode', 'summary']),
      score: this.calculateScore(useCase, searchTerm, ['title', 'ucCode', 'summary']),
    }));
  }

  /**
   * 搜尋序列圖
   */
  private async searchSequences(searchTerm: string, projectId?: string): Promise<SearchResult[]> {
    const where: any = {
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { sdCode: { contains: searchTerm, mode: 'insensitive' } },
        { mermaidSrc: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const sequences = await this.prisma.sequenceDiagram.findMany({
      where,
      include: {
        project: {
          select: { name: true },
        },
        useCase: {
          select: { id: true, title: true },
        },
      },
    });

    return sequences.map(sequence => ({
      type: 'sequence' as const,
      id: sequence.id,
      code: sequence.sdCode,
      title: sequence.title,
      projectId: sequence.projectId,
      projectName: sequence.project.name,
      parentInfo: {
        type: 'useCase',
        id: sequence.useCase.id,
        title: sequence.useCase.title,
      },
      matchedFields: this.getMatchedFields(sequence, searchTerm, ['title', 'sdCode', 'mermaidSrc']),
      score: this.calculateScore(sequence, searchTerm, ['title', 'sdCode']),
    }));
  }

  /**
   * 搜尋 API
   */
  private async searchApis(searchTerm: string, projectId?: string): Promise<SearchResult[]> {
    const where: any = {
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { apiCode: { contains: searchTerm, mode: 'insensitive' } },
        { endpoint: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { domain: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const apis = await this.prisma.apiContract.findMany({
      where,
      include: {
        project: {
          select: { name: true },
        },
      },
    });

    return apis.map(api => ({
      type: 'api' as const,
      id: api.id,
      code: api.apiCode,
      title: `${api.method} ${api.endpoint}`,
      description: api.description || api.title,
      projectId: api.projectId,
      projectName: api.project.name,
      matchedFields: this.getMatchedFields(api, searchTerm, ['title', 'apiCode', 'endpoint', 'description', 'domain']),
      score: this.calculateScore(api, searchTerm, ['title', 'apiCode', 'endpoint']),
    }));
  }

  /**
   * 搜尋 DTO
   */
  private async searchDtos(searchTerm: string, projectId?: string): Promise<SearchResult[]> {
    const where: any = {
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { dtoCode: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const dtos = await this.prisma.dtoSchema.findMany({
      where,
      include: {
        project: {
          select: { name: true },
        },
      },
    });

    return dtos.map(dto => ({
      type: 'dto' as const,
      id: dto.id,
      code: dto.dtoCode,
      title: dto.title,
      description: `${dto.kind} DTO`,
      projectId: dto.projectId,
      projectName: dto.project.name,
      matchedFields: this.getMatchedFields(dto, searchTerm, ['title', 'dtoCode']),
      score: this.calculateScore(dto, searchTerm, ['title', 'dtoCode']),
    }));
  }

  /**
   * 取得符合的欄位
   */
  private getMatchedFields(obj: any, searchTerm: string, fields: string[]): string[] {
    const matched: string[] = [];
    
    fields.forEach(field => {
      if (obj[field] && 
          obj[field].toString().toLowerCase().includes(searchTerm)) {
        matched.push(field);
      }
    });
    
    return matched;
  }

  /**
   * 計算相關性分數
   */
  private calculateScore(obj: any, searchTerm: string, fields: string[]): number {
    let score = 0;
    const weights: Record<string, number> = {
      name: 10,
      title: 10,
      projectCode: 8,
      modCode: 8,
      ucCode: 8,
      sdCode: 8,
      apiCode: 8,
      dtoCode: 8,
      endpoint: 6,
      domain: 4,
      description: 3,
      summary: 3,
      mermaidSrc: 1,
    };

    fields.forEach(field => {
      if (obj[field]) {
        const value = obj[field].toString().toLowerCase();
        const weight = weights[field] || 1;
        
        // 完全匹配
        if (value === searchTerm) {
          score += weight * 10;
        }
        // 開頭匹配
        else if (value.startsWith(searchTerm)) {
          score += weight * 5;
        }
        // 包含匹配
        else if (value.includes(searchTerm)) {
          score += weight * 2;
        }
      }
    });

    return score;
  }

  /**
   * 搜尋建議（自動完成）
   */
  async suggest(
    query: string,
    projectId?: string,
    limit: number = 10
  ): Promise<string[]> {
    try {
      if (!query || query.trim().length < 1) {
        return [];
      }

      const searchTerm = query.trim().toLowerCase();
      const suggestions = new Set<string>();

      // 搜尋各種代碼和標題
      const [projects, modules, useCases, sequences, apis, dtos] = await Promise.all([
        projectId ? [] : this.prisma.project.findMany({
          where: {
            OR: [
              { name: { startsWith: searchTerm, mode: 'insensitive' } },
              { projectCode: { startsWith: searchTerm, mode: 'insensitive' } },
            ],
          },
          select: { name: true, projectCode: true },
          take: 5,
        }),
        this.prisma.module.findMany({
          where: {
            ...(projectId && { projectId }),
            OR: [
              { title: { startsWith: searchTerm, mode: 'insensitive' } },
              { modCode: { startsWith: searchTerm, mode: 'insensitive' } },
            ],
          },
          select: { title: true, modCode: true },
          take: 5,
        }),
        this.prisma.useCase.findMany({
          where: {
            ...(projectId && { projectId }),
            OR: [
              { title: { startsWith: searchTerm, mode: 'insensitive' } },
              { ucCode: { startsWith: searchTerm, mode: 'insensitive' } },
            ],
          },
          select: { title: true, ucCode: true },
          take: 5,
        }),
        this.prisma.sequenceDiagram.findMany({
          where: {
            ...(projectId && { projectId }),
            OR: [
              { title: { startsWith: searchTerm, mode: 'insensitive' } },
              { sdCode: { startsWith: searchTerm, mode: 'insensitive' } },
            ],
          },
          select: { title: true, sdCode: true },
          take: 5,
        }),
        this.prisma.apiContract.findMany({
          where: {
            ...(projectId && { projectId }),
            OR: [
              { title: { startsWith: searchTerm, mode: 'insensitive' } },
              { apiCode: { startsWith: searchTerm, mode: 'insensitive' } },
              { endpoint: { startsWith: searchTerm, mode: 'insensitive' } },
            ],
          },
          select: { title: true, apiCode: true, endpoint: true },
          take: 5,
        }),
        this.prisma.dtoSchema.findMany({
          where: {
            ...(projectId && { projectId }),
            OR: [
              { title: { startsWith: searchTerm, mode: 'insensitive' } },
              { dtoCode: { startsWith: searchTerm, mode: 'insensitive' } },
            ],
          },
          select: { title: true, dtoCode: true },
          take: 5,
        }),
      ]);

      // 收集建議
      projects.forEach(p => {
        suggestions.add(p.name);
        suggestions.add(p.projectCode);
      });

      modules.forEach(m => {
        suggestions.add(m.title);
        suggestions.add(m.modCode);
      });

      useCases.forEach(u => {
        suggestions.add(u.title);
        suggestions.add(u.ucCode);
      });

      sequences.forEach(s => {
        suggestions.add(s.title);
        suggestions.add(s.sdCode);
      });

      apis.forEach(a => {
        suggestions.add(a.title);
        suggestions.add(a.apiCode);
      });

      dtos.forEach(d => {
        suggestions.add(d.title);
        suggestions.add(d.dtoCode);
      });

      return Array.from(suggestions)
        .filter(s => s.toLowerCase().startsWith(searchTerm))
        .slice(0, limit);
    } catch (error: any) {
      logger.error('Failed to get suggestions:', error);
      return [];
    }
  }
}

export default SearchService;
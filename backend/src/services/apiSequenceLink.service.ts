/**
 * API-Sequence 關聯管理服務
 */

import { PrismaClient, ApiSequenceLink, Prisma } from '@prisma/client';
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

export interface CreateApiSequenceLinkDto {
  apiId: string;
  sequenceId: string;
  stepRef?: string;
  lineNumber?: number;
}

export interface UpdateApiSequenceLinkDto {
  stepRef?: string;
  lineNumber?: number;
}

export interface ApiSequenceLinkFilter {
  apiId?: string;
  sequenceId?: string;
  projectId?: string;
}

export class ApiSequenceLinkService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 建立 API-Sequence 關聯
   */
  async create(data: CreateApiSequenceLinkDto): Promise<ApiSequenceLink> {
    try {
      // 驗證 API 和 Sequence 存在
      const [api, sequence] = await Promise.all([
        this.prisma.apiContract.findUnique({
          where: { id: data.apiId },
        }),
        this.prisma.sequenceDiagram.findUnique({
          where: { id: data.sequenceId },
        }),
      ]);

      if (!api) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `API Contract with ID ${data.apiId} not found`
        );
      }

      if (!sequence) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `Sequence Diagram with ID ${data.sequenceId} not found`
        );
      }

      // 驗證 API 和 Sequence 屬於同一專案
      if (api.projectId !== sequence.projectId) {
        throw new AppError(
          400,
          ErrorCode.BIZ_VALIDATION_ERROR,
          'API and Sequence must belong to the same project'
        );
      }

      // 建立關聯
      const link = await this.prisma.apiSequenceLink.create({
        data: {
          apiId: data.apiId,
          sequenceId: data.sequenceId,
          stepRef: data.stepRef || null,
          lineNumber: data.lineNumber || null,
        },
        include: {
          api: true,
          sequence: {
            include: {
              useCase: true,
            },
          },
        },
      });

      logger.info(`Created API-Sequence link: API ${api.apiCode} <-> Sequence ${sequence.sdCode}`);
      return link;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error.code === 'P2002') {
        throw new AppError(
          409,
          ErrorCode.BIZ_DUPLICATE,
          'This API-Sequence link already exists'
        );
      }
      
      logger.error('Failed to create API-Sequence link:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to create API-Sequence link',
        error
      );
    }
  }

  /**
   * 批次建立關聯
   */
  async batchCreate(links: CreateApiSequenceLinkDto[]): Promise<ApiSequenceLink[]> {
    try {
      const results: ApiSequenceLink[] = [];

      await this.prisma.$transaction(async (tx) => {
        for (const link of links) {
          // 驗證 API 和 Sequence
          const [api, sequence] = await Promise.all([
            tx.apiContract.findUnique({
              where: { id: link.apiId },
            }),
            tx.sequenceDiagram.findUnique({
              where: { id: link.sequenceId },
            }),
          ]);

          if (!api || !sequence) {
            throw new AppError(
              404,
              ErrorCode.BIZ_NOT_FOUND,
              'API or Sequence not found'
            );
          }

          if (api.projectId !== sequence.projectId) {
            throw new AppError(
              400,
              ErrorCode.BIZ_VALIDATION_ERROR,
              'API and Sequence must belong to the same project'
            );
          }

          // 檢查是否已存在
          const existing = await tx.apiSequenceLink.findUnique({
            where: {
              apiId_sequenceId_stepRef: {
                apiId: link.apiId,
                sequenceId: link.sequenceId,
                stepRef: link.stepRef || '',
              },
            },
          });

          if (!existing) {
            const created = await tx.apiSequenceLink.create({
              data: {
                apiId: link.apiId,
                sequenceId: link.sequenceId,
                stepRef: link.stepRef || null,
                lineNumber: link.lineNumber || null,
              },
              include: {
                api: true,
                sequence: true,
              },
            });
            results.push(created);
          }
        }
      });

      logger.info(`Batch created ${results.length} API-Sequence links`);
      return results;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to batch create API-Sequence links:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to batch create API-Sequence links',
        error
      );
    }
  }

  /**
   * 取得單一關聯
   */
  async findById(id: string): Promise<ApiSequenceLink> {
    try {
      const link = await this.prisma.apiSequenceLink.findUnique({
        where: { id },
        include: {
          api: true,
          sequence: {
            include: {
              useCase: {
                include: {
                  module: true,
                },
              },
            },
          },
        },
      });

      if (!link) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `API-Sequence link with ID ${id} not found`
        );
      }

      return link;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to find API-Sequence link:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to find API-Sequence link',
        error
      );
    }
  }

  /**
   * 列出關聯
   */
  async findMany(
    filter: ApiSequenceLinkFilter = {},
    options: {
      page?: number;
      limit?: number;
      includeDetails?: boolean;
    } = {}
  ): Promise<{
    data: ApiSequenceLink[];
    meta: {
      total: number;
      page: number;
      totalPages: number;
    };
  }> {
    try {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 20));
      const skip = (page - 1) * limit;

      const where: Prisma.ApiSequenceLinkWhereInput = {};

      if (filter.apiId) {
        where.apiId = filter.apiId;
      }

      if (filter.sequenceId) {
        where.sequenceId = filter.sequenceId;
      }

      if (filter.projectId) {
        where.api = {
          projectId: filter.projectId,
        };
      }

      const include = options.includeDetails ? {
        api: true,
        sequence: {
          include: {
            useCase: {
              include: {
                module: true,
              },
            },
          },
        },
      } : {
        api: {
          select: {
            id: true,
            apiCode: true,
            title: true,
            method: true,
            endpoint: true,
          },
        },
        sequence: {
          select: {
            id: true,
            sdCode: true,
            title: true,
          },
        },
      };

      const [data, total] = await Promise.all([
        this.prisma.apiSequenceLink.findMany({
          where,
          skip,
          take: limit,
          include,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.apiSequenceLink.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error('Failed to list API-Sequence links:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to list API-Sequence links',
        error
      );
    }
  }

  /**
   * 更新關聯
   */
  async update(id: string, data: UpdateApiSequenceLinkDto): Promise<ApiSequenceLink> {
    try {
      const link = await this.prisma.apiSequenceLink.update({
        where: { id },
        data: {
          ...(data.stepRef !== undefined && { stepRef: data.stepRef }),
          ...(data.lineNumber !== undefined && { lineNumber: data.lineNumber }),
        },
        include: {
          api: true,
          sequence: {
            include: {
              useCase: true,
            },
          },
        },
      });

      logger.info(`Updated API-Sequence link: ${id}`);
      return link;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `API-Sequence link with ID ${id} not found`
        );
      }
      
      logger.error('Failed to update API-Sequence link:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to update API-Sequence link',
        error
      );
    }
  }

  /**
   * 刪除關聯
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.apiSequenceLink.delete({
        where: { id },
      });

      logger.info(`Deleted API-Sequence link: ${id}`);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `API-Sequence link with ID ${id} not found`
        );
      }
      
      logger.error('Failed to delete API-Sequence link:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to delete API-Sequence link',
        error
      );
    }
  }

  /**
   * 依 API 取得所有相關的 Sequences
   */
  async findSequencesByApi(apiId: string): Promise<any[]> {
    try {
      const links = await this.prisma.apiSequenceLink.findMany({
        where: { apiId },
        include: {
          sequence: {
            include: {
              useCase: {
                include: {
                  module: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return links.map(link => ({
        ...link.sequence,
        linkInfo: {
          id: link.id,
          stepRef: link.stepRef,
          lineNumber: link.lineNumber,
        },
      }));
    } catch (error: any) {
      logger.error('Failed to find sequences by API:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to find sequences by API',
        error
      );
    }
  }

  /**
   * 依 Sequence 取得所有相關的 APIs
   */
  async findApisBySequence(sequenceId: string): Promise<any[]> {
    try {
      const links = await this.prisma.apiSequenceLink.findMany({
        where: { sequenceId },
        include: {
          api: true,
        },
        orderBy: { lineNumber: 'asc' },
      });

      return links.map(link => ({
        ...link.api,
        linkInfo: {
          id: link.id,
          stepRef: link.stepRef,
          lineNumber: link.lineNumber,
        },
      }));
    } catch (error: any) {
      logger.error('Failed to find APIs by sequence:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to find APIs by sequence',
        error
      );
    }
  }

  /**
   * 自動偵測並建立關聯（從 Sequence 的 Mermaid 內容）
   */
  async autoDetectLinks(sequenceId: string): Promise<ApiSequenceLink[]> {
    try {
      const sequence = await this.prisma.sequenceDiagram.findUnique({
        where: { id: sequenceId },
      });

      if (!sequence) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `Sequence Diagram with ID ${sequenceId} not found`
        );
      }

      // 從 Mermaid 內容中解析 API 呼叫
      const apiCalls = this.parseApiCallsFromMermaid(sequence.mermaidSrc);
      
      // 查找匹配的 API Contracts
      const apis = await this.prisma.apiContract.findMany({
        where: {
          projectId: sequence.projectId,
        },
      });

      const links: ApiSequenceLink[] = [];
      
      for (const call of apiCalls) {
        const matchedApi = apis.find(api => 
          api.method === call.method && 
          this.matchEndpoint(api.endpoint, call.endpoint)
        );

        if (matchedApi) {
          try {
            const link = await this.create({
              apiId: matchedApi.id,
              sequenceId: sequence.id,
              stepRef: call.stepRef,
              lineNumber: call.lineNumber,
            });
            links.push(link);
          } catch (error: any) {
            // 忽略重複的關聯
            if (error.code !== ErrorCode.BIZ_DUPLICATE) {
              throw error;
            }
          }
        }
      }

      logger.info(`Auto-detected ${links.length} API-Sequence links`);
      return links;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to auto-detect links:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to auto-detect links',
        error
      );
    }
  }

  /**
   * 解析 Mermaid 內容中的 API 呼叫
   */
  private parseApiCallsFromMermaid(mermaidSrc: string): Array<{
    method: string;
    endpoint: string;
    stepRef: string;
    lineNumber: number;
  }> {
    const apiCalls: Array<{
      method: string;
      endpoint: string;
      stepRef: string;
      lineNumber: number;
    }> = [];

    const lines = mermaidSrc.split('\n');
    const apiPattern = /\b(GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-\{\}]+)/gi;

    lines.forEach((line, index) => {
      const matches = line.matchAll(apiPattern);
      for (const match of matches) {
        apiCalls.push({
          method: match[1].toUpperCase(),
          endpoint: match[2],
          stepRef: line.trim(),
          lineNumber: index + 1,
        });
      }
    });

    return apiCalls;
  }

  /**
   * 比對端點路徑
   */
  private matchEndpoint(apiEndpoint: string, callEndpoint: string): boolean {
    // 將路徑參數轉換為正則表達式
    const pattern = apiEndpoint
      .replace(/\{[^}]+\}/g, '[^/]+')  // {id} -> [^/]+
      .replace(/\//g, '\\/')            // / -> \/
      .replace(/\*/g, '.*');            // * -> .*
    
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(callEndpoint);
  }
}

export default ApiSequenceLinkService;
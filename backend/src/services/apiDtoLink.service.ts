/**
 * API-DTO 關聯管理服務
 */

import { PrismaClient, ApiDtoLink, Prisma } from '@prisma/client';
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

export interface CreateApiDtoLinkDto {
  apiId: string;
  dtoId: string;
  role: 'req' | 'res';
}

export interface UpdateApiDtoLinkDto {
  role?: 'req' | 'res';
}

export interface ApiDtoLinkFilter {
  apiId?: string;
  dtoId?: string;
  role?: 'req' | 'res';
  projectId?: string;
}

export class ApiDtoLinkService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 建立 API-DTO 關聯
   */
  async create(data: CreateApiDtoLinkDto): Promise<ApiDtoLink> {
    try {
      // 驗證 API 和 DTO 存在
      const [api, dto] = await Promise.all([
        this.prisma.apiContract.findUnique({
          where: { id: data.apiId },
        }),
        this.prisma.dtoSchema.findUnique({
          where: { id: data.dtoId },
        }),
      ]);

      if (!api) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `API Contract with ID ${data.apiId} not found`
        );
      }

      if (!dto) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `DTO Schema with ID ${data.dtoId} not found`
        );
      }

      // 驗證 API 和 DTO 屬於同一專案
      if (api.projectId !== dto.projectId) {
        throw new AppError(
          400,
          ErrorCode.BIZ_VALIDATION_ERROR,
          'API and DTO must belong to the same project'
        );
      }

      // 驗證 DTO kind 與 role 匹配
      if ((data.role === 'req' && dto.kind !== 'request') ||
          (data.role === 'res' && dto.kind !== 'response')) {
        throw new AppError(
          400,
          ErrorCode.BIZ_VALIDATION_ERROR,
          `DTO kind '${dto.kind}' does not match role '${data.role}'`
        );
      }

      // 建立關聯
      const link = await this.prisma.apiDtoLink.create({
        data: {
          apiId: data.apiId,
          dtoId: data.dtoId,
          role: data.role,
        },
        include: {
          api: true,
          dto: true,
        },
      });

      logger.info(`Created API-DTO link: API ${api.apiCode} <-> DTO ${dto.dtoCode} (${data.role})`);
      return link;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error.code === 'P2002') {
        throw new AppError(
          409,
          ErrorCode.BIZ_DUPLICATE,
          'This API-DTO link already exists'
        );
      }
      
      logger.error('Failed to create API-DTO link:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to create API-DTO link',
        error
      );
    }
  }

  /**
   * 批次建立關聯
   */
  async batchCreate(links: CreateApiDtoLinkDto[]): Promise<ApiDtoLink[]> {
    try {
      const results: ApiDtoLink[] = [];

      await this.prisma.$transaction(async (tx) => {
        for (const link of links) {
          // 驗證 API 和 DTO
          const [api, dto] = await Promise.all([
            tx.apiContract.findUnique({
              where: { id: link.apiId },
            }),
            tx.dtoSchema.findUnique({
              where: { id: link.dtoId },
            }),
          ]);

          if (!api || !dto) {
            throw new AppError(
              404,
              ErrorCode.BIZ_NOT_FOUND,
              'API or DTO not found'
            );
          }

          if (api.projectId !== dto.projectId) {
            throw new AppError(
              400,
              ErrorCode.BIZ_VALIDATION_ERROR,
              'API and DTO must belong to the same project'
            );
          }

          // 驗證 DTO kind 與 role 匹配
          if ((link.role === 'req' && dto.kind !== 'request') ||
              (link.role === 'res' && dto.kind !== 'response')) {
            throw new AppError(
              400,
              ErrorCode.BIZ_VALIDATION_ERROR,
              `DTO kind '${dto.kind}' does not match role '${link.role}'`
            );
          }

          // 檢查是否已存在
          const existing = await tx.apiDtoLink.findUnique({
            where: {
              apiId_dtoId_role: {
                apiId: link.apiId,
                dtoId: link.dtoId,
                role: link.role,
              },
            },
          });

          if (!existing) {
            const created = await tx.apiDtoLink.create({
              data: {
                apiId: link.apiId,
                dtoId: link.dtoId,
                role: link.role,
              },
              include: {
                api: true,
                dto: true,
              },
            });
            results.push(created);
          }
        }
      });

      logger.info(`Batch created ${results.length} API-DTO links`);
      return results;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to batch create API-DTO links:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to batch create API-DTO links',
        error
      );
    }
  }

  /**
   * 取得單一關聯
   */
  async findById(id: string): Promise<ApiDtoLink> {
    try {
      const link = await this.prisma.apiDtoLink.findUnique({
        where: { id },
        include: {
          api: true,
          dto: true,
        },
      });

      if (!link) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `API-DTO link with ID ${id} not found`
        );
      }

      return link;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to find API-DTO link:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to find API-DTO link',
        error
      );
    }
  }

  /**
   * 列出關聯
   */
  async findMany(
    filter: ApiDtoLinkFilter = {},
    options: {
      page?: number;
      limit?: number;
      includeDetails?: boolean;
    } = {}
  ): Promise<{
    data: ApiDtoLink[];
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

      const where: Prisma.ApiDtoLinkWhereInput = {};

      if (filter.apiId) {
        where.apiId = filter.apiId;
      }

      if (filter.dtoId) {
        where.dtoId = filter.dtoId;
      }

      if (filter.role) {
        where.role = filter.role;
      }

      if (filter.projectId) {
        where.api = {
          projectId: filter.projectId,
        };
      }

      const include = options.includeDetails ? {
        api: true,
        dto: true,
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
        dto: {
          select: {
            id: true,
            dtoCode: true,
            title: true,
            kind: true,
          },
        },
      };

      const [data, total] = await Promise.all([
        this.prisma.apiDtoLink.findMany({
          where,
          skip,
          take: limit,
          include,
          orderBy: [
            { role: 'asc' },
            { createdAt: 'desc' },
          ],
        }),
        this.prisma.apiDtoLink.count({ where }),
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
      logger.error('Failed to list API-DTO links:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to list API-DTO links',
        error
      );
    }
  }

  /**
   * 更新關聯
   */
  async update(id: string, data: UpdateApiDtoLinkDto): Promise<ApiDtoLink> {
    try {
      // 如果要更新 role，需要驗證 DTO kind 匹配
      if (data.role) {
        const existingLink = await this.prisma.apiDtoLink.findUnique({
          where: { id },
          include: { dto: true },
        });

        if (!existingLink) {
          throw new AppError(
            404,
            ErrorCode.BIZ_NOT_FOUND,
            `API-DTO link with ID ${id} not found`
          );
        }

        if ((data.role === 'req' && existingLink.dto.kind !== 'request') ||
            (data.role === 'res' && existingLink.dto.kind !== 'response')) {
          throw new AppError(
            400,
            ErrorCode.BIZ_VALIDATION_ERROR,
            `DTO kind '${existingLink.dto.kind}' does not match role '${data.role}'`
          );
        }
      }

      const link = await this.prisma.apiDtoLink.update({
        where: { id },
        data: {
          ...(data.role && { role: data.role }),
        },
        include: {
          api: true,
          dto: true,
        },
      });

      logger.info(`Updated API-DTO link: ${id}`);
      return link;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error.code === 'P2025') {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `API-DTO link with ID ${id} not found`
        );
      }
      
      logger.error('Failed to update API-DTO link:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to update API-DTO link',
        error
      );
    }
  }

  /**
   * 刪除關聯
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.apiDtoLink.delete({
        where: { id },
      });

      logger.info(`Deleted API-DTO link: ${id}`);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `API-DTO link with ID ${id} not found`
        );
      }
      
      logger.error('Failed to delete API-DTO link:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to delete API-DTO link',
        error
      );
    }
  }

  /**
   * 依 API 取得所有相關的 DTOs
   */
  async findDtosByApi(apiId: string): Promise<any> {
    try {
      const links = await this.prisma.apiDtoLink.findMany({
        where: { apiId },
        include: {
          dto: true,
        },
        orderBy: { role: 'asc' },
      });

      const result = {
        request: null as any,
        response: null as any,
        all: [] as any[],
      };

      links.forEach(link => {
        const dtoWithLink = {
          ...link.dto,
          linkInfo: {
            id: link.id,
            role: link.role,
          },
        };

        if (link.role === 'req') {
          result.request = dtoWithLink;
        } else if (link.role === 'res') {
          result.response = dtoWithLink;
        }
        
        result.all.push(dtoWithLink);
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to find DTOs by API:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to find DTOs by API',
        error
      );
    }
  }

  /**
   * 依 DTO 取得所有相關的 APIs
   */
  async findApisByDto(dtoId: string): Promise<any[]> {
    try {
      const links = await this.prisma.apiDtoLink.findMany({
        where: { dtoId },
        include: {
          api: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return links.map(link => ({
        ...link.api,
        linkInfo: {
          id: link.id,
          role: link.role,
        },
      }));
    } catch (error: any) {
      logger.error('Failed to find APIs by DTO:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to find APIs by DTO',
        error
      );
    }
  }

  /**
   * 自動產生並關聯 DTO（從 API 的 spec）
   */
  async autoGenerateDtos(apiId: string): Promise<{
    request?: ApiDtoLink;
    response?: ApiDtoLink;
  }> {
    try {
      const api = await this.prisma.apiContract.findUnique({
        where: { id: apiId },
      });

      if (!api) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `API Contract with ID ${apiId} not found`
        );
      }

      const result: {
        request?: ApiDtoLink;
        response?: ApiDtoLink;
      } = {};

      // 處理 Request DTO
      if (api.requestSpec && Object.keys(api.requestSpec).length > 0) {
        const requestDto = await this.prisma.dtoSchema.create({
          data: {
            projectId: api.projectId,
            dtoCode: `${api.apiCode}-REQ`,
            title: `${api.title} Request`,
            schemaJson: api.requestSpec,
            kind: 'request',
          },
        });

        result.request = await this.create({
          apiId: api.id,
          dtoId: requestDto.id,
          role: 'req',
        });
      }

      // 處理 Response DTO
      if (api.responseSpec && Object.keys(api.responseSpec).length > 0) {
        const responseDto = await this.prisma.dtoSchema.create({
          data: {
            projectId: api.projectId,
            dtoCode: `${api.apiCode}-RES`,
            title: `${api.title} Response`,
            schemaJson: api.responseSpec,
            kind: 'response',
          },
        });

        result.response = await this.create({
          apiId: api.id,
          dtoId: responseDto.id,
          role: 'res',
        });
      }

      logger.info(`Auto-generated DTOs for API ${api.apiCode}`);
      return result;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to auto-generate DTOs:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to auto-generate DTOs',
        error
      );
    }
  }

  /**
   * 取得關聯統計
   */
  async getStatistics(projectId?: string): Promise<any> {
    try {
      const where = projectId ? {
        api: { projectId },
      } : {};

      const [total, byRole, orphanApis, orphanDtos] = await Promise.all([
        // 總數
        this.prisma.apiDtoLink.count({ where }),
        
        // 依角色分組
        this.prisma.apiDtoLink.groupBy({
          by: ['role'],
          where,
          _count: true,
        }),
        
        // 沒有 DTO 的 APIs
        this.prisma.apiContract.findMany({
          where: {
            ...(projectId && { projectId }),
            apiDtoLinks: {
              none: {},
            },
          },
          select: {
            id: true,
            apiCode: true,
            title: true,
            method: true,
            endpoint: true,
          },
        }),
        
        // 沒有 API 的 DTOs
        this.prisma.dtoSchema.findMany({
          where: {
            ...(projectId && { projectId }),
            apiDtoLinks: {
              none: {},
            },
          },
          select: {
            id: true,
            dtoCode: true,
            title: true,
            kind: true,
          },
        }),
      ]);

      return {
        total,
        byRole: byRole.reduce((acc, item) => {
          acc[item.role] = item._count;
          return acc;
        }, {} as Record<string, number>),
        orphanApis: {
          count: orphanApis.length,
          items: orphanApis.slice(0, 10), // 只返回前10個
        },
        orphanDtos: {
          count: orphanDtos.length,
          items: orphanDtos.slice(0, 10), // 只返回前10個
        },
      };
    } catch (error: any) {
      logger.error('Failed to get API-DTO link statistics:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to get API-DTO link statistics',
        error
      );
    }
  }
}

export default ApiDtoLinkService;
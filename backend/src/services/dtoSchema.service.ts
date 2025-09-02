/**
 * DTO Schema 管理服務
 */

import { PrismaClient, DtoSchema, Prisma } from '@prisma/client';
import { AppError, ErrorCode } from '../types/errors';
import { CodeGeneratorService } from './codeGenerator.service';
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

export interface CreateDtoSchemaDto {
  projectId: string;
  title: string;
  schemaJson: any;
  kind: 'request' | 'response';
}

export interface UpdateDtoSchemaDto {
  title?: string;
  schemaJson?: any;
  kind?: 'request' | 'response';
}

export interface DtoSchemaFilter {
  projectId?: string;
  kind?: 'request' | 'response';
  title?: string;
}

export class DtoSchemaService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 建立 DTO Schema
   */
  async create(data: CreateDtoSchemaDto): Promise<DtoSchema> {
    try {
      // 驗證 JSON Schema 格式
      this.validateJsonSchema(data.schemaJson);

      // 生成 DTO 代碼
      const dtoCode = await CodeGeneratorService.generateDtoCode(
        data.projectId,
        data.title
      );

      const dtoSchema = await this.prisma.dtoSchema.create({
        data: {
          projectId: data.projectId,
          dtoCode,
          title: data.title,
          schemaJson: data.schemaJson,
          kind: data.kind,
        },
        include: {
          project: true,
          apiDtoLinks: {
            include: {
              api: true,
            },
          },
        },
      });

      logger.info(`Created DTO Schema: ${dtoCode}`);
      return dtoSchema;
    } catch (error: any) {
      logger.error('Failed to create DTO Schema:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error.code === 'P2002') {
        throw new AppError(
          409,
          ErrorCode.BIZ_DUPLICATE,
          'DTO Schema with this code already exists in the project'
        );
      }
      
      if (error.code === 'P2003') {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          'Project not found'
        );
      }
      
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to create DTO Schema',
        error
      );
    }
  }

  /**
   * 批次建立 DTO Schemas
   */
  async batchCreate(
    projectId: string,
    dtos: Omit<CreateDtoSchemaDto, 'projectId'>[]
  ): Promise<DtoSchema[]> {
    try {
      const results: DtoSchema[] = [];

      // 使用交易確保原子性
      await this.prisma.$transaction(async (tx) => {
        for (const dto of dtos) {
          // 驗證 JSON Schema
          this.validateJsonSchema(dto.schemaJson);

          // 生成 DTO 代碼
          const dtoCode = await CodeGeneratorService.generateDtoCode(
            projectId,
            dto.title
          );

          const created = await tx.dtoSchema.create({
            data: {
              projectId,
              dtoCode,
              title: dto.title,
              schemaJson: dto.schemaJson,
              kind: dto.kind,
            },
            include: {
              project: true,
              apiDtoLinks: true,
            },
          });

          results.push(created);
        }
      });

      logger.info(`Batch created ${results.length} DTO Schemas`);
      return results;
    } catch (error: any) {
      logger.error('Failed to batch create DTO Schemas:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to batch create DTO Schemas',
        error
      );
    }
  }

  /**
   * 取得單一 DTO Schema
   */
  async findById(id: string): Promise<DtoSchema> {
    try {
      const dtoSchema = await this.prisma.dtoSchema.findUnique({
        where: { id },
        include: {
          project: true,
          apiDtoLinks: {
            include: {
              api: true,
            },
          },
        },
      });

      if (!dtoSchema) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `DTO Schema with ID ${id} not found`
        );
      }

      return dtoSchema;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to find DTO Schema:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to find DTO Schema',
        error
      );
    }
  }

  /**
   * 依代碼取得 DTO Schema
   */
  async findByCode(projectId: string, dtoCode: string): Promise<DtoSchema> {
    try {
      const dtoSchema = await this.prisma.dtoSchema.findUnique({
        where: {
          projectId_dtoCode: {
            projectId,
            dtoCode,
          },
        },
        include: {
          project: true,
          apiDtoLinks: {
            include: {
              api: true,
            },
          },
        },
      });

      if (!dtoSchema) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `DTO Schema with code ${dtoCode} not found`
        );
      }

      return dtoSchema;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to find DTO Schema by code:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to find DTO Schema',
        error
      );
    }
  }

  /**
   * 列出 DTO Schemas
   */
  async findMany(
    filter: DtoSchemaFilter = {},
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    data: DtoSchema[];
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

      const where: Prisma.DtoSchemaWhereInput = {};

      if (filter.projectId) {
        where.projectId = filter.projectId;
      }

      if (filter.kind) {
        where.kind = filter.kind;
      }

      if (filter.title) {
        where.title = {
          contains: filter.title,
          mode: 'insensitive',
        };
      }

      const [data, total] = await Promise.all([
        this.prisma.dtoSchema.findMany({
          where,
          skip,
          take: limit,
          orderBy: this.buildOrderBy(options.sortBy, options.sortOrder),
          include: {
            project: true,
            _count: {
              select: {
                apiDtoLinks: true,
              },
            },
          },
        }),
        this.prisma.dtoSchema.count({ where }),
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
      logger.error('Failed to list DTO Schemas:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to list DTO Schemas',
        error
      );
    }
  }

  /**
   * 更新 DTO Schema
   */
  async update(id: string, data: UpdateDtoSchemaDto): Promise<DtoSchema> {
    try {
      // 如果有更新 schemaJson，驗證格式
      if (data.schemaJson) {
        this.validateJsonSchema(data.schemaJson);
      }

      const dtoSchema = await this.prisma.dtoSchema.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.schemaJson && { schemaJson: data.schemaJson }),
          ...(data.kind && { kind: data.kind }),
        },
        include: {
          project: true,
          apiDtoLinks: {
            include: {
              api: true,
            },
          },
        },
      });

      logger.info(`Updated DTO Schema: ${dtoSchema.dtoCode}`);
      return dtoSchema;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `DTO Schema with ID ${id} not found`
        );
      }
      
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to update DTO Schema:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to update DTO Schema',
        error
      );
    }
  }

  /**
   * 刪除 DTO Schema
   */
  async delete(id: string): Promise<void> {
    try {
      // 檢查是否有 API 關聯
      const dtoSchema = await this.prisma.dtoSchema.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              apiDtoLinks: true,
            },
          },
        },
      });

      if (!dtoSchema) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `DTO Schema with ID ${id} not found`
        );
      }

      if (dtoSchema._count.apiDtoLinks > 0) {
        throw new AppError(
          400,
          ErrorCode.BIZ_VALIDATION_ERROR,
          'Cannot delete DTO Schema that is linked to APIs'
        );
      }

      await this.prisma.dtoSchema.delete({
        where: { id },
      });

      logger.info(`Deleted DTO Schema: ${dtoSchema.dtoCode}`);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error.code === 'P2025') {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `DTO Schema with ID ${id} not found`
        );
      }
      
      logger.error('Failed to delete DTO Schema:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to delete DTO Schema',
        error
      );
    }
  }

  /**
   * 產生 TypeScript 介面
   */
  async generateTypeScript(id: string): Promise<string> {
    try {
      const dtoSchema = await this.findById(id);
      return this.jsonSchemaToTypeScript(
        dtoSchema.title,
        dtoSchema.schemaJson
      );
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to generate TypeScript:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to generate TypeScript',
        error
      );
    }
  }

  /**
   * 取得 DTO 統計資訊
   */
  async getStatistics(projectId: string): Promise<any> {
    try {
      const [total, byKind, recentDtos] = await Promise.all([
        // 總數
        this.prisma.dtoSchema.count({
          where: { projectId },
        }),
        
        // 依類型分組
        this.prisma.dtoSchema.groupBy({
          by: ['kind'],
          where: { projectId },
          _count: true,
        }),
        
        // 最近建立的 DTOs
        this.prisma.dtoSchema.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            dtoCode: true,
            title: true,
            kind: true,
            createdAt: true,
            _count: {
              select: {
                apiDtoLinks: true,
              },
            },
          },
        }),
      ]);

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          projectCode: true,
        },
      });

      return {
        project,
        total,
        byKind: byKind.reduce((acc, item) => {
          acc[item.kind] = item._count;
          return acc;
        }, {} as Record<string, number>),
        recentDtos,
      };
    } catch (error: any) {
      logger.error('Failed to get DTO statistics:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to get DTO statistics',
        error
      );
    }
  }

  /**
   * 驗證 JSON Schema 格式
   */
  private validateJsonSchema(schema: any): void {
    if (!schema || typeof schema !== 'object') {
      throw new AppError(
        400,
        ErrorCode.VAL_INVALID_INPUT,
        'Invalid JSON Schema: must be an object'
      );
    }

    // 基本的 JSON Schema 驗證
    if (!schema.type) {
      throw new AppError(
        400,
        ErrorCode.VAL_INVALID_INPUT,
        'Invalid JSON Schema: missing type field'
      );
    }

    // 檢查巢狀深度
    const maxDepth = parseInt(process.env.MAX_JSON_SCHEMA_DEPTH || '10');
    if (this.getSchemaDepth(schema) > maxDepth) {
      throw new AppError(
        400,
        ErrorCode.VAL_INVALID_INPUT,
        `JSON Schema exceeds maximum depth of ${maxDepth}`
      );
    }
  }

  /**
   * 計算 Schema 深度
   */
  private getSchemaDepth(obj: any, currentDepth: number = 0): number {
    if (currentDepth > 20) {
      return currentDepth; // 防止無限遞迴
    }

    let maxDepth = currentDepth;

    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const depth = this.getSchemaDepth(obj[key], currentDepth + 1);
          maxDepth = Math.max(maxDepth, depth);
        }
      }
    }

    return maxDepth;
  }

  /**
   * JSON Schema 轉 TypeScript
   */
  private jsonSchemaToTypeScript(name: string, schema: any): string {
    const interfaceName = this.toPascalCase(name);
    const properties = this.schemaToTypeScriptProperties(schema);
    
    return `export interface ${interfaceName} ${properties}`;
  }

  /**
   * 轉換 Schema 屬性為 TypeScript
   */
  private schemaToTypeScriptProperties(schema: any, indent: number = 0): string {
    const indentStr = '  '.repeat(indent);
    
    if (schema.type === 'object' && schema.properties) {
      const props = Object.entries(schema.properties)
        .map(([key, value]: [string, any]) => {
          const required = schema.required?.includes(key) ? '' : '?';
          const type = this.schemaTypeToTypeScript(value);
          return `${indentStr}  ${key}${required}: ${type};`;
        })
        .join('\n');
      
      return `{\n${props}\n${indentStr}}`;
    }
    
    if (schema.type === 'array' && schema.items) {
      return `${this.schemaTypeToTypeScript(schema.items)}[]`;
    }
    
    return this.schemaTypeToTypeScript(schema);
  }

  /**
   * 轉換 Schema 類型為 TypeScript 類型
   */
  private schemaTypeToTypeScript(schema: any): string {
    if (!schema.type) {
      return 'any';
    }

    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return schema.enum.map((v: string) => `'${v}'`).join(' | ');
        }
        return 'string';
      
      case 'number':
      case 'integer':
        return 'number';
      
      case 'boolean':
        return 'boolean';
      
      case 'null':
        return 'null';
      
      case 'array':
        if (schema.items) {
          return `${this.schemaTypeToTypeScript(schema.items)}[]`;
        }
        return 'any[]';
      
      case 'object':
        if (schema.properties) {
          return this.schemaToTypeScriptProperties(schema);
        }
        return 'Record<string, any>';
      
      default:
        return 'any';
    }
  }

  /**
   * 轉換為 PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^(.)/, (char) => char.toUpperCase());
  }

  /**
   * 建立排序條件
   */
  private buildOrderBy(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Prisma.DtoSchemaOrderByWithRelationInput {
    const order = sortOrder || 'desc';
    
    switch (sortBy) {
      case 'title':
        return { title: order };
      case 'kind':
        return { kind: order };
      case 'dtoCode':
        return { dtoCode: order };
      case 'createdAt':
      default:
        return { createdAt: order };
    }
  }
}

export default DtoSchemaService;
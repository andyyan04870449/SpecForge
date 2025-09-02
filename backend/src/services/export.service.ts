/**
 * 匯出服務 - 匯出專案資料
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

export interface ExportData {
  version: string;
  exportTime: Date;
  project: any;
  modules: any[];
  useCases: any[];
  sequences: any[];
  apis: any[];
  dtos: any[];
  apiSequenceLinks: any[];
  apiDtoLinks: any[];
  metadata: {
    totalRecords: number;
    exportedBy?: string;
    description?: string;
  };
}

export class ExportService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 匯出整個專案
   */
  async exportProject(
    projectId: string,
    options: {
      includeLinks?: boolean;
      includeTimestamps?: boolean;
      exportedBy?: string;
      description?: string;
    } = {}
  ): Promise<ExportData> {
    try {
      const {
        includeLinks = true,
        includeTimestamps = false,
        exportedBy,
        description,
      } = options;

      // 取得專案
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
      const [modules, useCases, sequences, apis, dtos, apiSequenceLinks, apiDtoLinks] = 
        await Promise.all([
          this.prisma.module.findMany({
            where: { projectId },
            orderBy: { order: 'asc' },
          }),
          this.prisma.useCase.findMany({
            where: { projectId },
          }),
          this.prisma.sequenceDiagram.findMany({
            where: { projectId },
          }),
          this.prisma.apiContract.findMany({
            where: { projectId },
          }),
          this.prisma.dtoSchema.findMany({
            where: { projectId },
          }),
          includeLinks ? this.prisma.apiSequenceLink.findMany({
            where: { api: { projectId } },
          }) : Promise.resolve([]),
          includeLinks ? this.prisma.apiDtoLink.findMany({
            where: { api: { projectId } },
          }) : Promise.resolve([]),
        ]);

      // 清理資料（移除不需要的欄位）
      const cleanedProject = this.cleanData(project, includeTimestamps);
      const cleanedModules = modules.map(m => this.cleanData(m, includeTimestamps));
      const cleanedUseCases = useCases.map(u => this.cleanData(u, includeTimestamps));
      const cleanedSequences = sequences.map(s => this.cleanData(s, includeTimestamps));
      const cleanedApis = apis.map(a => this.cleanData(a, includeTimestamps));
      const cleanedDtos = dtos.map(d => this.cleanData(d, includeTimestamps));
      const cleanedApiSequenceLinks = apiSequenceLinks.map(l => this.cleanData(l, includeTimestamps));
      const cleanedApiDtoLinks = apiDtoLinks.map(l => this.cleanData(l, includeTimestamps));

      const totalRecords = 1 + modules.length + useCases.length + 
                          sequences.length + apis.length + dtos.length + 
                          apiSequenceLinks.length + apiDtoLinks.length;

      const exportData: ExportData = {
        version: '1.0.0',
        exportTime: new Date(),
        project: cleanedProject,
        modules: cleanedModules,
        useCases: cleanedUseCases,
        sequences: cleanedSequences,
        apis: cleanedApis,
        dtos: cleanedDtos,
        apiSequenceLinks: cleanedApiSequenceLinks,
        apiDtoLinks: cleanedApiDtoLinks,
        metadata: {
          totalRecords,
          exportedBy,
          description,
        },
      };

      logger.info(`Exported project ${projectId}: ${totalRecords} records`);
      return exportData;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Export failed:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Export failed',
        error
      );
    }
  }

  /**
   * 匯出為 OpenAPI 規格
   */
  async exportOpenAPI(projectId: string): Promise<any> {
    try {
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

      const apis = await this.prisma.apiContract.findMany({
        where: { projectId },
        include: {
          apiDtoLinks: {
            include: {
              dto: true,
            },
          },
        },
      });

      // 建立 OpenAPI 規格
      const paths: Record<string, any> = {};
      const schemas: Record<string, any> = {};

      apis.forEach(api => {
        if (!paths[api.endpoint]) {
          paths[api.endpoint] = {};
        }

        const operation: any = {
          summary: api.title,
          description: api.description || '',
          operationId: api.apiCode,
          tags: [api.domain],
          parameters: [],
          responses: {},
        };

        // 處理路徑參數
        if (api.pathParams && Object.keys(api.pathParams).length > 0) {
          Object.entries(api.pathParams).forEach(([name, schema]) => {
            operation.parameters.push({
              name,
              in: 'path',
              required: true,
              schema,
            });
          });
        }

        // 處理查詢參數
        if (api.queryParams && Object.keys(api.queryParams).length > 0) {
          Object.entries(api.queryParams).forEach(([name, schema]) => {
            operation.parameters.push({
              name,
              in: 'query',
              schema,
            });
          });
        }

        // 處理請求體
        if (api.requestSpec && Object.keys(api.requestSpec).length > 0) {
          operation.requestBody = {
            required: true,
            content: {
              'application/json': {
                schema: api.requestSpec,
              },
            },
          };
        }

        // 處理回應
        if (api.statusCodes && Object.keys(api.statusCodes).length > 0) {
          Object.entries(api.statusCodes).forEach(([code, description]) => {
            operation.responses[code] = {
              description: description as string,
            };
            
            if (api.responseSpec && Object.keys(api.responseSpec).length > 0) {
              operation.responses[code].content = {
                'application/json': {
                  schema: api.responseSpec,
                },
              };
            }
          });
        } else {
          operation.responses['200'] = {
            description: 'Success',
          };
        }

        // 加入 DTO schemas
        api.apiDtoLinks.forEach(link => {
          const schemaName = link.dto.dtoCode;
          if (!schemas[schemaName]) {
            schemas[schemaName] = link.dto.schemaJson;
          }
        });

        paths[api.endpoint][api.method.toLowerCase()] = operation;
      });

      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: project.name,
          description: project.description || '',
          version: project.version || '1.0.0',
        },
        servers: [
          {
            url: 'http://localhost:3000/api/v1',
            description: 'Development server',
          },
        ],
        paths,
        components: {
          schemas,
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      };

      logger.info(`Exported OpenAPI spec for project ${projectId}`);
      return openApiSpec;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('OpenAPI export failed:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'OpenAPI export failed',
        error
      );
    }
  }

  /**
   * 匯出為 Markdown 文檔
   */
  async exportMarkdown(projectId: string): Promise<string> {
    try {
      const exportData = await this.exportProject(projectId, {
        includeLinks: true,
        includeTimestamps: false,
      });

      let markdown = `# ${exportData.project.name}\n\n`;
      markdown += `${exportData.project.description || 'No description'}\n\n`;
      markdown += `- **Project Code**: ${exportData.project.projectCode}\n`;
      markdown += `- **Status**: ${exportData.project.status}\n`;
      markdown += `- **Export Time**: ${exportData.exportTime.toISOString()}\n\n`;

      // 模組結構
      markdown += '## Modules\n\n';
      // const moduleMap = new Map(exportData.modules.map(m => [m.id, m]));
      const rootModules = exportData.modules.filter(m => !m.parentId);
      
      const renderModuleTree = (module: any, level: number = 0): string => {
        let result = `${'  '.repeat(level)}- **${module.modCode}** ${module.title}\n`;
        if (module.description) {
          result += `${'  '.repeat(level + 1)}*${module.description}*\n`;
        }
        
        const children = exportData.modules.filter(m => m.parentId === module.id);
        children.forEach(child => {
          result += renderModuleTree(child, level + 1);
        });
        
        return result;
      };

      rootModules.forEach(module => {
        markdown += renderModuleTree(module);
      });

      // 使用案例
      markdown += '\n## Use Cases\n\n';
      exportData.modules.forEach(module => {
        const useCases = exportData.useCases.filter(u => u.moduleId === module.id);
        if (useCases.length > 0) {
          markdown += `### ${module.title}\n\n`;
          useCases.forEach(useCase => {
            markdown += `- **${useCase.ucCode}** ${useCase.title}\n`;
            if (useCase.summary) {
              markdown += `  - ${useCase.summary}\n`;
            }
          });
          markdown += '\n';
        }
      });

      // API 清單
      markdown += '## APIs\n\n';
      const apisByDomain = exportData.apis.reduce((acc: any, api: any) => {
        if (!acc[api.domain]) acc[api.domain] = [];
        acc[api.domain].push(api);
        return acc;
      }, {});

      Object.entries(apisByDomain).forEach(([domain, apis]: [string, any]) => {
        markdown += `### ${domain}\n\n`;
        markdown += '| Method | Endpoint | Title | Code |\n';
        markdown += '|--------|----------|-------|------|\n';
        apis.forEach((api: any) => {
          markdown += `| ${api.method} | ${api.endpoint} | ${api.title} | ${api.apiCode} |\n`;
        });
        markdown += '\n';
      });

      // DTO 清單
      markdown += '## DTOs\n\n';
      markdown += '| Code | Title | Kind |\n';
      markdown += '|------|-------|------|\n';
      exportData.dtos.forEach(dto => {
        markdown += `| ${dto.dtoCode} | ${dto.title} | ${dto.kind} |\n`;
      });

      logger.info(`Exported Markdown for project ${projectId}`);
      return markdown;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Markdown export failed:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Markdown export failed',
        error
      );
    }
  }

  /**
   * 清理資料（移除系統欄位）
   */
  private cleanData(data: any, includeTimestamps: boolean): any {
    const cleaned = { ...data };
    
    // 移除 ID（保留作為參考）
    // delete cleaned.id;
    
    // 移除時間戳記
    if (!includeTimestamps) {
      delete cleaned.createdAt;
      delete cleaned.updatedAt;
    }
    
    return cleaned;
  }
}

export default ExportService;
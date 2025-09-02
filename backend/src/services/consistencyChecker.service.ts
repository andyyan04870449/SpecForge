/**
 * 一致性檢查服務
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

export interface ConsistencyIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  resource: {
    type: string;
    id: string;
    code?: string;
    title?: string;
  };
  message: string;
  details?: any;
  suggestion?: string;
}

export interface ConsistencyReport {
  id: string;
  projectId: string;
  projectName: string;
  checkTime: Date;
  issues: ConsistencyIssue[];
  statistics: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    checkedResources: number;
  };
  rules: string[];
}

export class ConsistencyCheckerService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 執行專案一致性檢查
   */
  async checkProject(projectId: string): Promise<ConsistencyReport> {
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

      const issues: ConsistencyIssue[] = [];
      const checkTime = new Date();

      // 執行各項檢查
      const checks = await Promise.all([
        this.checkOrphanedResources(projectId),
        this.checkSequenceParsing(projectId),
        this.checkApiSequenceConsistency(projectId),
        this.checkDtoUsage(projectId),
        this.checkModuleHierarchy(projectId),
        this.checkDuplicateNames(projectId),
        this.checkMissingLinks(projectId),
        this.checkApiSpecCompleteness(projectId),
      ]);

      checks.forEach(checkIssues => issues.push(...checkIssues));

      // 計算統計
      const statistics = {
        totalIssues: issues.length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        info: issues.filter(i => i.severity === 'info').length,
        checkedResources: await this.countResources(projectId),
      };

      const report: ConsistencyReport = {
        id: `report-${Date.now()}`,
        projectId,
        projectName: project.name,
        checkTime,
        issues,
        statistics,
        rules: [
          'orphaned-resources',
          'sequence-parsing',
          'api-sequence-consistency',
          'dto-usage',
          'module-hierarchy',
          'duplicate-names',
          'missing-links',
          'api-spec-completeness',
        ],
      };

      logger.info(`Consistency check completed for project ${projectId}: ${issues.length} issues found`);
      return report;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Consistency check failed:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Consistency check failed',
        error
      );
    }
  }

  /**
   * 檢查孤立資源
   */
  private async checkOrphanedResources(projectId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 檢查沒有用例的模組
    const modulesWithoutUseCases = await this.prisma.module.findMany({
      where: {
        projectId,
        useCases: {
          none: {},
        },
      },
    });

    modulesWithoutUseCases.forEach(module => {
      issues.push({
        type: 'orphaned-resource',
        severity: 'warning',
        resource: {
          type: 'module',
          id: module.id,
          code: module.modCode,
          title: module.title,
        },
        message: 'Module has no use cases',
        suggestion: 'Consider adding use cases or removing the module',
      });
    });

    // 檢查沒有序列圖的用例
    const useCasesWithoutSequences = await this.prisma.useCase.findMany({
      where: {
        projectId,
        sequenceDiagrams: {
          none: {},
        },
      },
    });

    useCasesWithoutSequences.forEach(useCase => {
      issues.push({
        type: 'orphaned-resource',
        severity: 'info',
        resource: {
          type: 'useCase',
          id: useCase.id,
          code: useCase.ucCode,
          title: useCase.title,
        },
        message: 'Use case has no sequence diagrams',
        suggestion: 'Add sequence diagrams to document the flow',
      });
    });

    // 檢查沒有被引用的 API
    const unusedApis = await this.prisma.apiContract.findMany({
      where: {
        projectId,
        apiSequenceLinks: {
          none: {},
        },
      },
    });

    unusedApis.forEach(api => {
      issues.push({
        type: 'orphaned-resource',
        severity: 'warning',
        resource: {
          type: 'api',
          id: api.id,
          code: api.apiCode,
          title: api.title,
        },
        message: 'API is not referenced in any sequence diagram',
        suggestion: 'Link the API to relevant sequence diagrams or remove if unused',
      });
    });

    // 檢查沒有被使用的 DTO
    const unusedDtos = await this.prisma.dtoSchema.findMany({
      where: {
        projectId,
        apiDtoLinks: {
          none: {},
        },
      },
    });

    unusedDtos.forEach(dto => {
      issues.push({
        type: 'orphaned-resource',
        severity: 'warning',
        resource: {
          type: 'dto',
          id: dto.id,
          code: dto.dtoCode,
          title: dto.title,
        },
        message: 'DTO is not used by any API',
        suggestion: 'Link the DTO to relevant APIs or remove if unused',
      });
    });

    return issues;
  }

  /**
   * 檢查序列圖解析狀態
   */
  private async checkSequenceParsing(projectId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    const sequencesWithErrors = await this.prisma.sequenceDiagram.findMany({
      where: {
        projectId,
        parseStatus: 'error',
      },
    });

    sequencesWithErrors.forEach(sequence => {
      issues.push({
        type: 'sequence-parsing',
        severity: 'error',
        resource: {
          type: 'sequence',
          id: sequence.id,
          code: sequence.sdCode,
          title: sequence.title,
        },
        message: 'Sequence diagram has parsing errors',
        details: {
          parseError: sequence.parseError,
        },
        suggestion: 'Fix the Mermaid syntax in the sequence diagram',
      });
    });

    return issues;
  }

  /**
   * 檢查 API 與序列圖的一致性
   */
  private async checkApiSequenceConsistency(projectId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 取得所有序列圖中提到的 API
    const sequences = await this.prisma.sequenceDiagram.findMany({
      where: { projectId },
      include: {
        apiSequenceLinks: {
          include: {
            api: true,
          },
        },
      },
    });

    for (const sequence of sequences) {
      // 從 Mermaid 中提取 API 呼叫
      const apiCallsInMermaid = this.extractApiCallsFromMermaid(sequence.mermaidSrc);
      
      // 檢查是否所有 API 呼叫都有對應的 API Contract
      for (const call of apiCallsInMermaid) {
        const hasLink = sequence.apiSequenceLinks.some(link => 
          link.api.method === call.method && 
          link.api.endpoint.includes(call.endpoint.replace(/{[^}]+}/g, ''))
        );

        if (!hasLink) {
          issues.push({
            type: 'api-sequence-consistency',
            severity: 'warning',
            resource: {
              type: 'sequence',
              id: sequence.id,
              code: sequence.sdCode,
              title: sequence.title,
            },
            message: `API call "${call.method} ${call.endpoint}" in sequence diagram has no corresponding API contract`,
            details: {
              method: call.method,
              endpoint: call.endpoint,
              lineNumber: call.lineNumber,
            },
            suggestion: 'Create an API contract for this endpoint or update the sequence diagram',
          });
        }
      }
    }

    return issues;
  }

  /**
   * 檢查 DTO 使用情況
   */
  private async checkDtoUsage(projectId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 檢查沒有 request DTO 的 POST/PUT API
    const apisNeedingRequestDto = await this.prisma.apiContract.findMany({
      where: {
        projectId,
        method: {
          in: ['POST', 'PUT', 'PATCH'],
        },
        apiDtoLinks: {
          none: {
            role: 'req',
          },
        },
      },
    });

    apisNeedingRequestDto.forEach(api => {
      issues.push({
        type: 'dto-usage',
        severity: 'info',
        resource: {
          type: 'api',
          id: api.id,
          code: api.apiCode,
          title: api.title,
        },
        message: `${api.method} API has no request DTO defined`,
        suggestion: 'Consider defining a request DTO for this API',
      });
    });

    // 檢查沒有 response DTO 的 API
    const apisWithoutResponseDto = await this.prisma.apiContract.findMany({
      where: {
        projectId,
        apiDtoLinks: {
          none: {
            role: 'res',
          },
        },
      },
    });

    apisWithoutResponseDto.forEach(api => {
      issues.push({
        type: 'dto-usage',
        severity: 'info',
        resource: {
          type: 'api',
          id: api.id,
          code: api.apiCode,
          title: api.title,
        },
        message: 'API has no response DTO defined',
        suggestion: 'Consider defining a response DTO for this API',
      });
    });

    return issues;
  }

  /**
   * 檢查模組階層
   */
  private async checkModuleHierarchy(projectId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    const modules = await this.prisma.module.findMany({
      where: { projectId },
    });

    // 檢查循環依賴
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (moduleId: string): boolean => {
      visited.add(moduleId);
      recursionStack.add(moduleId);

      const children = modules.filter(m => m.parentId === moduleId);
      
      for (const child of children) {
        if (!visited.has(child.id)) {
          if (hasCycle(child.id)) {
            return true;
          }
        } else if (recursionStack.has(child.id)) {
          return true;
        }
      }

      recursionStack.delete(moduleId);
      return false;
    };

    const rootModules = modules.filter(m => !m.parentId);
    
    for (const root of rootModules) {
      if (hasCycle(root.id)) {
        issues.push({
          type: 'module-hierarchy',
          severity: 'error',
          resource: {
            type: 'module',
            id: root.id,
            code: root.modCode,
            title: root.title,
          },
          message: 'Module hierarchy contains circular dependency',
          suggestion: 'Review and fix the parent-child relationships',
        });
      }
    }

    return issues;
  }

  /**
   * 檢查重複名稱
   */
  private async checkDuplicateNames(projectId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 檢查重複的 API endpoint
    const apis = await this.prisma.apiContract.findMany({
      where: { projectId },
    });

    const endpointMap = new Map<string, any[]>();
    
    apis.forEach(api => {
      const key = `${api.method} ${api.endpoint}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, []);
      }
      endpointMap.get(key)!.push(api);
    });

    endpointMap.forEach((apis, endpoint) => {
      if (apis.length > 1) {
        apis.forEach(api => {
          issues.push({
            type: 'duplicate-names',
            severity: 'error',
            resource: {
              type: 'api',
              id: api.id,
              code: api.apiCode,
              title: api.title,
            },
            message: `Duplicate API endpoint: ${endpoint}`,
            details: {
              duplicates: apis.map(a => ({ id: a.id, code: a.apiCode })),
            },
            suggestion: 'Each API endpoint should be unique within the project',
          });
        });
      }
    });

    return issues;
  }

  /**
   * 檢查缺失的關聯
   */
  private async checkMissingLinks(projectId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 檢查有 requestSpec 但沒有 request DTO 的 API
    const apisWithSpecButNoDto = await this.prisma.apiContract.findMany({
      where: {
        projectId,
        NOT: {
          requestSpec: {},
        },
        apiDtoLinks: {
          none: {
            role: 'req',
          },
        },
      },
    });

    apisWithSpecButNoDto.forEach(api => {
      if (api.requestSpec && Object.keys(api.requestSpec).length > 0) {
        issues.push({
          type: 'missing-links',
          severity: 'info',
          resource: {
            type: 'api',
            id: api.id,
            code: api.apiCode,
            title: api.title,
          },
          message: 'API has request specification but no linked request DTO',
          suggestion: 'Create and link a request DTO based on the specification',
        });
      }
    });

    return issues;
  }

  /**
   * 檢查 API 規格完整性
   */
  private async checkApiSpecCompleteness(projectId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    const apis = await this.prisma.apiContract.findMany({
      where: { projectId },
    });

    apis.forEach(api => {
      // 檢查是否有描述
      if (!api.description) {
        issues.push({
          type: 'api-spec-completeness',
          severity: 'info',
          resource: {
            type: 'api',
            id: api.id,
            code: api.apiCode,
            title: api.title,
          },
          message: 'API has no description',
          suggestion: 'Add a description to document the API purpose',
        });
      }

      // 檢查 POST/PUT API 是否有 request specification
      if (['POST', 'PUT', 'PATCH'].includes(api.method)) {
        if (!api.requestSpec || Object.keys(api.requestSpec).length === 0) {
          issues.push({
            type: 'api-spec-completeness',
            severity: 'warning',
            resource: {
              type: 'api',
              id: api.id,
              code: api.apiCode,
              title: api.title,
            },
            message: `${api.method} API has no request specification`,
            suggestion: 'Define the request body structure',
          });
        }
      }

      // 檢查是否有 response specification
      if (!api.responseSpec || Object.keys(api.responseSpec).length === 0) {
        issues.push({
          type: 'api-spec-completeness',
          severity: 'info',
          resource: {
            type: 'api',
            id: api.id,
            code: api.apiCode,
            title: api.title,
          },
          message: 'API has no response specification',
          suggestion: 'Define the response structure',
        });
      }
    });

    return issues;
  }

  /**
   * 從 Mermaid 中提取 API 呼叫
   */
  private extractApiCallsFromMermaid(mermaidSrc: string): Array<{
    method: string;
    endpoint: string;
    lineNumber: number;
  }> {
    const apiCalls: Array<{
      method: string;
      endpoint: string;
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
          lineNumber: index + 1,
        });
      }
    });

    return apiCalls;
  }

  /**
   * 計算資源總數
   */
  private async countResources(projectId: string): Promise<number> {
    const counts = await Promise.all([
      this.prisma.module.count({ where: { projectId } }),
      this.prisma.useCase.count({ where: { projectId } }),
      this.prisma.sequenceDiagram.count({ where: { projectId } }),
      this.prisma.apiContract.count({ where: { projectId } }),
      this.prisma.dtoSchema.count({ where: { projectId } }),
    ]);

    return counts.reduce((sum, count) => sum + count, 0);
  }

  /**
   * 取得檢查規則列表
   */
  getRules(): Array<{
    id: string;
    name: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }> {
    return [
      {
        id: 'orphaned-resources',
        name: 'Orphaned Resources',
        description: 'Check for resources without proper relationships',
        severity: 'warning',
      },
      {
        id: 'sequence-parsing',
        name: 'Sequence Diagram Parsing',
        description: 'Check for sequence diagrams with parsing errors',
        severity: 'error',
      },
      {
        id: 'api-sequence-consistency',
        name: 'API-Sequence Consistency',
        description: 'Verify API calls in sequences have corresponding contracts',
        severity: 'warning',
      },
      {
        id: 'dto-usage',
        name: 'DTO Usage',
        description: 'Check for proper DTO definitions and usage',
        severity: 'info',
      },
      {
        id: 'module-hierarchy',
        name: 'Module Hierarchy',
        description: 'Check for circular dependencies in module structure',
        severity: 'error',
      },
      {
        id: 'duplicate-names',
        name: 'Duplicate Names',
        description: 'Check for duplicate endpoints and names',
        severity: 'error',
      },
      {
        id: 'missing-links',
        name: 'Missing Links',
        description: 'Check for missing relationships between resources',
        severity: 'info',
      },
      {
        id: 'api-spec-completeness',
        name: 'API Specification Completeness',
        description: 'Check for complete API specifications',
        severity: 'info',
      },
    ];
  }
}

export default ConsistencyCheckerService;
/**
 * AI 生成服務（Mock 版本）
 * 
 * 這是一個模擬版本，使用預定義的模板和規則來生成內容，
 * 而不是真正調用 AI API。未來可以替換為真實的 AI 服務。
 */

import { PrismaClient } from '@prisma/client';
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

export interface GenerateSequenceRequest {
  projectId: string;
  useCaseId: string;
  title: string;
  description?: string;
  actors?: string[];
}

export interface GenerateApiRequest {
  projectId: string;
  sequenceId?: string;
  domain?: string;
  functionality?: string;
  method?: string;
  endpoints?: string[];
}

export interface GenerateDtoRequest {
  projectId: string;
  apiId?: string;
  purpose: string;
  fields?: Array<{
    name: string;
    type: string;
    required?: boolean;
  }>;
}

export interface AiDraft {
  id: string;
  type: 'sequence' | 'api' | 'dto' | 'complete';
  createdAt: Date;
  expiresAt: Date;
  content: any;
  metadata: {
    projectId: string;
    generatedBy: 'mock-ai';
    prompt?: string;
  };
}

export class AiGeneratorService {
  private drafts: Map<string, AiDraft> = new Map();
  
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 生成序列圖建議
   */
  async generateSequence(request: GenerateSequenceRequest): Promise<AiDraft> {
    try {
      const { projectId, useCaseId, title, description, actors = ['User', 'System'] } = request;

      // Mock: 基於標題和描述生成簡單的序列圖
      const mermaidSrc = this.generateMockSequenceDiagram(title, description, actors);

      const draft: AiDraft = {
        id: `draft-seq-${Date.now()}`,
        type: 'sequence',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 小時後過期
        content: {
          projectId,
          useCaseId,
          title: `${title} (AI Generated)`,
          mermaidSrc,
        },
        metadata: {
          projectId,
          generatedBy: 'mock-ai',
          prompt: description,
        },
      };

      this.drafts.set(draft.id, draft);
      
      logger.info(`Generated sequence draft: ${draft.id}`);
      return draft;
    } catch (error: any) {
      logger.error('Failed to generate sequence:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to generate sequence',
        error
      );
    }
  }

  /**
   * 生成 API 建議
   */
  async generateApi(request: GenerateApiRequest): Promise<AiDraft> {
    try {
      const { projectId, domain, functionality, method, endpoints } = request;

      let apiSpecs: any[] = [];

      if (functionality) {
        // 基於功能描述生成單個 API
        const apiSpec = this.generateMockApiSpec(domain || 'GENERAL', functionality, method);
        apiSpecs.push(apiSpec);
      } else if (endpoints && endpoints.length > 0) {
        // 基於端點列表生成多個 API
        apiSpecs = endpoints.map(endpoint => {
          const guessedDomain = this.guessDomain(endpoint);
          const guessedFunc = this.endpointToFunctionality(endpoint);
          const guessedMethod = method || this.guessHttpMethod(guessedFunc);
          
          return {
            method: guessedMethod,
            endpoint,
            title: guessedFunc,
            description: `${guessedMethod} operation for ${endpoint}`,
            domain: guessedDomain,
            requestSpec: this.generateRequestSpec(guessedMethod, guessedFunc),
            responseSpec: this.generateResponseSpec(guessedFunc),
            statusCodes: {
              200: 'Success',
              400: 'Bad Request',
              401: 'Unauthorized',
              404: 'Not Found',
              500: 'Internal Server Error',
            },
          };
        });
      } else {
        throw new AppError(
          400,
          'Either functionality or endpoints must be provided',
          ErrorCode.VAL_INVALID_INPUT
        );
      }

      const draft: AiDraft = {
        id: `draft-api-${Date.now()}`,
        type: 'api',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        content: apiSpecs.length === 1 ? apiSpecs[0] : apiSpecs,
        metadata: {
          projectId,
          generatedBy: 'mock-ai',
          prompt: functionality || endpoints?.join(', '),
        },
      };

      this.drafts.set(draft.id, draft);
      
      logger.info(`Generated API draft: ${draft.id}`);
      return draft;
    } catch (error: any) {
      logger.error('Failed to generate API:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to generate API',
        error
      );
    }
  }

  /**
   * 生成 DTO 建議
   */
  async generateDto(request: GenerateDtoRequest): Promise<AiDraft> {
    try {
      const { projectId, purpose, fields } = request;

      // Mock: 基於用途生成 DTO
      const dtoSchema = this.generateMockDtoSchema(purpose, fields);

      const draft: AiDraft = {
        id: `draft-dto-${Date.now()}`,
        type: 'dto',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        content: dtoSchema,
        metadata: {
          projectId,
          generatedBy: 'mock-ai',
          prompt: purpose,
        },
      };

      this.drafts.set(draft.id, draft);
      
      logger.info(`Generated DTO draft: ${draft.id}`);
      return draft;
    } catch (error: any) {
      logger.error('Failed to generate DTO:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to generate DTO',
        error
      );
    }
  }

  /**
   * 根據序列圖建議 API
   */
  async suggestApisFromSequence(sequenceId: string): Promise<AiDraft> {
    try {
      const sequence = await this.prisma.sequenceDiagram.findUnique({
        where: { id: sequenceId },
      });

      if (!sequence) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `Sequence diagram with ID ${sequenceId} not found`
        );
      }

      // Mock: 從序列圖中提取 API 呼叫
      const apis = this.extractApisFromMermaid(sequence.mermaidSrc);

      const draft: AiDraft = {
        id: `draft-apis-${Date.now()}`,
        type: 'api',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        content: {
          projectId: sequence.projectId,
          sequenceId,
          suggestedApis: apis,
        },
        metadata: {
          projectId: sequence.projectId,
          generatedBy: 'mock-ai',
          prompt: `Extract APIs from sequence ${sequence.sdCode}`,
        },
      };

      this.drafts.set(draft.id, draft);
      
      logger.info(`Suggested ${apis.length} APIs from sequence`);
      return draft;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to suggest APIs:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to suggest APIs',
        error
      );
    }
  }

  /**
   * 根據 API 建議 DTO
   */
  async suggestDtosFromApi(apiId: string): Promise<AiDraft> {
    try {
      const api = await this.prisma.apiContract.findUnique({
        where: { id: apiId },
      });

      if (!api) {
        throw new AppError(
          404,
          ErrorCode.BIZ_NOT_FOUND,
          `API with ID ${apiId} not found`
        );
      }

      // Mock: 基於 API 生成建議的 DTO
      const dtos = this.generateDtosForApi(api);

      const draft: AiDraft = {
        id: `draft-dtos-${Date.now()}`,
        type: 'dto',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        content: {
          projectId: api.projectId,
          apiId,
          suggestedDtos: dtos,
        },
        metadata: {
          projectId: api.projectId,
          generatedBy: 'mock-ai',
          prompt: `Generate DTOs for API ${api.apiCode}`,
        },
      };

      this.drafts.set(draft.id, draft);
      
      logger.info(`Suggested ${dtos.length} DTOs for API`);
      return draft;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to suggest DTOs:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to suggest DTOs',
        error
      );
    }
  }

  /**
   * 取得 AI 草稿
   */
  async getDraft(draftId: string): Promise<AiDraft> {
    const draft = this.drafts.get(draftId);
    
    if (!draft) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Draft with ID ${draftId} not found`
      );
    }

    // 檢查是否過期
    if (draft.expiresAt < new Date()) {
      this.drafts.delete(draftId);
      throw new AppError(
        410,
        ErrorCode.BIZ_EXPIRED,
        'Draft has expired'
      );
    }

    return draft;
  }

  /**
   * 採用 AI 草稿
   */
  async adoptDraft(draftId: string): Promise<any> {
    try {
      const draft = await this.getDraft(draftId);

      let result: any;

      switch (draft.type) {
        case 'sequence':
          result = await this.adoptSequenceDraft(draft);
          break;
        case 'api':
          result = await this.adoptApiDraft(draft);
          break;
        case 'dto':
          result = await this.adoptDtoDraft(draft);
          break;
        default:
          throw new AppError(
            400,
            ErrorCode.VAL_INVALID_INPUT,
            'Unknown draft type'
          );
      }

      // 刪除已採用的草稿
      this.drafts.delete(draftId);

      logger.info(`Adopted draft: ${draftId}`);
      return result;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to adopt draft:', error);
      throw new AppError(
        500,
        ErrorCode.SYS_INTERNAL_ERROR,
        'Failed to adopt draft',
        error
      );
    }
  }

  /**
   * 刪除 AI 草稿
   */
  deleteDraft(draftId: string): void {
    if (this.drafts.delete(draftId)) {
      logger.info(`Deleted draft: ${draftId}`);
    }
  }

  /**
   * 取得 AI 模板列表
   */
  getTemplates(): Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    example: any;
  }> {
    return [
      {
        id: 'user-auth-flow',
        name: 'User Authentication Flow',
        description: 'Complete user authentication sequence with login, logout, and session management',
        type: 'sequence',
        example: {
          title: 'User Authentication',
          actors: ['User', 'Frontend', 'AuthService', 'Database'],
        },
      },
      {
        id: 'crud-apis',
        name: 'CRUD API Set',
        description: 'Standard Create, Read, Update, Delete APIs for a resource',
        type: 'api',
        example: {
          resource: 'User',
          operations: ['create', 'read', 'update', 'delete', 'list'],
        },
      },
      {
        id: 'standard-dtos',
        name: 'Standard DTOs',
        description: 'Common request/response DTOs for typical operations',
        type: 'dto',
        example: {
          patterns: ['CreateRequest', 'UpdateRequest', 'Response', 'ListResponse'],
        },
      },
      {
        id: 'microservice-communication',
        name: 'Microservice Communication',
        description: 'Inter-service communication patterns',
        type: 'sequence',
        example: {
          services: ['Gateway', 'ServiceA', 'ServiceB', 'MessageQueue'],
        },
      },
      {
        id: 'payment-flow',
        name: 'Payment Processing Flow',
        description: 'Complete payment processing with validation and confirmation',
        type: 'complete',
        example: {
          steps: ['validate', 'authorize', 'capture', 'confirm'],
        },
      },
    ];
  }

  // === Mock 生成方法 ===

  /**
   * Mock: 生成序列圖
   */
  private generateMockSequenceDiagram(
    title: string,
    description?: string,
    actors: string[] = ['User', 'System']
  ): string {
    const templates = [
      // 簡單的請求-回應模式
      `sequenceDiagram
    participant ${actors[0]}
    participant ${actors[1] || 'System'}
    
    ${actors[0]}->>+${actors[1] || 'System'}: Request ${title}
    ${actors[1] || 'System'}-->>-${actors[0]}: Response`,
      
      // 包含驗證的流程
      `sequenceDiagram
    participant ${actors[0]}
    participant API
    participant Service
    participant Database
    
    ${actors[0]}->>API: Request ${title}
    API->>Service: Validate request
    Service->>Database: Query data
    Database-->>Service: Return data
    Service-->>API: Process result
    API-->>User: Return response`,
      
      // 包含錯誤處理的流程
      `sequenceDiagram
    participant ${actors[0]}
    participant System
    participant Database
    
    ${actors[0]}->>System: ${title}
    alt successful case
        System->>Database: Save data
        Database-->>System: Success
        System-->>User: Success response
    else error case
        System-->>User: Error response
    end`,
    ];

    // 隨機選擇一個模板
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template;
  }

  /**
   * Mock: 生成 API 規格
   */
  private generateMockApiSpec(
    domain: string,
    functionality: string,
    method?: string
  ): any {
    const endpoint = this.functionToEndpoint(functionality);
    const httpMethod = method || this.guessHttpMethod(functionality);

    return {
      method: httpMethod,
      endpoint,
      title: functionality,
      description: `${httpMethod} operation for ${functionality}`,
      domain: domain.toUpperCase(),
      requestSpec: this.generateRequestSpec(httpMethod, functionality),
      responseSpec: this.generateResponseSpec(functionality),
      statusCodes: {
        '200': 'Success',
        '400': 'Bad Request',
        '401': 'Unauthorized',
        '404': 'Not Found',
        '500': 'Internal Server Error',
      },
    };
  }

  private generateRequestSpec(method: string, functionality: string): any {
    if (method === 'GET' || method === 'DELETE') {
      return null;
    }
    
    return {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: `Request data for ${functionality}`,
        },
      },
      required: ['data'],
    };
  }

  private generateResponseSpec(functionality: string): any {
    return {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: `Response data for ${functionality}`,
        },
        message: { type: 'string' },
      },
      required: ['success'],
    };
  }

  /**
   * Mock: 生成 DTO Schema
   */
  private generateMockDtoSchema(
    purpose: string,
    fields?: Array<{ name: string; type: string; required?: boolean }>
  ): any {
    const baseSchema = {
      type: 'object',
      properties: {} as any,
      required: [] as string[],
    };

    if (fields && fields.length > 0) {
      fields.forEach(field => {
        baseSchema.properties[field.name] = {
          type: field.type || 'string',
        };
        if (field.required) {
          baseSchema.required.push(field.name);
        }
      });
    } else {
      // 根據用途生成常見欄位
      if (purpose.toLowerCase().includes('user')) {
        baseSchema.properties = {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        };
        baseSchema.required = ['email', 'name'];
      } else if (purpose.toLowerCase().includes('request')) {
        baseSchema.properties = {
          data: { type: 'object' },
          metadata: { type: 'object' },
        };
        baseSchema.required = ['data'];
      } else if (purpose.toLowerCase().includes('response')) {
        baseSchema.properties = {
          success: { type: 'boolean' },
          data: { type: 'object' },
          message: { type: 'string' },
        };
        baseSchema.required = ['success'];
      } else {
        // 通用結構
        baseSchema.properties = {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string' },
        };
        baseSchema.required = ['name'];
      }
    }

    return {
      title: this.purposeToTitle(purpose),
      kind: purpose.toLowerCase().includes('request') ? 'request' : 'response',
      schemaJson: baseSchema,
    };
  }

  /**
   * 從 Mermaid 提取 API
   */
  private extractApisFromMermaid(mermaidSrc: string): any[] {
    const apis: any[] = [];
    const apiPattern = /\b(GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-\{\}]+)/gi;
    const matches = mermaidSrc.matchAll(apiPattern);

    for (const match of matches) {
      apis.push({
        method: match[1].toUpperCase(),
        endpoint: match[2],
        title: `${match[1]} ${match[2]}`,
        domain: this.guessDomain(match[2]),
      });
    }

    return apis;
  }

  /**
   * 為 API 生成 DTO
   */
  private generateDtosForApi(api: any): any[] {
    const dtos: any[] = [];

    // 為 POST/PUT/PATCH 生成 request DTO
    if (['POST', 'PUT', 'PATCH'].includes(api.method)) {
      dtos.push({
        title: `${api.title} Request`,
        kind: 'request',
        schemaJson: {
          type: 'object',
          properties: {
            data: { type: 'object' },
          },
          required: ['data'],
        },
      });
    }

    // 所有 API 都生成 response DTO
    dtos.push({
      title: `${api.title} Response`,
      kind: 'response',
      schemaJson: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['success', 'data'],
      },
    });

    return dtos;
  }

  /**
   * 採用序列圖草稿
   */
  private async adoptSequenceDraft(draft: AiDraft): Promise<any> {
    const { projectId, useCaseId, title, mermaidSrc } = draft.content;
    
    const sdCode = await CodeGeneratorService.generateSequenceCode(projectId, useCaseId);
    
    return this.prisma.sequenceDiagram.create({
      data: {
        projectId,
        useCaseId,
        sdCode,
        title,
        mermaidSrc,
        parseStatus: 'pending',
      },
    });
  }

  /**
   * 採用 API 草稿
   */
  private async adoptApiDraft(draft: AiDraft): Promise<any> {
    const apiCode = await CodeGeneratorService.generateApiCode(
      draft.metadata.projectId,
      draft.content.domain
    );
    
    return this.prisma.apiContract.create({
      data: {
        ...draft.content,
        projectId: draft.metadata.projectId,
        apiCode,
      },
    });
  }

  /**
   * 採用 DTO 草稿
   */
  private async adoptDtoDraft(draft: AiDraft): Promise<any> {
    const dtoCode = await CodeGeneratorService.generateDtoCode(
      draft.metadata.projectId,
      draft.content.title
    );
    
    return this.prisma.dtoSchema.create({
      data: {
        ...draft.content,
        projectId: draft.metadata.projectId,
        dtoCode,
      },
    });
  }

  // === 輔助方法 ===

  private functionToEndpoint(functionality: string): string {
    return `/api/${functionality.toLowerCase().replace(/\s+/g, '-')}`;
  }

  private endpointToFunctionality(endpoint: string): string {
    // Extract the last segment of the endpoint and convert to title case
    const segments = endpoint.split('/').filter(s => s);
    const lastSegment = segments[segments.length - 1] || 'operation';
    
    return lastSegment
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private guessHttpMethod(functionality: string): string {
    const lower = functionality.toLowerCase();
    if (lower.includes('create') || lower.includes('add')) return 'POST';
    if (lower.includes('update') || lower.includes('edit')) return 'PUT';
    if (lower.includes('delete') || lower.includes('remove')) return 'DELETE';
    if (lower.includes('get') || lower.includes('fetch') || lower.includes('list')) return 'GET';
    return 'POST';
  }

  private guessDomain(endpoint: string): string {
    if (endpoint.includes('user')) return 'USER';
    if (endpoint.includes('auth')) return 'AUTH';
    if (endpoint.includes('order')) return 'ORDER';
    if (endpoint.includes('product')) return 'PRODUCT';
    return 'GEN';
  }

  private purposeToTitle(purpose: string): string {
    return purpose
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

export default AiGeneratorService;
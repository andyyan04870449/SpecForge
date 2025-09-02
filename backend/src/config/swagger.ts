/**
 * Swagger/OpenAPI 配置
 */

import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SpecForge API',
    version: '1.0.0',
    description: '系統分析設計平台 API 文檔',
    license: {
      name: 'MIT',
    },
    contact: {
      name: 'SpecForge Team',
      email: 'support@specforge.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}${config.api.prefix}`,
      description: 'Development server',
    },
    {
      url: `https://api.specforge.com${config.api.prefix}`,
      description: 'Production server',
    },
  ],
  components: {
    schemas: {
      // 通用回應格式
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
              request_id: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      // 資源模型
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectCode: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          version: { type: 'string' },
          status: { type: 'string', enum: ['active', 'archived', 'draft'] },
          ownerId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Module: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          parentId: { type: 'string', format: 'uuid', nullable: true },
          modCode: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          order: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UseCase: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          moduleId: { type: 'string', format: 'uuid' },
          ucCode: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      SequenceDiagram: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          useCaseId: { type: 'string', format: 'uuid' },
          sdCode: { type: 'string' },
          title: { type: 'string' },
          mermaidSrc: { type: 'string' },
          parseStatus: { type: 'string', enum: ['pending', 'success', 'error'] },
          parseError: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ApiContract: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          apiCode: { type: 'string' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
          endpoint: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          domain: { type: 'string' },
          requestSpec: { type: 'object' },
          responseSpec: { type: 'object' },
          headers: { type: 'object' },
          queryParams: { type: 'object' },
          pathParams: { type: 'object' },
          statusCodes: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DtoSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          dtoCode: { type: 'string' },
          title: { type: 'string' },
          kind: { type: 'string', enum: ['request', 'response', 'common'] },
          schemaJson: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    parameters: {
      projectId: {
        name: 'projectId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: '專案 ID',
      },
      moduleId: {
        name: 'moduleId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: '模組 ID',
      },
      useCaseId: {
        name: 'useCaseId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: '用例 ID',
      },
      sequenceId: {
        name: 'sequenceId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: '序列圖 ID',
      },
      apiId: {
        name: 'apiId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'API ID',
      },
      dtoId: {
        name: 'dtoId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'DTO ID',
      },
      page: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', default: 1 },
        description: '頁碼',
      },
      pageSize: {
        name: 'pageSize',
        in: 'query',
        schema: { type: 'integer', default: 20 },
        description: '每頁筆數',
      },
    },
    responses: {
      NotFound: {
        description: '資源不存在',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      BadRequest: {
        description: '請求參數錯誤',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Unauthorized: {
        description: '未授權',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      InternalError: {
        description: '伺服器內部錯誤',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Projects', description: '專案管理' },
    { name: 'Modules', description: '模組管理' },
    { name: 'UseCases', description: '用例管理' },
    { name: 'Sequences', description: '序列圖管理' },
    { name: 'APIs', description: 'API 合約管理' },
    { name: 'DTOs', description: 'DTO Schema 管理' },
    { name: 'Links', description: '關聯管理' },
    { name: 'Catalog', description: '目錄服務' },
    { name: 'Search', description: '搜尋服務' },
    { name: 'Consistency', description: '一致性檢查' },
    { name: 'AI', description: 'AI 生成服務' },
    { name: 'Export/Import', description: '匯入匯出' },
    { name: 'Statistics', description: '統計服務' },
    { name: 'Health', description: '健康檢查' },
  ],
};

const options: swaggerJSDoc.Options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './src/controllers/*.ts',
    './src/controllers/*.js',
    './src/docs/*.yaml',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
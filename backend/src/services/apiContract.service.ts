import { PrismaClient, ApiContract, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError, ErrorCode } from '../types/errors';
import { CodeGeneratorService } from './codeGenerator.service';

export interface CreateApiContractInput {
  projectId: string;
  domain: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  title: string;
  description?: string;
  requestSpec?: any;
  responseSpec?: any;
  headers?: any;
  queryParams?: any;
  pathParams?: any;
  statusCodes?: any;
}

export interface UpdateApiContractInput {
  domain?: string;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  title?: string;
  description?: string;
  requestSpec?: any;
  responseSpec?: any;
  headers?: any;
  queryParams?: any;
  pathParams?: any;
  statusCodes?: any;
}

export interface ApiContractListParams {
  projectId?: string;
  domain?: string;
  method?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'apiCode' | 'domain' | 'endpoint' | 'method' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ApiContractWithRelations extends ApiContract {
  project?: any;
  apiSequenceLinks?: any[];
  apiDtoLinks?: any[];
  _count?: {
    apiSequenceLinks: number;
    apiDtoLinks: number;
  };
}

export class ApiContractService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * 建立 API 合約
   */
  async create(data: CreateApiContractInput): Promise<ApiContract> {
    // 驗證專案是否存在
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Project with ID ${data.projectId} not found`
      );
    }

    // 檢查同一專案中是否已存在相同的 endpoint + method
    const existing = await this.prisma.apiContract.findFirst({
      where: {
        projectId: data.projectId,
        endpoint: data.endpoint,
        method: data.method,
      },
    });

    if (existing) {
      throw new AppError(
        409,
        ErrorCode.BIZ_DUPLICATE,
        `API ${data.method} ${data.endpoint} already exists in this project`
      );
    }

    // 生成 API 代碼
    const apiCode = await CodeGeneratorService.generateApiCode(
      data.projectId,
      data.domain
    );

    return this.prisma.apiContract.create({
      data: {
        projectId: data.projectId,
        apiCode,
        domain: data.domain,
        endpoint: data.endpoint,
        method: data.method,
        title: data.title,
        description: data.description,
        requestSpec: data.requestSpec || {},
        responseSpec: data.responseSpec || {},
        headers: data.headers || {},
        queryParams: data.queryParams || {},
        pathParams: data.pathParams || {},
        statusCodes: data.statusCodes || {
          '200': 'Success',
          '400': 'Bad Request',
          '401': 'Unauthorized',
          '404': 'Not Found',
          '500': 'Internal Server Error',
        },
      },
    });
  }

  /**
   * 查詢 API 合約列表
   */
  async findAll(params: ApiContractListParams = {}): Promise<{
    data: ApiContractWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      projectId,
      domain,
      method,
      search,
      page = 1,
      limit = 10,
      sortBy = 'apiCode',
      sortOrder = 'asc',
    } = params;

    const skip = (page - 1) * limit;
    
    const where: Prisma.ApiContractWhereInput = {};
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (domain) {
      where.domain = domain;
    }
    
    if (method) {
      where.method = method;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { endpoint: { contains: search, mode: 'insensitive' } },
        { apiCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.apiContract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          project: true,
          _count: {
            select: {
              apiSequenceLinks: true,
              apiDtoLinks: true,
            },
          },
        },
      }),
      this.prisma.apiContract.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 取得單一 API 合約詳情
   */
  async findById(id: string): Promise<ApiContractWithRelations> {
    const apiContract = await this.prisma.apiContract.findUnique({
      where: { id },
      include: {
        project: true,
        apiSequenceLinks: {
          include: {
            sequence: {
              include: {
                useCase: true,
              },
            },
          },
        },
        apiDtoLinks: {
          include: {
            dto: true,
          },
        },
        _count: {
          select: {
            apiSequenceLinks: true,
            apiDtoLinks: true,
          },
        },
      },
    });

    if (!apiContract) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `API Contract with ID ${id} not found`
      );
    }

    return apiContract;
  }

  /**
   * 更新 API 合約
   */
  async update(id: string, data: UpdateApiContractInput): Promise<ApiContract> {
    const existing = await this.prisma.apiContract.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `API Contract with ID ${id} not found`
      );
    }

    // 如果要更新 endpoint 或 method，檢查是否會造成重複
    if (data.endpoint || data.method) {
      const duplicate = await this.prisma.apiContract.findFirst({
        where: {
          projectId: existing.projectId,
          endpoint: data.endpoint || existing.endpoint,
          method: data.method || existing.method,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new AppError(
          409,
          ErrorCode.BIZ_DUPLICATE,
          `API ${data.method || existing.method} ${data.endpoint || existing.endpoint} already exists in this project`
        );
      }
    }

    return this.prisma.apiContract.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 刪除 API 合約
   */
  async delete(id: string): Promise<void> {
    const apiContract = await this.prisma.apiContract.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            apiSequenceLinks: true,
            apiDtoLinks: true,
          },
        },
      },
    });

    if (!apiContract) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `API Contract with ID ${id} not found`
      );
    }

    // 提示有關聯但不阻止刪除（CASCADE 會處理）
    if (apiContract._count.apiSequenceLinks > 0 || apiContract._count.apiDtoLinks > 0) {
      console.warn(
        `Deleting API Contract with ${apiContract._count.apiSequenceLinks} sequence links and ${apiContract._count.apiDtoLinks} DTO links`
      );
    }

    await this.prisma.apiContract.delete({
      where: { id },
    });
  }

  /**
   * 複製 API 合約
   */
  async duplicate(id: string, newEndpoint: string): Promise<ApiContract> {
    const source = await this.prisma.apiContract.findUnique({
      where: { id },
    });

    if (!source) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `API Contract with ID ${id} not found`
      );
    }

    // 生成新的 API 代碼
    const apiCode = await CodeGeneratorService.generateApiCode(
      source.projectId,
      source.domain
    );

    return this.prisma.apiContract.create({
      data: {
        projectId: source.projectId,
        apiCode,
        domain: source.domain,
        endpoint: newEndpoint,
        method: source.method,
        title: `${source.title} (Copy)`,
        description: source.description,
        requestSpec: source.requestSpec || {},
        responseSpec: source.responseSpec || {},
        headers: source.headers || {},
        queryParams: source.queryParams || {},
        pathParams: source.pathParams || {},
        statusCodes: source.statusCodes || {},
      },
    });
  }

  /**
   * 依領域分組統計
   */
  async getStatsByDomain(projectId: string): Promise<any> {
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
      orderBy: [
        { domain: 'asc' },
        { apiCode: 'asc' },
      ],
    });

    // 按領域分組
    const domainGroups = apis.reduce((acc, api) => {
      if (!acc[api.domain]) {
        acc[api.domain] = {
          domain: api.domain,
          apis: [],
          methodCounts: {},
          total: 0,
        };
      }
      
      acc[api.domain].apis.push({
        id: api.id,
        apiCode: api.apiCode,
        endpoint: api.endpoint,
        method: api.method,
        title: api.title,
      });
      
      acc[api.domain].methodCounts[api.method] = 
        (acc[api.domain].methodCounts[api.method] || 0) + 1;
      
      acc[api.domain].total++;
      
      return acc;
    }, {} as Record<string, any>);

    return {
      project: {
        id: project.id,
        name: project.name,
        projectCode: project.projectCode,
      },
      totalApis: apis.length,
      domains: Object.values(domainGroups),
    };
  }

  /**
   * 批量匯入 API 合約
   */
  async importBatch(
    projectId: string,
    apis: Array<Omit<CreateApiContractInput, 'projectId'>>
  ): Promise<ApiContract[]> {
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

    const created: ApiContract[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const api of apis) {
        // 檢查是否已存在
        const existing = await tx.apiContract.findFirst({
          where: {
            projectId,
            endpoint: api.endpoint,
            method: api.method,
          },
        });

        if (!existing) {
          const apiCode = await CodeGeneratorService.generateApiCode(
            projectId,
            api.domain
          );

          const newApi = await tx.apiContract.create({
            data: {
              projectId,
              apiCode,
              ...api,
              requestSpec: api.requestSpec || {},
              responseSpec: api.responseSpec || {},
              headers: api.headers || {},
              queryParams: api.queryParams || {},
              pathParams: api.pathParams || {},
              statusCodes: api.statusCodes || {
                '200': 'Success',
                '400': 'Bad Request',
                '401': 'Unauthorized',
                '404': 'Not Found',
                '500': 'Internal Server Error',
              },
            },
          });

          created.push(newApi);
        }
      }
    });

    return created;
  }

  /**
   * 生成 OpenAPI 規格
   */
  async generateOpenApiSpec(projectId: string): Promise<any> {
    const [project, apis] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: projectId } }),
      this.prisma.apiContract.findMany({
        where: { projectId },
        orderBy: [
          { domain: 'asc' },
          { endpoint: 'asc' },
        ],
      }),
    ]);

    if (!project) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Project with ID ${projectId} not found`
      );
    }

    // 建立 OpenAPI 3.0 規格
    const spec = {
      openapi: '3.0.0',
      info: {
        title: project.name,
        description: project.description,
        version: project.version || '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000/api/v1',
          description: 'Development server',
        },
      ],
      paths: {} as Record<string, any>,
      components: {
        schemas: {},
        responses: {},
        parameters: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    };

    // 將 API 轉換為 OpenAPI paths
    apis.forEach(api => {
      if (!spec.paths[api.endpoint]) {
        spec.paths[api.endpoint] = {};
      }

      const operation = {
        tags: [api.domain],
        summary: api.title,
        description: api.description,
        operationId: `${api.method.toLowerCase()}${api.apiCode}`,
        parameters: [] as any[],
        responses: {} as Record<string, any>,
      };

      // 加入路徑參數
      if (api.pathParams && Object.keys(api.pathParams).length > 0) {
        Object.entries(api.pathParams).forEach(([key, value]: [string, any]) => {
          operation.parameters.push({
            name: key,
            in: 'path',
            required: true,
            schema: value,
          });
        });
      }

      // 加入查詢參數
      if (api.queryParams && Object.keys(api.queryParams).length > 0) {
        Object.entries(api.queryParams).forEach(([key, value]: [string, any]) => {
          operation.parameters.push({
            name: key,
            in: 'query',
            schema: value,
          });
        });
      }

      // 加入請求體
      if (api.requestSpec && Object.keys(api.requestSpec).length > 0 && 
          ['POST', 'PUT', 'PATCH'].includes(api.method)) {
        (operation as any).requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: api.requestSpec,
            },
          },
        };
      }

      // 加入回應
      if (api.statusCodes) {
        Object.entries(api.statusCodes).forEach(([code, description]) => {
          operation.responses[code] = {
            description: description as string,
          };
          
          if (code === '200' && api.responseSpec) {
            operation.responses[code].content = {
              'application/json': {
                schema: api.responseSpec,
              },
            };
          }
        });
      }

      spec.paths[api.endpoint][api.method.toLowerCase()] = operation;
    });

    return spec;
  }
}

export default new ApiContractService();
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  version?: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: {
    UC: number;
    SD: number;
    API: number;
    DTO: number;
  };
  starred?: boolean;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  version?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  version?: string;
  status?: Project['status'];
}

export interface ProjectsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: Project['status'];
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectStatistics {
  UC: number;
  SD: number;
  API: number;
  DTO: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
  error?: {
    message: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ========== 專案分析相關類型定義 ==========

// UC (使用案例) 相關
export interface UCStep {
  id: string;
  order: number;
  action: string;
  description: string;
}

export interface UseCase {
  id: string;
  projectId: string;
  moduleId?: string;
  title: string;
  module: string;
  category: string;
  description: string;
  preconditions: string[];
  postconditions: string[];
  mainFlow: UCStep[];
  businessRules: string[];
  acceptanceCriteria: string[];
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

// SD (循序圖) 相關
export interface SequenceDiagram {
  id: string;
  projectId: string;
  moduleId?: string;
  title: string;
  content: string; // Mermaid 語法內容
  category: string;
  createdAt: string;
  updatedAt: string;
}

// API 合約相關
export interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  example?: any;
  schema?: string;
}

export interface APIResponse {
  statusCode: number;
  description: string;
  example?: any;
  schema?: string;
}

export interface APIContract {
  id: string;
  projectId: string;
  moduleId?: string;
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  description: string;
  summary?: string;
  tags?: string[];
  parameters?: {
    path?: APIParameter[];
    query?: APIParameter[];
    header?: APIParameter[];
    body?: APIParameter[];
  };
  responses: APIResponse[];
  requestExample?: string;
  responseExample?: string;
  createdAt: string;
  updatedAt: string;
}

// DTO 相關
export interface DTOProperty {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
    format?: string;
  };
  references?: string;
}

export interface DTOSchema {
  id: string;
  projectId: string;
  moduleId?: string;
  name: string;
  description: string;
  version?: string;
  category?: string;
  tags?: string[];
  properties: DTOProperty[];
  example?: any;
  relationships?: {
    extends?: string[];
    implements?: string[];
    uses?: string[];
  };
  validation?: {
    rules?: string[];
    schema?: string;
  };
  notes?: string[];
  createdAt: string;
  updatedAt: string;
}

// 專案目錄相關
export interface ProjectCatalog {
  modules: {
    id: string;
    name: string;
    description?: string;
    itemCount: {
      UC: number;
      SD: number;
      API: number;
      DTO: number;
    };
  }[];
  totalItems: {
    UC: number;
    SD: number;
    API: number;
    DTO: number;
  };
}

class ApiService {
  private axios = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 請求攔截器 - 添加 token
    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('authToken'); // 修正鍵值
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // 回應攔截器 - 處理錯誤
    this.axios.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        console.error('API 錯誤:', error);
        
        if (error.response?.status === 401) {
          // Token 過期或無效，清除本地存儲
          console.warn('Token 無效，清除認證資料');
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userData');
          
          // 發送自定義事件通知應用程式需要重新登入
          window.dispatchEvent(new CustomEvent('auth:logout', { 
            detail: { reason: 'token_expired' } 
          }));
        }
        
        return Promise.reject(error);
      }
    );
  }

  // 專案 API
  async getProjects(query: ProjectsQuery = {}): Promise<ApiResponse<Project[]>> {
    const response: AxiosResponse<ApiResponse<Project[]>> = await this.axios.get(
      '/projects', 
      { params: query }
    );
    return response.data;
  }

  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    const response: AxiosResponse<ApiResponse<Project>> = await this.axios.get(
      `/projects/${projectId}`
    );
    return response.data;
  }

  async createProject(data: CreateProjectRequest): Promise<ApiResponse<Project>> {
    const response: AxiosResponse<ApiResponse<Project>> = await this.axios.post(
      '/projects',
      data
    );
    return response.data;
  }

  async updateProject(projectId: string, data: UpdateProjectRequest): Promise<ApiResponse<Project>> {
    const response: AxiosResponse<ApiResponse<Project>> = await this.axios.put(
      `/projects/${projectId}`,
      data
    );
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}`);
  }

  async getProjectStatistics(projectId: string): Promise<ApiResponse<ProjectStatistics>> {
    const response: AxiosResponse<ApiResponse<ProjectStatistics>> = await this.axios.get(
      `/projects/${projectId}/statistics`
    );
    return response.data;
  }

  // 認證 API
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.axios.post(
      '/auth/login',
      data
    );
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    const response: AxiosResponse<ApiResponse<UserProfile>> = await this.axios.get(
      '/auth/profile'
    );
    return response.data;
  }

  async logout(): Promise<void> {
    await this.axios.post('/auth/logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  }

  // ========== 專案分析相關 API ==========
  
  // UC (使用案例) API
  async getUseCases(projectId: string): Promise<ApiResponse<UseCase[]>> {
    // 使用搜尋 API 來獲取專案的所有 UC
    const response: AxiosResponse<ApiResponse<UseCase[]>> = await this.axios.get(
      '/use-cases',
      { params: { projectId } }
    );
    return response.data;
  }

  async getUseCasesByModule(moduleId: string): Promise<ApiResponse<UseCase[]>> {
    const response: AxiosResponse<ApiResponse<UseCase[]>> = await this.axios.get(
      `/modules/${moduleId}/use-cases`
    );
    return response.data;
  }

  async getUseCase(ucId: string): Promise<ApiResponse<UseCase>> {
    const response: AxiosResponse<ApiResponse<UseCase>> = await this.axios.get(
      `/use-cases/${ucId}`
    );
    return response.data;
  }

  async createUseCase(moduleId: string, data: Partial<UseCase>): Promise<ApiResponse<UseCase>> {
    const response: AxiosResponse<ApiResponse<UseCase>> = await this.axios.post(
      `/modules/${moduleId}/use-cases`,
      data
    );
    return response.data;
  }

  async updateUseCase(ucId: string, data: Partial<UseCase>): Promise<ApiResponse<UseCase>> {
    const response: AxiosResponse<ApiResponse<UseCase>> = await this.axios.put(
      `/use-cases/${ucId}`,
      data
    );
    return response.data;
  }

  async deleteUseCase(ucId: string): Promise<void> {
    await this.axios.delete(`/use-cases/${ucId}`);
  }

  // SD (循序圖) API
  async getSequenceDiagrams(projectId: string): Promise<ApiResponse<SequenceDiagram[]>> {
    const response: AxiosResponse<ApiResponse<SequenceDiagram[]>> = await this.axios.get(
      '/sequences',
      { params: { projectId } }
    );
    return response.data;
  }

  async getSequenceDiagram(sdId: string): Promise<ApiResponse<SequenceDiagram>> {
    const response: AxiosResponse<ApiResponse<SequenceDiagram>> = await this.axios.get(
      `/sequences/${sdId}`
    );
    return response.data;
  }

  async createSequenceDiagram(data: Partial<SequenceDiagram>): Promise<ApiResponse<SequenceDiagram>> {
    const response: AxiosResponse<ApiResponse<SequenceDiagram>> = await this.axios.post(
      '/sequences',
      data
    );
    return response.data;
  }

  async updateSequenceDiagram(sdId: string, data: Partial<SequenceDiagram>): Promise<ApiResponse<SequenceDiagram>> {
    const response: AxiosResponse<ApiResponse<SequenceDiagram>> = await this.axios.put(
      `/sequences/${sdId}`,
      data
    );
    return response.data;
  }

  async deleteSequenceDiagram(sdId: string): Promise<void> {
    await this.axios.delete(`/sequences/${sdId}`);
  }

  // API 合約 API
  async getAPIContracts(projectId: string): Promise<ApiResponse<APIContract[]>> {
    const response: AxiosResponse<ApiResponse<APIContract[]>> = await this.axios.get(
      '/api-contracts',
      { params: { projectId } }
    );
    return response.data;
  }

  async getAPIContract(apiId: string): Promise<ApiResponse<APIContract>> {
    const response: AxiosResponse<ApiResponse<APIContract>> = await this.axios.get(
      `/api-contracts/${apiId}`
    );
    return response.data;
  }

  async createAPIContract(data: Partial<APIContract>): Promise<ApiResponse<APIContract>> {
    const response: AxiosResponse<ApiResponse<APIContract>> = await this.axios.post(
      '/api-contracts',
      data
    );
    return response.data;
  }

  async updateAPIContract(apiId: string, data: Partial<APIContract>): Promise<ApiResponse<APIContract>> {
    const response: AxiosResponse<ApiResponse<APIContract>> = await this.axios.put(
      `/api-contracts/${apiId}`,
      data
    );
    return response.data;
  }

  async deleteAPIContract(apiId: string): Promise<void> {
    await this.axios.delete(`/api-contracts/${apiId}`);
  }

  // DTO Schema API
  async getDTOSchemas(projectId: string): Promise<ApiResponse<DTOSchema[]>> {
    const response: AxiosResponse<ApiResponse<DTOSchema[]>> = await this.axios.get(
      '/dto-schemas',
      { params: { projectId } }
    );
    return response.data;
  }

  async getDTOSchema(dtoId: string): Promise<ApiResponse<DTOSchema>> {
    const response: AxiosResponse<ApiResponse<DTOSchema>> = await this.axios.get(
      `/dto-schemas/${dtoId}`
    );
    return response.data;
  }

  async createDTOSchema(data: Partial<DTOSchema>): Promise<ApiResponse<DTOSchema>> {
    const response: AxiosResponse<ApiResponse<DTOSchema>> = await this.axios.post(
      '/dto-schemas',
      data
    );
    return response.data;
  }

  async updateDTOSchema(dtoId: string, data: Partial<DTOSchema>): Promise<ApiResponse<DTOSchema>> {
    const response: AxiosResponse<ApiResponse<DTOSchema>> = await this.axios.put(
      `/dto-schemas/${dtoId}`,
      data
    );
    return response.data;
  }

  async deleteDTOSchema(dtoId: string): Promise<void> {
    await this.axios.delete(`/dto-schemas/${dtoId}`);
  }

  // 專案目錄 API
  async getProjectCatalog(projectId: string): Promise<ApiResponse<ProjectCatalog>> {
    const response: AxiosResponse<ApiResponse<ProjectCatalog>> = await this.axios.get(
      `/catalog/projects/${projectId}`
    );
    return response.data;
  }
}

export default new ApiService();
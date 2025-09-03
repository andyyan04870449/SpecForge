import { useState, useEffect, useCallback } from 'react';
import api, { 
  Project, 
  ProjectStatistics, 
  ProjectCatalog,
  Module,
  UseCase,
  SequenceDiagram,
  APIContract,
  DTOSchema
} from '@/services/api';
import cache, { cacheKeys, clearProjectCache } from '@/utils/cache';

// 載入狀態類型
export interface LoadingState {
  project: boolean;
  statistics: boolean;
  catalog: boolean;
  modules: boolean;
  useCases: boolean;
  sequences: boolean;
  apiContracts: boolean;
  dtoSchemas: boolean;
}

// 錯誤狀態類型
export interface ErrorState {
  project?: string;
  statistics?: string;
  catalog?: string;
  modules?: string;
  useCases?: string;
  sequences?: string;
  apiContracts?: string;
  dtoSchemas?: string;
}

// 分頁資訊類型
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// 分頁狀態類型
export interface PaginationState {
  useCases: PaginationInfo;
  sequences: PaginationInfo;
  apiContracts: PaginationInfo;
  dtoSchemas: PaginationInfo;
}

// 專案資料狀態類型
export interface ProjectData {
  project: Project | null;
  statistics: ProjectStatistics | null;
  catalog: ProjectCatalog | null;
  modules: Module[];
  useCases: UseCase[];
  sequences: SequenceDiagram[];
  apiContracts: APIContract[];
  dtoSchemas: DTOSchema[];
}

// Hook 返回類型
export interface UseProjectDataReturn {
  data: ProjectData;
  loading: LoadingState;
  error: ErrorState;
  pagination: PaginationState;
  refresh: {
    all: () => Promise<void>;
    project: () => Promise<void>;
    statistics: () => Promise<void>;
    catalog: () => Promise<void>;
    modules: () => Promise<void>;
    useCases: (page?: number) => Promise<void>;
    sequences: (page?: number) => Promise<void>;
    apiContracts: (page?: number) => Promise<void>;
    dtoSchemas: (page?: number) => Promise<void>;
  };
  loadMore: {
    useCases: () => Promise<void>;
    sequences: () => Promise<void>;
    apiContracts: () => Promise<void>;
    dtoSchemas: () => Promise<void>;
  };
  cache: {
    clear: () => void;
    forceRefreshAll: () => Promise<void>;
  };
}

/**
 * 用於載入和管理專案資料的 Hook
 * @param projectId 專案 ID
 * @param autoLoad 是否自動載入資料（預設為 true）
 */
export function useProjectData(projectId: string, autoLoad: boolean = true, enableCache: boolean = true): UseProjectDataReturn {
  // 資料狀態
  const [data, setData] = useState<ProjectData>({
    project: null,
    statistics: null,
    catalog: null,
    modules: [],
    useCases: [],
    sequences: [],
    apiContracts: [],
    dtoSchemas: []
  });

  // 載入狀態
  const [loading, setLoading] = useState<LoadingState>({
    project: false,
    statistics: false,
    catalog: false,
    modules: false,
    useCases: false,
    sequences: false,
    apiContracts: false,
    dtoSchemas: false
  });

  // 錯誤狀態
  const [error, setError] = useState<ErrorState>({});
  
  // 分頁狀態
  const [pagination, setPagination] = useState<PaginationState>({
    useCases: { page: 1, limit: 20, total: 0, totalPages: 0 },
    sequences: { page: 1, limit: 20, total: 0, totalPages: 0 },
    apiContracts: { page: 1, limit: 20, total: 0, totalPages: 0 },
    dtoSchemas: { page: 1, limit: 20, total: 0, totalPages: 0 }
  });

  // 載入專案基本資訊（使用快取）
  const loadProject = useCallback(async (forceRefresh: boolean = false) => {
    const cacheKey = cacheKeys.project(projectId);
    
    // 檢查快取
    if (!forceRefresh) {
      const cachedData = cache.get<Project>(cacheKey);
      if (cachedData) {
        setData(prev => ({ ...prev, project: cachedData }));
        return;
      }
    }
    
    setLoading(prev => ({ ...prev, project: true }));
    setError(prev => ({ ...prev, project: undefined }));
    
    try {
      const response = await api.getProject(projectId);
      setData(prev => ({ ...prev, project: response.data }));
      // 儲存到快取
      cache.set(cacheKey, response.data, 10 * 60 * 1000); // 10分鐘
    } catch (err: any) {
      console.error('載入專案失敗:', err);
      setError(prev => ({ 
        ...prev, 
        project: err.response?.data?.message || '載入專案失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, project: false }));
    }
  }, [projectId]);

  // 載入專案統計資料（使用快取）
  const loadStatistics = useCallback(async (forceRefresh: boolean = false) => {
    const cacheKey = cacheKeys.projectStats(projectId);
    
    // 檢查快取
    if (!forceRefresh) {
      const cachedData = cache.get<ProjectStatistics>(cacheKey);
      if (cachedData) {
        setData(prev => ({ ...prev, statistics: cachedData }));
        return;
      }
    }
    
    setLoading(prev => ({ ...prev, statistics: true }));
    setError(prev => ({ ...prev, statistics: undefined }));
    
    try {
      const response = await api.getProjectStatistics(projectId);
      setData(prev => ({ ...prev, statistics: response.data }));
      // 儲存到快取
      cache.set(cacheKey, response.data, 5 * 60 * 1000); // 5分鐘
    } catch (err: any) {
      console.error('載入統計資料失敗:', err);
      setError(prev => ({ 
        ...prev, 
        statistics: err.response?.data?.message || '載入統計資料失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, statistics: false }));
    }
  }, [projectId]);

  // 載入專案目錄
  const loadCatalog = useCallback(async () => {
    setLoading(prev => ({ ...prev, catalog: true }));
    setError(prev => ({ ...prev, catalog: undefined }));
    
    try {
      const response = await api.getProjectCatalog(projectId);
      setData(prev => ({ ...prev, catalog: response.data }));
    } catch (err: any) {
      console.error('載入專案目錄失敗:', err);
      setError(prev => ({ 
        ...prev, 
        catalog: err.response?.data?.message || '載入專案目錄失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, catalog: false }));
    }
  }, [projectId]);

  // 載入模組
  const loadModules = useCallback(async () => {
    setLoading(prev => ({ ...prev, modules: true }));
    setError(prev => ({ ...prev, modules: undefined }));
    
    try {
      const response = await api.getModules(projectId);
      setData(prev => ({ ...prev, modules: response.data }));
    } catch (err: any) {
      console.error('載入模組失敗:', err);
      setError(prev => ({ 
        ...prev, 
        modules: err.response?.data?.message || '載入模組失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, modules: false }));
    }
  }, [projectId]);

  // 載入使用案例（支援分頁和快取）
  const loadUseCases = useCallback(async (page: number = 1, append: boolean = false, forceRefresh: boolean = false) => {
    const cacheKey = cacheKeys.useCases(projectId, page);
    
    // 檢查快取
    if (!forceRefresh && !append) {
      const cachedData = cache.get<UseCase[]>(cacheKey);
      if (cachedData) {
        setData(prev => ({ ...prev, useCases: cachedData }));
        return;
      }
    }
    
    setLoading(prev => ({ ...prev, useCases: true }));
    setError(prev => ({ ...prev, useCases: undefined }));
    
    try {
      const response = await api.getUseCases(projectId, { 
        page, 
        limit: pagination.useCases.limit 
      });
      
      if (append) {
        setData(prev => ({ 
          ...prev, 
          useCases: [...prev.useCases, ...response.data] 
        }));
      } else {
        setData(prev => ({ ...prev, useCases: response.data }));
        // 儲存到快取
        cache.set(cacheKey, response.data, 5 * 60 * 1000);
      }
      
      // 更新分頁資訊
      if (response.meta) {
        setPagination(prev => ({
          ...prev,
          useCases: {
            page: response.meta!.page || page,
            limit: pagination.useCases.limit,
            total: response.meta!.total || 0,
            totalPages: response.meta!.totalPages || 0
          }
        }));
      }
    } catch (err: any) {
      console.error('載入使用案例失敗:', err);
      setError(prev => ({ 
        ...prev, 
        useCases: err.response?.data?.message || '載入使用案例失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, useCases: false }));
    }
  }, [projectId, pagination.useCases.limit]);

  // 載入循序圖（支援分頁）
  const loadSequences = useCallback(async (page: number = 1, append: boolean = false) => {
    setLoading(prev => ({ ...prev, sequences: true }));
    setError(prev => ({ ...prev, sequences: undefined }));
    
    try {
      const response = await api.getSequenceDiagrams(projectId, {
        page,
        limit: pagination.sequences.limit
      });
      
      if (append) {
        setData(prev => ({ 
          ...prev, 
          sequences: [...prev.sequences, ...response.data] 
        }));
      } else {
        setData(prev => ({ ...prev, sequences: response.data }));
      }
      
      // 更新分頁資訊
      if (response.meta) {
        setPagination(prev => ({
          ...prev,
          sequences: {
            page: response.meta!.page || page,
            limit: pagination.sequences.limit,
            total: response.meta!.total || 0,
            totalPages: response.meta!.totalPages || 0
          }
        }));
      }
    } catch (err: any) {
      console.error('載入循序圖失敗:', err);
      setError(prev => ({ 
        ...prev, 
        sequences: err.response?.data?.message || '載入循序圖失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, sequences: false }));
    }
  }, [projectId, pagination.sequences.limit]);

  // 載入 API 合約（支援分頁）
  const loadAPIContracts = useCallback(async (page: number = 1, append: boolean = false) => {
    setLoading(prev => ({ ...prev, apiContracts: true }));
    setError(prev => ({ ...prev, apiContracts: undefined }));
    
    try {
      const response = await api.getAPIContracts(projectId, {
        page,
        limit: pagination.apiContracts.limit
      });
      
      if (append) {
        setData(prev => ({ 
          ...prev, 
          apiContracts: [...prev.apiContracts, ...response.data] 
        }));
      } else {
        setData(prev => ({ ...prev, apiContracts: response.data }));
      }
      
      // 更新分頁資訊
      if (response.meta) {
        setPagination(prev => ({
          ...prev,
          apiContracts: {
            page: response.meta!.page || page,
            limit: pagination.apiContracts.limit,
            total: response.meta!.total || 0,
            totalPages: response.meta!.totalPages || 0
          }
        }));
      }
    } catch (err: any) {
      console.error('載入 API 合約失敗:', err);
      setError(prev => ({ 
        ...prev, 
        apiContracts: err.response?.data?.message || '載入 API 合約失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, apiContracts: false }));
    }
  }, [projectId, pagination.apiContracts.limit]);

  // 載入 DTO Schema（支援分頁）
  const loadDTOSchemas = useCallback(async (page: number = 1, append: boolean = false) => {
    setLoading(prev => ({ ...prev, dtoSchemas: true }));
    setError(prev => ({ ...prev, dtoSchemas: undefined }));
    
    try {
      const response = await api.getDTOSchemas(projectId, {
        page,
        limit: pagination.dtoSchemas.limit
      });
      
      if (append) {
        setData(prev => ({ 
          ...prev, 
          dtoSchemas: [...prev.dtoSchemas, ...response.data] 
        }));
      } else {
        setData(prev => ({ ...prev, dtoSchemas: response.data }));
      }
      
      // 更新分頁資訊
      if (response.meta) {
        setPagination(prev => ({
          ...prev,
          dtoSchemas: {
            page: response.meta!.page || page,
            limit: pagination.dtoSchemas.limit,
            total: response.meta!.total || 0,
            totalPages: response.meta!.totalPages || 0
          }
        }));
      }
    } catch (err: any) {
      console.error('載入 DTO Schema 失敗:', err);
      setError(prev => ({ 
        ...prev, 
        dtoSchemas: err.response?.data?.message || '載入 DTO Schema 失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, dtoSchemas: false }));
    }
  }, [projectId, pagination.dtoSchemas.limit]);

  // 載入所有資料
  const loadAll = useCallback(async () => {
    // 並行載入所有資料以提高效能
    await Promise.all([
      loadProject(),
      loadStatistics(),
      loadCatalog(),
      loadModules(),
      loadUseCases(),
      loadSequences(),
      loadAPIContracts(),
      loadDTOSchemas()
    ]);
  }, [
    loadProject,
    loadStatistics,
    loadCatalog,
    loadModules,
    loadUseCases,
    loadSequences,
    loadAPIContracts,
    loadDTOSchemas
  ]);

  // 載入更多資料（用於無限滾動）
  const loadMoreUseCases = useCallback(async () => {
    if (pagination.useCases.page < pagination.useCases.totalPages) {
      await loadUseCases(pagination.useCases.page + 1, true);
    }
  }, [loadUseCases, pagination.useCases]);
  
  const loadMoreSequences = useCallback(async () => {
    if (pagination.sequences.page < pagination.sequences.totalPages) {
      await loadSequences(pagination.sequences.page + 1, true);
    }
  }, [loadSequences, pagination.sequences]);
  
  const loadMoreAPIContracts = useCallback(async () => {
    if (pagination.apiContracts.page < pagination.apiContracts.totalPages) {
      await loadAPIContracts(pagination.apiContracts.page + 1, true);
    }
  }, [loadAPIContracts, pagination.apiContracts]);
  
  const loadMoreDTOSchemas = useCallback(async () => {
    if (pagination.dtoSchemas.page < pagination.dtoSchemas.totalPages) {
      await loadDTOSchemas(pagination.dtoSchemas.page + 1, true);
    }
  }, [loadDTOSchemas, pagination.dtoSchemas]);

  // 清除專案快取
  const clearCache = useCallback(() => {
    clearProjectCache(projectId);
  }, [projectId]);
  
  // 強制重新載入所有資料（無視快取）
  const forceRefreshAll = useCallback(async () => {
    clearCache();
    await loadAll();
  }, [clearCache, loadAll]);

  // 自動載入資料
  useEffect(() => {
    if (autoLoad && projectId) {
      loadAll();
    }
  }, [projectId, autoLoad]);
  
  // 當元件卸載時不需要清理快取（保留給其他元件使用）
  // 但可以提供手動清理的方法

  return {
    data,
    loading,
    error,
    pagination,
    refresh: {
      all: loadAll,
      project: loadProject,
      statistics: loadStatistics,
      catalog: loadCatalog,
      modules: loadModules,
      useCases: loadUseCases,
      sequences: loadSequences,
      apiContracts: loadAPIContracts,
      dtoSchemas: loadDTOSchemas
    },
    loadMore: {
      useCases: loadMoreUseCases,
      sequences: loadMoreSequences,
      apiContracts: loadMoreAPIContracts,
      dtoSchemas: loadMoreDTOSchemas
    },
    cache: {
      clear: clearCache,
      forceRefreshAll: forceRefreshAll
    }
  };
}

// 匯出便利函數，用於檢查是否有任何載入中的狀態
export function isAnyLoading(loading: LoadingState): boolean {
  return Object.values(loading).some(isLoading => isLoading);
}

// 匯出便利函數，用於檢查是否有任何錯誤
export function hasAnyError(error: ErrorState): boolean {
  return Object.values(error).some(err => err !== undefined);
}

// 匯出便利函數，用於獲取第一個錯誤訊息
export function getFirstError(error: ErrorState): string | undefined {
  return Object.values(error).find(err => err !== undefined);
}
import { useState, useEffect, useCallback } from 'react';
import api, { 
  Project, 
  ProjectStatistics, 
  ProjectCatalog,
  UseCase,
  SequenceDiagram,
  APIContract,
  DTOSchema
} from '@/services/api';

// 載入狀態類型
export interface LoadingState {
  project: boolean;
  statistics: boolean;
  catalog: boolean;
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
  useCases?: string;
  sequences?: string;
  apiContracts?: string;
  dtoSchemas?: string;
}

// 專案資料狀態類型
export interface ProjectData {
  project: Project | null;
  statistics: ProjectStatistics | null;
  catalog: ProjectCatalog | null;
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
  refresh: {
    all: () => Promise<void>;
    project: () => Promise<void>;
    statistics: () => Promise<void>;
    catalog: () => Promise<void>;
    useCases: () => Promise<void>;
    sequences: () => Promise<void>;
    apiContracts: () => Promise<void>;
    dtoSchemas: () => Promise<void>;
  };
}

/**
 * 用於載入和管理專案資料的 Hook
 * @param projectId 專案 ID
 * @param autoLoad 是否自動載入資料（預設為 true）
 */
export function useProjectData(projectId: string, autoLoad: boolean = true): UseProjectDataReturn {
  // 資料狀態
  const [data, setData] = useState<ProjectData>({
    project: null,
    statistics: null,
    catalog: null,
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
    useCases: false,
    sequences: false,
    apiContracts: false,
    dtoSchemas: false
  });

  // 錯誤狀態
  const [error, setError] = useState<ErrorState>({});

  // 載入專案基本資訊
  const loadProject = useCallback(async () => {
    setLoading(prev => ({ ...prev, project: true }));
    setError(prev => ({ ...prev, project: undefined }));
    
    try {
      const response = await api.getProject(projectId);
      setData(prev => ({ ...prev, project: response.data }));
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

  // 載入專案統計資料
  const loadStatistics = useCallback(async () => {
    setLoading(prev => ({ ...prev, statistics: true }));
    setError(prev => ({ ...prev, statistics: undefined }));
    
    try {
      const response = await api.getProjectStatistics(projectId);
      setData(prev => ({ ...prev, statistics: response.data }));
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

  // 載入使用案例
  const loadUseCases = useCallback(async () => {
    setLoading(prev => ({ ...prev, useCases: true }));
    setError(prev => ({ ...prev, useCases: undefined }));
    
    try {
      const response = await api.getUseCases(projectId);
      setData(prev => ({ ...prev, useCases: response.data }));
    } catch (err: any) {
      console.error('載入使用案例失敗:', err);
      setError(prev => ({ 
        ...prev, 
        useCases: err.response?.data?.message || '載入使用案例失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, useCases: false }));
    }
  }, [projectId]);

  // 載入循序圖
  const loadSequences = useCallback(async () => {
    setLoading(prev => ({ ...prev, sequences: true }));
    setError(prev => ({ ...prev, sequences: undefined }));
    
    try {
      const response = await api.getSequenceDiagrams(projectId);
      setData(prev => ({ ...prev, sequences: response.data }));
    } catch (err: any) {
      console.error('載入循序圖失敗:', err);
      setError(prev => ({ 
        ...prev, 
        sequences: err.response?.data?.message || '載入循序圖失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, sequences: false }));
    }
  }, [projectId]);

  // 載入 API 合約
  const loadAPIContracts = useCallback(async () => {
    setLoading(prev => ({ ...prev, apiContracts: true }));
    setError(prev => ({ ...prev, apiContracts: undefined }));
    
    try {
      const response = await api.getAPIContracts(projectId);
      setData(prev => ({ ...prev, apiContracts: response.data }));
    } catch (err: any) {
      console.error('載入 API 合約失敗:', err);
      setError(prev => ({ 
        ...prev, 
        apiContracts: err.response?.data?.message || '載入 API 合約失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, apiContracts: false }));
    }
  }, [projectId]);

  // 載入 DTO Schema
  const loadDTOSchemas = useCallback(async () => {
    setLoading(prev => ({ ...prev, dtoSchemas: true }));
    setError(prev => ({ ...prev, dtoSchemas: undefined }));
    
    try {
      const response = await api.getDTOSchemas(projectId);
      setData(prev => ({ ...prev, dtoSchemas: response.data }));
    } catch (err: any) {
      console.error('載入 DTO Schema 失敗:', err);
      setError(prev => ({ 
        ...prev, 
        dtoSchemas: err.response?.data?.message || '載入 DTO Schema 失敗' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, dtoSchemas: false }));
    }
  }, [projectId]);

  // 載入所有資料
  const loadAll = useCallback(async () => {
    // 並行載入所有資料以提高效能
    await Promise.all([
      loadProject(),
      loadStatistics(),
      loadCatalog(),
      loadUseCases(),
      loadSequences(),
      loadAPIContracts(),
      loadDTOSchemas()
    ]);
  }, [
    loadProject,
    loadStatistics,
    loadCatalog,
    loadUseCases,
    loadSequences,
    loadAPIContracts,
    loadDTOSchemas
  ]);

  // 自動載入資料
  useEffect(() => {
    if (autoLoad && projectId) {
      loadAll();
    }
  }, [projectId, autoLoad]);

  return {
    data,
    loading,
    error,
    refresh: {
      all: loadAll,
      project: loadProject,
      statistics: loadStatistics,
      catalog: loadCatalog,
      useCases: loadUseCases,
      sequences: loadSequences,
      apiContracts: loadAPIContracts,
      dtoSchemas: loadDTOSchemas
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
/**
 * AI 建議資料格式定義
 * 用於前後端溝通 AI 設計建議的標準格式
 */

/**
 * 節點類型定義
 */
export type NodeType = 'MODULE' | 'USE_CASE' | 'SEQUENCE' | 'API' | 'DTO';

/**
 * AI 建議操作類型
 */
export type SuggestionAction = 'create' | 'update' | 'delete' | 'connect';

/**
 * 基礎節點資料結構
 */
export interface BaseNodeData {
  id?: string;              // 節點 ID（更新/刪除時必須）
  type: NodeType;           // 節點類型
  title: string;            // 節點標題/名稱
  description?: string;     // 節點描述
  parentId?: string;        // 父節點 ID（用於建立層級關係）
  position?: {              // 節點在畫布上的位置
    x: number;
    y: number;
  };
}

/**
 * 模組節點資料
 */
export interface ModuleNodeData extends BaseNodeData {
  type: 'MODULE';
  moduleCode?: string;      // 模組代碼
}

/**
 * 使用案例節點資料
 */
export interface UseCaseNodeData extends BaseNodeData {
  type: 'USE_CASE';
  moduleId: string;         // 所屬模組 ID（必須）
  preconditions?: string[];
  postconditions?: string[];
  mainFlow?: {
    order: number;
    action: string;
    description: string;
  }[];
  businessRules?: string[];
  acceptanceCriteria?: string[];
}

/**
 * 循序圖節點資料
 */
export interface SequenceDiagramNodeData extends BaseNodeData {
  type: 'SEQUENCE';
  useCaseId?: string;       // 關聯的使用案例 ID
  mermaidSrc: string;       // Mermaid 語法內容（必須）
  category?: string;
}

/**
 * API 節點資料
 */
export interface APINodeData extends BaseNodeData {
  type: 'API';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  domain: string;           // API 網域（如 'api', 'admin'）
  endpoint: string;         // API 端點路徑
  sequenceIds?: string[];   // 關聯的循序圖 IDs
  requestSpec?: any;        // 請求規格
  responseSpec?: any;       // 回應規格
  headers?: Record<string, string>;
  queryParams?: Record<string, any>;
  pathParams?: Record<string, any>;
  statusCodes?: Record<string, string>;
}

/**
 * DTO Schema 節點資料
 */
export interface DTONodeData extends BaseNodeData {
  type: 'DTO';
  kind: 'request' | 'response' | 'common';  // DTO 類型
  schemaJson: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    description?: string;
  };
  apiIds?: string[];        // 關聯的 API IDs
  version?: string;
  tags?: string[];
}

/**
 * 節點資料聯合類型
 */
export type NodeData = 
  | ModuleNodeData 
  | UseCaseNodeData 
  | SequenceDiagramNodeData 
  | APINodeData 
  | DTONodeData;

/**
 * AI 建議項目
 */
export interface AISuggestion {
  id: string;               // 建議的唯一識別碼
  action: SuggestionAction; // 操作類型
  nodeId?: string;          // 目標節點 ID（更新/刪除時使用）
  data?: NodeData;          // 節點資料（創建/更新時使用）
  reason?: string;          // 建議原因說明
  confidence?: number;      // 建議信心度 (0-1)
  
  // 連線相關（action 為 'connect' 時使用）
  connection?: {
    sourceId: string;       // 來源節點 ID
    targetId: string;       // 目標節點 ID
    relationType?: 'parent-child' | 'api-sequence' | 'api-dto' | 'sequence-dto';
    description?: string;
  };
}

/**
 * AI 建議回應格式
 */
export interface AIDesignSuggestionResponse {
  success: boolean;
  projectId: string;        // 專案 ID
  suggestions: AISuggestion[];  // 建議列表
  summary?: string;         // 建議摘要說明
  metadata?: {
    totalNodes: number;     // 總節點數
    totalConnections: number; // 總連線數
    estimatedImpact: 'low' | 'medium' | 'high'; // 預估影響程度
  };
}

/**
 * AI 建議請求格式
 */
export interface AIDesignSuggestionRequest {
  projectId: string;        // 專案 ID
  context: string;          // 使用者描述或需求
  currentState?: {          // 當前圖譜狀態（可選）
    nodes: Array<{
      id: string;
      type: NodeType;
      data: any;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  };
  preferences?: {           // 使用者偏好設定
    maxSuggestions?: number; // 最大建議數量
    focusAreas?: NodeType[]; // 關注的節點類型
    autoConnect?: boolean;   // 是否自動建議連線
  };
}

/**
 * 範例資料生成函數
 */
export const generateExampleSuggestions = (): AISuggestion[] => {
  return [
    // 1. 創建新模組
    {
      id: 'sug_1',
      action: 'create',
      data: {
        type: 'MODULE',
        title: '用戶管理模組',
        description: '處理用戶註冊、登入、權限管理等功能',
        position: { x: 100, y: 100 }
      } as ModuleNodeData,
      reason: '基於您的需求，建議新增用戶管理模組',
      confidence: 0.95
    },
    
    // 2. 更新現有 API
    {
      id: 'sug_2',
      action: 'update',
      nodeId: 'api_123',
      data: {
        type: 'API',
        title: '用戶登入 API',
        description: '驗證用戶身份並返回 JWT token',
        method: 'POST',
        domain: 'api',
        endpoint: '/auth/login',
        requestSpec: {
          email: 'string',
          password: 'string'
        },
        responseSpec: {
          token: 'string',
          user: 'object'
        }
      } as APINodeData,
      reason: '優化 API 規格，加入認證 token 回應',
      confidence: 0.88
    },
    
    // 3. 刪除冗餘節點
    {
      id: 'sug_3',
      action: 'delete',
      nodeId: 'dto_456',
      reason: '此 DTO 已經沒有任何 API 使用，建議刪除',
      confidence: 0.92
    },
    
    // 4. 建立連線關係
    {
      id: 'sug_4',
      action: 'connect',
      connection: {
        sourceId: 'sd_789',
        targetId: 'api_123',
        relationType: 'api-sequence',
        description: '將登入 API 關聯到用戶認證循序圖'
      },
      reason: '發現 API 與循序圖有相關性，建議建立連線',
      confidence: 0.85
    }
  ];
};

/**
 * 驗證函數：檢查建議格式是否正確
 */
export const validateSuggestion = (suggestion: any): suggestion is AISuggestion => {
  // 基本欄位檢查
  if (!suggestion.id || !suggestion.action) {
    return false;
  }
  
  // 根據 action 類型檢查必要欄位
  switch (suggestion.action) {
    case 'create':
      return !!suggestion.data && !!suggestion.data.type && !!suggestion.data.title;
    
    case 'update':
      return !!suggestion.nodeId && !!suggestion.data;
    
    case 'delete':
      return !!suggestion.nodeId;
    
    case 'connect':
      return !!suggestion.connection && 
             !!suggestion.connection.sourceId && 
             !!suggestion.connection.targetId;
    
    default:
      return false;
  }
};

/**
 * 格式轉換：將後端資料轉換為前端格式
 */
export const transformBackendSuggestion = (backendData: any): AISuggestion | null => {
  try {
    // 這裡可以根據後端實際格式進行轉換
    const suggestion: AISuggestion = {
      id: backendData.id || `sug_${Date.now()}`,
      action: backendData.action,
      nodeId: backendData.nodeId,
      data: backendData.data,
      reason: backendData.reason,
      confidence: backendData.confidence || 0.5,
      connection: backendData.connection
    };
    
    return validateSuggestion(suggestion) ? suggestion : null;
  } catch (error) {
    console.error('Failed to transform backend suggestion:', error);
    return null;
  }
};
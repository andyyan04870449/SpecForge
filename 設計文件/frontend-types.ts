/**
 * 前端 AI 建議相關的 TypeScript 類型定義
 * 版本：v1.0
 * 最後更新：2024-09-03
 */

// ============= 基礎類型 =============

export type NodeType = 'MODULE' | 'USE_CASE' | 'SEQUENCE' | 'API' | 'DTO';
export type ActionType = 'create' | 'update' | 'delete' | 'connect';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'applied' | 'failed';

// ============= 視窗與畫布資訊 =============

export interface ViewportInfo {
  x: number;        // 視窗左上角 x 座標
  y: number;        // 視窗左上角 y 座標
  zoom: number;     // 縮放比例 (0.1 ~ 2.0)
  width: number;    // 視窗寬度
  height: number;   // 視窗高度
}

export interface CanvasState {
  viewport: ViewportInfo;
  nodes?: Array<{
    id: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    type: NodeType;
  }>;
}

// ============= 主要建議結構 =============

export interface FrontendSuggestion {
  // 識別資訊
  id: string;                          // 建議唯一ID，格式：sug_<timestamp>_<random>
  tempNodeId?: string;                 // 臨時節點ID，格式：temp_<type>_<timestamp>_<index>
  groupId?: string;                    // 群組ID，相關建議會有相同的groupId
  
  // 動作資訊
  action: ActionType;
  targetNodeId?: string;               // update/delete 時的目標節點ID
  
  // 視覺化資訊（後端計算提供）
  visual: {
    position: {
      x: number;                      // 計算好的 x 座標
      y: number;                      // 計算好的 y 座標
      calculated: boolean;            // 是否已計算（永遠為 true）
    };
    style?: {
      borderColor?: string;           // 邊框顏色（預設根據類型）
      backgroundColor?: string;       // 背景顏色
      opacity?: number;              // 透明度（預設 0.6）
      animation?: 'pulse' | 'glow' | 'bounce';  // 動畫效果
    };
    preview: {
      show: boolean;                  // 是否顯示預覽
      dimOthers: boolean;            // 是否淡化其他節點
    };
  };
  
  // 資料內容
  data: {
    type: NodeType;
    code?: string;                    // 預分配的代碼（MOD-xxx, UC-xxx 等）
    title: string;
    description?: string;
    
    // 根據不同類型的詳細資料
    details: ModuleDetails | UseCaseDetails | SequenceDetails | ApiDetails | DtoDetails;
  };
  
  // 關聯資訊
  relations: {
    parentId?: string;                // 父節點ID（可能是現有節點或其他建議的tempNodeId）
    childrenIds?: string[];           // 子節點IDs
    dependencies: string[];           // 必須先應用的建議IDs
    blockedBy: string[];             // 會阻塞此建議的IDs
    conflicts?: string[];            // 衝突的建議IDs
  };
  
  // 元資料
  metadata: {
    reason: string;                   // 建議理由（中文）
    impact: string;                   // 影響說明
    confidence: number;               // 信心度 (0-1)
    priority: PriorityLevel;
    canReject: boolean;              // 是否可拒絕（critical 通常不可）
    estimatedEffort?: 'low' | 'medium' | 'high';  // 預估工作量
    tags?: string[];                 // 標籤（如 'authentication', 'database'）
  };
  
  // 狀態追蹤
  status?: SuggestionStatus;
  appliedAt?: string;               // ISO 8601 時間戳
  appliedResourceId?: string;       // 應用後的實際資源ID
}

// ============= 詳細資料類型 =============

export interface ModuleDetails {
  parentModuleId?: string;
  estimatedUseCases?: number;
}

export interface UseCaseDetails {
  moduleId: string;
  actors?: string[];
  preconditions?: string[];
  postconditions?: string[];
}

export interface SequenceDetails {
  useCaseId: string;
  mermaidSrc?: string;
  participants?: string[];
}

export interface ApiDetails {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  domain: string;
  requestSchema?: any;
  responseSchema?: any;
}

export interface DtoDetails {
  kind: 'request' | 'response';
  schemaJson: any;
  linkedApiIds?: string[];
}

// ============= API 請求/回應 =============

// 生成建議請求
export interface GenerateDesignRequest {
  projectId: string;
  message: string;                   // 用戶的自然語言輸入
  context?: {
    viewport?: ViewportInfo;          // 當前視窗資訊
    canvasState?: CanvasState;        // 完整畫布狀態（可選）
    focusNodeId?: string;            // 當前聚焦的節點
    selectedNodeIds?: string[];      // 選中的節點
  };
  options?: {
    maxSuggestions?: number;         // 最大建議數（預設 10）
    includeRationale?: boolean;      // 是否包含詳細理由（預設 true）
    targetComplexity?: 'simple' | 'moderate' | 'complex';  // 複雜度偏好
  };
}

// 生成建議回應
export interface GenerateDesignResponse {
  success: boolean;
  data: {
    suggestions: FrontendSuggestion[];
    summary: string;                  // AI 理解的摘要
    groupId: string;                  // 這批建議的群組ID
    stats: {
      total: number;
      byType: Record<NodeType, number>;
      byPriority: Record<PriorityLevel, number>;
      estimatedTime: number;          // 預估應用時間（秒）
    };
    metadata: {
      processingTime: number;         // AI 處理時間（毫秒）
      confidence: number;             // 整體信心度
      modelUsed: string;              // 使用的模型
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

// 驗證建議請求
export interface ValidateSuggestionsRequest {
  projectId: string;
  suggestionIds: string[];            // 要驗證的建議IDs
}

// 驗證建議回應
export interface ValidateSuggestionsResponse {
  success: boolean;
  data: {
    validations: Array<{
      suggestionId: string;
      isValid: boolean;
      errors: string[];
      warnings: string[];
      canAutoFix: boolean;
    }>;
  };
}

// 應用建議請求
export interface ApplySuggestionsRequest {
  projectId: string;
  suggestionIds: string[];            // 接受的建議IDs（已排序）
  rejectedIds?: string[];            // 拒絕的建議IDs（用於學習）
  options?: {
    dryRun?: boolean;                // 模擬執行
    stopOnError?: boolean;           // 遇錯即停（預設 false）
    skipValidation?: boolean;        // 跳過驗證（危險，預設 false）
  };
}

// 應用建議回應
export interface ApplySuggestionsResponse {
  success: boolean;
  data: {
    applied: Array<{
      suggestionId: string;
      tempNodeId?: string;
      actualResourceId: string;       // 實際創建的資源ID
      resourceType: NodeType;
      success: boolean;
      error?: string;
    }>;
    failed: Array<{
      suggestionId: string;
      reason: string;
      canRetry: boolean;
    }>;
    rollbackAvailable: boolean;
    rollbackId?: string;              // 用於回滾的ID
    mappings: Array<{                 // ID 映射表
      tempNodeId: string;
      actualId: string;
      type: NodeType;
    }>;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// ============= WebSocket/SSE 事件 =============

export interface AIGenerationProgress {
  stage: 'understanding' | 'planning' | 'generating' | 'validating' | 'formatting';
  progress: number;                   // 0-100
  message: string;
  estimatedTimeRemaining?: number;    // 秒
}

export interface AIStreamEvent {
  type: 'progress' | 'partial' | 'complete' | 'error';
  data: AIGenerationProgress | Partial<FrontendSuggestion> | GenerateDesignResponse | Error;
}

// ============= UI 組件屬性 =============

export interface SuggestionCardProps {
  suggestion: FrontendSuggestion;
  isAccepted: boolean;
  isRejected: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onHover: (id: string | null) => void;
  onViewDetails: (id: string) => void;
}

export interface SuggestionPanelProps {
  suggestions: FrontendSuggestion[];
  acceptedIds: Set<string>;
  rejectedIds: Set<string>;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onApply: (ids: string[]) => Promise<void>;
  loading?: boolean;
  applyProgress?: number;
}

// ============= 輔助函數類型 =============

export interface SuggestionUtils {
  // 依賴排序
  sortByDependencies: (suggestions: FrontendSuggestion[]) => FrontendSuggestion[];
  
  // 衝突檢測
  detectConflicts: (suggestions: FrontendSuggestion[]) => Map<string, string[]>;
  
  // 分組
  groupRelatedSuggestions: (suggestions: FrontendSuggestion[]) => Map<string, FrontendSuggestion[]>;
  
  // ID 映射
  mapTempToActual: (
    suggestions: FrontendSuggestion[],
    mappings: Array<{ tempNodeId: string; actualId: string }>
  ): FrontendSuggestion[];
}

// ============= 常量定義 =============

export const SUGGESTION_COLORS: Record<NodeType, string> = {
  MODULE: '#1890ff',
  USE_CASE: '#52c41a',
  SEQUENCE: '#722ed1',
  API: '#fa8c16',
  DTO: '#eb2f96'
};

export const PREVIEW_OPACITY = 0.6;
export const HIGHLIGHT_ANIMATION_DURATION = 300;  // ms
export const MAX_SUGGESTIONS_PER_REQUEST = 20;
export const SUGGESTION_EXPIRY_TIME = 30 * 60 * 1000;  // 30 分鐘

// ============= 命名規則 =============

/**
 * 臨時節點ID命名規則：
 * - 格式：temp_<type>_<timestamp>_<index>
 * - 範例：temp_module_1704038400000_001
 * - type: module | usecase | sequence | api | dto（小寫）
 * - timestamp: 13位時間戳
 * - index: 3位數字，左補零
 */

/**
 * 建議ID命名規則：
 * - 格式：sug_<timestamp>_<random>
 * - 範例：sug_1704038400000_a1b2c3
 * - timestamp: 13位時間戳
 * - random: 6位隨機字串
 */

/**
 * 群組ID命名規則：
 * - 格式：grp_<timestamp>_<hash>
 * - 範例：grp_1704038400000_x7y8z9
 * - timestamp: 13位時間戳
 * - hash: 6位hash值（基於用戶輸入）
 */
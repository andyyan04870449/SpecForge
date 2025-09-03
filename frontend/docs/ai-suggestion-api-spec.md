# AI 建議 API 規格文件

## 概述
本文件定義前端期望接收的 AI 建議資料格式，供後端實作參考。

## API 端點

### 取得 AI 設計建議
```
POST /api/v1/ai/design-suggestions
```

### 請求格式
```typescript
{
  projectId: string;        // 專案 ID
  context: string;          // 使用者描述或需求
  currentState?: {          // 當前圖譜狀態（可選）
    nodes: Array<{
      id: string;
      type: 'MODULE' | 'USE_CASE' | 'SEQUENCE' | 'API' | 'DTO';
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
    focusAreas?: string[];   // 關注的節點類型
    autoConnect?: boolean;   // 是否自動建議連線
  };
}
```

### 回應格式
```typescript
{
  success: boolean;
  projectId: string;
  suggestions: AISuggestion[];  // 建議列表（見下方定義）
  summary?: string;              // 建議摘要說明
  metadata?: {
    totalNodes: number;
    totalConnections: number;
    estimatedImpact: 'low' | 'medium' | 'high';
  };
}
```

## 四種操作類型詳細說明

### 1. CREATE - 創建新節點

**用途**：建議創建新的設計元素（模組、API、DTO 等）

**範例**：
```json
{
  "id": "sug_create_001",
  "action": "create",
  "data": {
    "type": "MODULE",
    "title": "用戶管理模組",
    "description": "處理用戶註冊、登入、權限管理等功能",
    "position": { "x": 100, "y": 100 }
  },
  "reason": "基於系統需求，建議新增用戶管理模組來處理認證相關功能",
  "confidence": 0.95
}
```

**支援的節點類型**：
- `MODULE`: 模組
- `USE_CASE`: 使用案例（需要 `moduleId`）
- `SEQUENCE`: 循序圖（需要 `mermaidSrc`）
- `API`: API 端點（需要 `method`, `domain`, `endpoint`）
- `DTO`: 資料傳輸物件（需要 `kind`, `schemaJson`）

### 2. UPDATE - 更新現有節點

**用途**：建議修改現有節點的屬性或內容

**範例**：
```json
{
  "id": "sug_update_001",
  "action": "update",
  "nodeId": "api_user_login",
  "data": {
    "type": "API",
    "title": "用戶登入 API (更新)",
    "description": "加入雙因素認證支援",
    "method": "POST",
    "domain": "api",
    "endpoint": "/auth/login",
    "requestSpec": {
      "email": "string",
      "password": "string",
      "twoFactorCode": "string?"
    },
    "responseSpec": {
      "token": "string",
      "refreshToken": "string",
      "user": {
        "id": "string",
        "email": "string",
        "name": "string"
      }
    }
  },
  "reason": "增強安全性，加入雙因素認證欄位",
  "confidence": 0.88
}
```

**注意事項**：
- 必須提供 `nodeId` 指定要更新的節點
- `data` 中只需包含要更新的欄位
- `type` 欄位必須與原節點類型一致

### 3. DELETE - 刪除節點

**用途**：建議刪除不再需要或冗餘的節點

**範例**：
```json
{
  "id": "sug_delete_001",
  "action": "delete",
  "nodeId": "dto_old_user_response",
  "reason": "此 DTO 已被新版本取代，且沒有任何 API 使用",
  "confidence": 0.92
}
```

**注意事項**：
- 只需提供 `nodeId`
- 建議提供明確的刪除原因
- 刪除前應考慮相依性

### 4. CONNECT - 建立連線關係

**用途**：建議在節點之間建立關聯

**範例**：
```json
{
  "id": "sug_connect_001",
  "action": "connect",
  "connection": {
    "sourceId": "sd_user_auth_flow",
    "targetId": "api_user_login",
    "relationType": "api-sequence",
    "description": "將登入 API 關聯到用戶認證流程"
  },
  "reason": "偵測到 API 與循序圖有業務關聯性",
  "confidence": 0.85
}
```

**支援的關係類型**：
- `parent-child`: 父子關係（如模組-使用案例）
- `api-sequence`: API 與循序圖關聯
- `api-dto`: API 與 DTO 關聯
- `sequence-dto`: 循序圖與 DTO 關聯

## 完整範例回應

```json
{
  "success": true,
  "projectId": "proj_123",
  "summary": "根據您的需求，建議建立完整的用戶認證系統",
  "suggestions": [
    {
      "id": "sug_1",
      "action": "create",
      "data": {
        "type": "MODULE",
        "title": "認證模組",
        "description": "管理用戶認證與授權",
        "position": { "x": 50, "y": 50 }
      },
      "reason": "建立認證功能的主要模組",
      "confidence": 0.95
    },
    {
      "id": "sug_2",
      "action": "create",
      "data": {
        "type": "USE_CASE",
        "title": "用戶登入",
        "description": "用戶使用帳號密碼登入系統",
        "moduleId": "mod_auth_001",
        "preconditions": ["用戶已註冊"],
        "postconditions": ["用戶成功登入", "取得存取權杖"],
        "mainFlow": [
          {
            "order": 1,
            "action": "輸入帳號密碼",
            "description": "用戶在登入頁面輸入認證資訊"
          },
          {
            "order": 2,
            "action": "驗證身份",
            "description": "系統驗證用戶身份"
          },
          {
            "order": 3,
            "action": "產生權杖",
            "description": "系統產生並返回 JWT 權杖"
          }
        ]
      },
      "reason": "定義登入使用案例流程",
      "confidence": 0.90
    },
    {
      "id": "sug_3",
      "action": "create",
      "data": {
        "type": "SEQUENCE",
        "title": "登入流程循序圖",
        "mermaidSrc": "sequenceDiagram\n  participant User\n  participant Frontend\n  participant API\n  participant Database\n  \n  User->>Frontend: 輸入帳號密碼\n  Frontend->>API: POST /auth/login\n  API->>Database: 查詢用戶資料\n  Database-->>API: 返回用戶資料\n  API->>API: 驗證密碼\n  API->>API: 產生 JWT\n  API-->>Frontend: 返回 token\n  Frontend-->>User: 登入成功",
        "useCaseId": "uc_login_001"
      },
      "reason": "視覺化登入流程的互動順序",
      "confidence": 0.88
    },
    {
      "id": "sug_4",
      "action": "create",
      "data": {
        "type": "API",
        "title": "用戶登入",
        "method": "POST",
        "domain": "api",
        "endpoint": "/auth/login",
        "requestSpec": {
          "email": "string",
          "password": "string"
        },
        "responseSpec": {
          "success": "boolean",
          "token": "string",
          "user": "UserDTO"
        },
        "statusCodes": {
          "200": "登入成功",
          "401": "認證失敗",
          "400": "請求格式錯誤"
        }
      },
      "reason": "實作登入 API 端點",
      "confidence": 0.92
    },
    {
      "id": "sug_5",
      "action": "create",
      "data": {
        "type": "DTO",
        "title": "LoginRequestDTO",
        "kind": "request",
        "schemaJson": {
          "type": "object",
          "properties": {
            "email": {
              "type": "string",
              "format": "email"
            },
            "password": {
              "type": "string",
              "minLength": 8
            }
          },
          "required": ["email", "password"]
        }
      },
      "reason": "定義登入請求的資料結構",
      "confidence": 0.90
    },
    {
      "id": "sug_6",
      "action": "connect",
      "connection": {
        "sourceId": "sd_login_flow",
        "targetId": "api_login",
        "relationType": "api-sequence",
        "description": "關聯登入 API 到循序圖"
      },
      "reason": "建立 API 與流程圖的關聯",
      "confidence": 0.85
    },
    {
      "id": "sug_7",
      "action": "connect",
      "connection": {
        "sourceId": "api_login",
        "targetId": "dto_login_request",
        "relationType": "api-dto",
        "description": "設定 API 請求 DTO"
      },
      "reason": "關聯 API 與其請求 DTO",
      "confidence": 0.88
    }
  ],
  "metadata": {
    "totalNodes": 5,
    "totalConnections": 2,
    "estimatedImpact": "high"
  }
}
```

## 實作注意事項

### 後端需要處理的關鍵點

1. **ID 格式**：
   - 節點 ID 應遵循格式：`{type}_{unique_id}`
   - 例如：`mod_auth_001`, `api_login_001`, `dto_user_001`

2. **位置計算**：
   - 如果沒有提供 `position`，後端應自動計算合理的節點位置
   - 建議使用力導向算法或層級佈局

3. **關聯驗證**：
   - 創建連線前應驗證來源和目標節點是否存在
   - 檢查關係類型是否合理（如 MODULE 不能連到 DTO）

4. **信心度計算**：
   - `confidence` 值範圍：0-1
   - 可基於規則匹配度、歷史資料等計算

5. **錯誤處理**：
   - 如果某個建議執行失敗，不應影響其他建議
   - 返回部分成功的結果和錯誤詳情

### 前端整合要點

1. **預覽模式**：
   - 前端會先進入預覽模式顯示所有建議
   - 使用者可以選擇接受或拒絕個別建議

2. **批次處理**：
   - 前端支援批次接受/拒絕所有建議
   - 建議按相依性順序執行

3. **視覺回饋**：
   - 新增節點：高亮顯示
   - 更新節點：虛線框標記
   - 刪除節點：半透明顯示
   - 新連線：動畫效果

## 測試端點

提供測試端點以便前端開發：

```
GET /api/v1/ai/design-suggestions/example
```

返回本文件中的完整範例回應，供前端測試整合。
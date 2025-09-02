# 系統分析網站 API 端點清單

## 基礎路徑
所有 API 路徑前綴：`/api/v1`

## 0. 用戶認證 (Authentication)

| 方法 | 路徑 | 用途 | 認證要求 |
|------|------|------|----------|
| POST | `/auth/login` | 用戶登入 | 無 |
| POST | `/auth/logout` | 用戶登出 | Access Token |
| POST | `/auth/refresh` | 重新整理 Token | Refresh Token |
| POST | `/auth/register` | 用戶註冊 | 無 |
| GET | `/auth/profile` | 取得個人資料 | Access Token |
| PATCH | `/auth/profile` | 更新個人資料 | Access Token |
| PATCH | `/auth/password` | 修改密碼 | Access Token |

## 1. 專案管理 (Project)

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/projects` | 建立新專案 |
| GET | `/projects` | 取得專案列表（分頁） |
| GET | `/projects/{id}` | 取得單一專案詳情 |
| PATCH | `/projects/{id}` | 更新專案資訊 |
| DELETE | `/projects/{id}` | 刪除專案（連同所有子資源） |

## 2. 模組管理 (Module)

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/modules` | 建立新模組（自動生成 MOD-xxx 代碼） |
| POST | `/modules/batch` | 批量建立模組 |
| GET | `/modules` | 取得模組列表（支援 project_id、parent_id 篩選） |
| GET | `/modules/{id}` | 取得單一模組詳情 |
| PATCH | `/modules/{id}` | 更新模組資訊 |
| DELETE | `/modules/{id}` | 刪除模組（連同子模組與用例） |
| PATCH | `/modules/{id}/order` | 調整模組排序 |
| PATCH | `/modules/{id}/parent` | 移動模組到其他父模組 |

## 3. 使用案例管理 (Use Case)

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/use-cases` | 建立新使用案例（自動生成 UC-xxx 代碼） |
| POST | `/use-cases/batch` | 批量建立使用案例 |
| GET | `/use-cases` | 取得使用案例列表（支援 project_id、module_id 篩選） |
| GET | `/use-cases/{id}` | 取得單一使用案例詳情 |
| PATCH | `/use-cases/{id}` | 更新使用案例資訊 |
| DELETE | `/use-cases/{id}` | 刪除使用案例（連同循序圖） |
| PATCH | `/use-cases/{id}/module` | 移動使用案例到其他模組 |

## 4. 循序圖管理 (Sequence Diagram)

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/sequences` | 建立新循序圖（自動生成 SD-xxx 代碼） |
| POST | `/sequences/batch` | 批量建立循序圖 |
| GET | `/sequences` | 取得循序圖列表（支援 project_id、use_case_id 篩選） |
| GET | `/sequences/{id}` | 取得單一循序圖詳情 |
| PATCH | `/sequences/{id}` | 更新循序圖資訊（包含 Mermaid 原始碼） |
| DELETE | `/sequences/{id}` | 刪除循序圖（連同相關連結） |
| POST | `/sequences/{id}/parse` | 解析 Mermaid 原始碼提取 API 參照 |
| GET | `/sequences/{id}/preview` | 預覽循序圖（回傳 SVG 或圖片） |

## 5. API 合約管理 (API Contract)

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/apis` | 建立新 API（自動生成 API-xxx-xxx 代碼） |
| POST | `/apis/batch` | 批量建立 API |
| GET | `/apis` | 取得 API 列表（支援 project_id、domain、method 篩選） |
| GET | `/apis/{id}` | 取得單一 API 詳情 |
| GET | `/apis/code/{code}` | 根據代碼查詢 API |
| PATCH | `/apis/{id}` | 更新 API 資訊 |
| DELETE | `/apis/{id}` | 刪除 API（連同相關連結） |
| GET | `/apis/{id}/sequences` | 取得引用此 API 的循序圖列表 |
| GET | `/apis/{id}/dtos` | 取得此 API 綁定的 DTO 列表 |

## 6. DTO 模式管理 (DTO Schema)

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/dtos` | 建立新 DTO（自動生成 DTO-xxx-xxx 代碼） |
| POST | `/dtos/batch` | 批量建立 DTO |
| GET | `/dtos` | 取得 DTO 列表（支援 project_id、kind 篩選） |
| GET | `/dtos/{id}` | 取得單一 DTO 詳情 |
| GET | `/dtos/code/{code}` | 根據代碼查詢 DTO |
| PATCH | `/dtos/{id}` | 更新 DTO 資訊（包含 JSON Schema） |
| DELETE | `/dtos/{id}` | 刪除 DTO（連同相關連結） |
| POST | `/dtos/{id}/validate` | 驗證資料是否符合 DTO Schema |
| GET | `/dtos/{id}/apis` | 取得使用此 DTO 的 API 列表 |

## 7. 關聯管理 (Links)

### 7.1 API-Sequence 關聯

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/api-sequence-links` | 建立 API 與循序圖關聯 |
| POST | `/api-sequence-links/batch` | 批量建立關聯 |
| GET | `/api-sequence-links` | 取得關聯列表（支援 api_id、sequence_id 篩選） |
| DELETE | `/api-sequence-links/{id}` | 刪除關聯 |
| POST | `/api-sequence-links/auto-link` | 自動根據循序圖內容建立關聯 |

### 7.2 API-DTO 關聯

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/api-dto-links` | 建立 API 與 DTO 關聯 |
| POST | `/api-dto-links/batch` | 批量建立關聯 |
| GET | `/api-dto-links` | 取得關聯列表（支援 api_id、dto_id、role 篩選） |
| DELETE | `/api-dto-links/{id}` | 刪除關聯 |
| PATCH | `/api-dto-links/{id}/role` | 變更關聯角色（req/res） |

## 8. 查詢與分析

| 方法 | 路徑 | 用途 |
|------|------|------|
| GET | `/catalog` | 取得專案完整目錄樹（模組、用例、循序圖、API、DTO） |
| GET | `/trace/chain` | 追溯資源關聯鏈（從任一資源向上/向下查詢） |
| GET | `/search` | 簡單搜尋（根據標題、代碼搜尋資源） |
| GET | `/statistics/{projectId}` | 取得專案統計資訊（資源數量、錯誤數等） |

## 9. 一致性檢查

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/consistency/check` | 執行專案一致性檢查 |
| GET | `/consistency/check/{projectId}/latest` | 取得最近一次檢查結果 |
| GET | `/consistency/rules` | 取得所有檢查規則說明 |

## 10. AI 生成功能

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/ai/generate` | 生成 Use Case、Sequence、API、DTO 草稿 |
| GET | `/ai/drafts/{draftId}` | 取得 AI 生成的草稿內容 |
| POST | `/ai/adopt-draft` | 採用 AI 草稿（原子性建立所有資源） |
| DELETE | `/ai/drafts/{draftId}` | 刪除未採用的草稿 |
| GET | `/ai/templates` | 取得 AI 生成模板列表 |
| POST | `/ai/suggest-apis` | 根據循序圖內容建議 API 定義 |
| POST | `/ai/suggest-dtos` | 根據 API 定義建議 DTO 結構 |

## 11. 匯入匯出（MVP 版本）

| 方法 | 路徑 | 用途 |
|------|------|------|
| POST | `/export/project` | 匯出整個專案（JSON 格式） |
| POST | `/import/project` | 匯入專案資料 |
| POST | `/import/validate` | 驗證匯入檔案格式 |

### 未來版本（Phase 2）
- `POST /export/openapi` - 匯出 OpenAPI 3.0 規範
- `POST /export/postman` - 匯出 Postman Collection  
- `POST /export/markdown` - 匯出 Markdown 文檔
- `POST /import/openapi` - 從 OpenAPI 規範匯入 API

## 12. 系統管理

| 方法 | 路徑 | 用途 |
|------|------|------|
| GET | `/health` | 基本健康檢查 |
| GET | `/health/ready` | 就緒狀態檢查（含各子系統狀態） |
| GET | `/health/live` | 存活狀態檢查 |
| GET | `/health/db` | 資料庫連線狀態檢查 |
| GET | `/health/consistency` | 一致性檢查服務狀態 |
| GET | `/health/detailed` | 詳細系統狀態 |
| GET | `/version` | 取得系統版本資訊 |
| GET | `/config/domains` | 取得可用的 API Domain 列表 |
| GET | `/config/limits` | 取得系統限制設定（最大檔案大小等） |

## 分頁參數說明
所有列表 API 支援以下分頁參數：
- `page`: 頁碼（從 1 開始）
- `size`: 每頁筆數（預設 20，最大 100）
- `sort`: 排序欄位
- `order`: 排序方向（asc/desc）

## 回應格式
所有 API 統一回應格式：

### 成功回應
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 錯誤回應
```json
{
  "success": false,
  "error": {
    "code": "BIZ_VALIDATION_ERROR",
    "message": "詳細錯誤訊息",
    "details": { ... },
    "request_id": "req-uuid-123"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 錯誤代碼分類
- `BIZ_*`: 業務邏輯錯誤
- `SYS_*`: 系統錯誤
- `AUTH_*`: 認證授權錯誤
- `VAL_*`: 資料驗證錯誤
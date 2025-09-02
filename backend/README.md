# SpecForge 後端服務

## 專案概述
系統分析網站的後端 API 服務，使用 Node.js + TypeScript + Express + Prisma + PostgreSQL 技術棧。

## 已完成功能

### ✅ 基礎架構
- [x] TypeScript 配置
- [x] Express 應用程式架構
- [x] Prisma ORM 設定
- [x] 環境變數配置與驗證
- [x] 錯誤處理中間件
- [x] 資料庫連線 (PostgreSQL)
- [x] Redis 連線與快取助手
- [x] 健康檢查端點

### ✅ 核心功能
- [x] 流水號生成機制 (CodeGeneratorService)
  - 支援併發安全
  - 自動重試機制
  - Scope-based 計數

### 🚧 開發中
- [ ] Project CRUD API
- [ ] Module CRUD API
- [ ] UseCase CRUD API
- [ ] Sequence Diagram CRUD API
- [ ] API Contract CRUD API
- [ ] DTO Schema CRUD API
- [ ] Mermaid 解析功能
- [ ] 一致性檢查功能
- [ ] AI 生成功能

## 專案結構
```
backend/
├── prisma/
│   └── schema.prisma          # 資料庫模型定義
├── src/
│   ├── config/
│   │   ├── database.ts        # 資料庫連線配置
│   │   ├── env.ts            # 環境變數配置
│   │   └── redis.ts          # Redis 連線配置
│   ├── middlewares/
│   │   └── errorHandler.ts   # 錯誤處理中間件
│   ├── routes/
│   │   └── health.routes.ts  # 健康檢查路由
│   ├── services/
│   │   └── codeGenerator.service.ts  # 流水號生成服務
│   ├── types/
│   │   └── errors.ts         # 錯誤類型定義
│   ├── app.ts                # Express 應用程式
│   └── server.ts             # 伺服器啟動檔案
├── .env                      # 環境變數（不要提交）
├── .env.example              # 環境變數範本
├── package.json              # 專案配置
└── tsconfig.json             # TypeScript 配置
```

## 安裝與執行

### 前置需求
- Node.js >= 18.0.0
- PostgreSQL >= 15
- Redis >= 7.x (可選)

### 安裝步驟

1. 安裝相依套件
```bash
npm install
```

2. 設定環境變數
```bash
cp .env.example .env
# 編輯 .env 檔案，設定資料庫連線等資訊
```

3. 建立資料庫
```bash
# 確保 PostgreSQL 服務正在運行
# 建立名為 specforge 的資料庫
createdb specforge
```

4. 執行資料庫遷移
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. 啟動開發伺服器
```bash
npm run dev
```

伺服器將在 http://localhost:3000 啟動

## API 端點

### 健康檢查
- `GET /health` - 基本健康檢查
- `GET /health/ready` - 就緒狀態檢查
- `GET /health/live` - 存活狀態檢查
- `GET /health/db` - 資料庫連線狀態
- `GET /health/consistency` - 一致性檢查服務狀態
- `GET /health/detailed` - 詳細系統狀態

### 版本資訊
- `GET /` - API 基本資訊
- `GET /version` - 系統版本資訊

## 開發指令

```bash
# 開發模式（自動重載）
npm run dev

# 建置專案
npm run build

# 生產模式執行
npm start

# Prisma 相關
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:migrate   # 執行資料庫遷移
npm run prisma:studio    # 開啟 Prisma Studio (資料庫 GUI)
npm run prisma:seed      # 執行種子資料

# 測試與檢查
npm test                 # 執行測試
npm run lint            # ESLint 檢查
npm run typecheck       # TypeScript 類型檢查
```

## 環境變數說明

查看 `.env.example` 檔案了解所有可配置的環境變數。

主要設定：
- `DATABASE_URL` - PostgreSQL 連線字串
- `REDIS_URL` - Redis 連線字串
- `JWT_SECRET` - JWT 簽名密鑰
- `PORT` - 伺服器連接埠

## 錯誤代碼

系統使用結構化的錯誤代碼：
- `BIZ_*` - 業務邏輯錯誤
- `SYS_*` - 系統錯誤
- `AUTH_*` - 認證授權錯誤
- `VAL_*` - 資料驗證錯誤

## 下一步開發計畫

1. 完成所有 CRUD API 路由
2. 實作 Mermaid 解析服務
3. 實作一致性檢查邏輯
4. 整合 AI 服務（OpenAI/Claude）
5. 實作匯入匯出功能
6. 加入單元測試和整合測試
7. 優化效能和快取策略
8. 部署到雲端環境

## 注意事項

- 本專案仍在開發中，許多功能尚未完成
- 請勿在生產環境使用目前的版本
- 確保不要將 `.env` 檔案提交到版本控制

## 授權

MIT License
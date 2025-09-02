# AI System Analysis UI

一個基於 React + TypeScript 的系統分析網站前端應用，支援專案管理、API 文檔檢視、DTO 檢視和 Mermaid 圖表渲染。

## 🚀 快速開始

### 前置需求
- Node.js 18+ 
- npm 或 yarn

### 安裝依賴
```bash
npm install
```

### 開發模式
```bash
npm run dev
```
應用將在 http://localhost:3000 啟動

### 建置生產版本
```bash
npm run build
```

### 預覽生產版本
```bash
npm run preview
```

## 🛠️ 技術棧

- **框架**: React 18 + TypeScript
- **建置工具**: Vite
- **UI 元件**: Radix UI + Tailwind CSS
- **圖表渲染**: Mermaid.js
- **狀態管理**: React Hooks
- **表單處理**: React Hook Form

## 📁 專案結構

```
src/
├── components/          # React 元件
│   ├── ui/            # 基礎 UI 元件
│   ├── MainApp.tsx    # 主要應用元件
│   ├── ProjectListPage.tsx  # 專案列表頁面
│   ├── APIDocViewer.tsx     # API 文檔檢視器
│   ├── DTOViewer.tsx        # DTO 檢視器
│   ├── UCViewer.tsx         # 使用案例檢視器
│   ├── MermaidCanvas.tsx    # Mermaid 畫布
│   └── FloatingChatBot.tsx  # 浮動聊天機器人
├── styles/            # 樣式檔案
├── guidelines/        # 設計指南
└── main.tsx          # 應用入口點
```

## ⚙️ 環境配置

創建 `env.local` 檔案來配置環境變數：

```bash
# API 配置
VITE_API_BASE_URL=http://localhost:3001/api/v1

# 應用配置
VITE_APP_TITLE=AI System Analysis UI
VITE_APP_VERSION=0.1.0
```

## 🔧 開發腳本

- `npm run dev` - 啟動開發伺服器
- `npm run build` - 建置生產版本
- `npm run preview` - 預覽生產版本
- `npm run lint` - 執行程式碼檢查

## 📦 部署

### 靜態檔案部署
建置後的檔案位於 `dist/` 目錄，可以部署到：
- Nginx
- Apache
- CDN 服務
- 雲端靜態網站託管

### Docker 部署
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🐛 故障排除

### 常見問題

1. **依賴安裝失敗**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **建置失敗**
   ```bash
   npm run build
   # 檢查 TypeScript 錯誤
   ```

3. **開發伺服器無法啟動**
   ```bash
   # 檢查端口是否被佔用
   lsof -i :3000
   ```

## 📝 開發指南

### 新增元件
1. 在 `src/components/` 目錄下創建新元件
2. 使用 TypeScript 和 React 18 語法
3. 遵循現有的命名規範

### 樣式指南
- 使用 Tailwind CSS 類別
- 遵循設計系統的顏色和間距規範
- 支援深色/淺色主題

## 🤝 貢獻

1. Fork 專案
2. 創建功能分支
3. 提交變更
4. 發起 Pull Request

## 📄 授權

MIT License
  
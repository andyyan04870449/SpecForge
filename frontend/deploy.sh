#!/bin/bash

echo "🚀 AI System Analysis UI 部署腳本"
echo "=================================="

# 檢查 Node.js 版本
echo "📋 檢查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未找到 Node.js，請先安裝 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 錯誤: Node.js 版本過低，需要 18+，當前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 檢查 npm
echo "📋 檢查 npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤: 未找到 npm"
    exit 1
fi

echo "✅ npm 版本: $(npm -v)"

# 清理舊的依賴和建置檔案
echo "🧹 清理舊檔案..."
rm -rf node_modules package-lock.json dist build

# 安裝依賴
echo "📦 安裝依賴..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依賴安裝失敗"
    exit 1
fi

echo "✅ 依賴安裝完成"

# 建置生產版本
echo "🔨 建置生產版本..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 建置失敗"
    exit 1
fi

echo "✅ 建置完成"

# 檢查建置結果
if [ ! -d "dist" ]; then
    echo "❌ 建置目錄不存在"
    exit 1
fi

echo "📁 建置檔案:"
ls -la dist/

# 啟動預覽伺服器
echo "🌐 啟動預覽伺服器..."
echo "應用將在 http://localhost:4173 啟動"
echo "按 Ctrl+C 停止伺服器"
echo ""

npm run preview

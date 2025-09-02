#!/bin/bash

echo "🚀 AI System Analysis UI 啟動腳本"
echo "=================================="

# 檢查依賴是否已安裝
if [ ! -d "node_modules" ]; then
    echo "📦 安裝依賴..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ 依賴安裝失敗"
        exit 1
    fi
    echo "✅ 依賴安裝完成"
else
    echo "✅ 依賴已安裝"
fi

# 啟動開發伺服器
echo "🌐 啟動開發伺服器..."
echo "應用將在 http://localhost:3000 啟動"
echo "按 Ctrl+C 停止伺服器"
echo ""

npm run dev

#!/bin/bash

# SpecForge 後端環境設置腳本

echo "🚀 SpecForge Backend Setup Script"
echo "================================="

# 檢查 Node.js 版本
echo "📌 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js version must be 18 or higher"
    echo "Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# 檢查是否有 .env 檔案
echo "📌 Checking environment configuration..."
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file to configure your database connection"
else
    echo "✅ .env file exists"
fi

# 安裝依賴
echo "📌 Installing dependencies..."
npm install

# 檢查 Docker 服務
echo "📌 Checking Docker services..."
if command -v docker-compose &> /dev/null; then
    echo "🐳 Starting Docker services (PostgreSQL + Redis)..."
    cd ..
    docker-compose up -d postgres redis
    cd backend
    
    # 等待 PostgreSQL 啟動
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
else
    echo "⚠️  Docker Compose not found. Please ensure PostgreSQL and Redis are running manually."
fi

# 生成 Prisma Client
echo "📌 Generating Prisma Client..."
npm run prisma:generate

# 執行資料庫遷移
echo "📌 Running database migrations..."
npx prisma migrate dev --name init

# 顯示完成訊息
echo ""
echo "================================="
echo "✅ Setup completed successfully!"
echo "================================="
echo ""
echo "📋 Next steps:"
echo "1. Review and edit .env file if needed"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000/health to verify the server is running"
echo ""
echo "🛠️  Useful commands:"
echo "  npm run dev          - Start development server"
echo "  npm run prisma:studio - Open Prisma Studio (Database GUI)"
echo "  npm run build        - Build for production"
echo "  npm test            - Run tests"
echo ""

# 詢問是否要立即啟動伺服器
read -p "Would you like to start the development server now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run dev
fi
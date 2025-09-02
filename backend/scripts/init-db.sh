#!/bin/bash
set -e

# 等待 PostgreSQL 啟動
until pg_isready -U postgres; do
  echo "Waiting for PostgreSQL to start..."
  sleep 2
done

echo "PostgreSQL started successfully"

# 創建用戶（如果不存在）
psql -U postgres -c "SELECT 1 FROM pg_roles WHERE rolname='user'" | grep -q 1 || psql -U postgres -c "CREATE USER \"user\" WITH PASSWORD 'user123';"

# 創建測試資料庫（如果不存在）
psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='specforge_test'" | grep -q 1 || psql -U postgres -c "CREATE DATABASE specforge_test;"

# 授權 specforge 資料庫權限給 user
psql -U postgres -d specforge -c "
-- 授權資料庫連接權限
GRANT CONNECT ON DATABASE specforge TO \"user\";

-- 授權 schema 權限
GRANT USAGE ON SCHEMA public TO \"user\";

-- 授權所有表的權限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"user\";

-- 授權未來創建的表的權限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"user\";

-- 授權序列權限
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"user\";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO \"user\";

-- 授權函數權限
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO \"user\";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO \"user\";
"

# 授權 specforge_test 資料庫權限給 user
psql -U postgres -d specforge_test -c "
-- 授權資料庫連接權限
GRANT CONNECT ON DATABASE specforge_test TO \"user\";

-- 授權 schema 權限
GRANT USAGE ON SCHEMA public TO \"user\";

-- 授權所有表的權限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"user\";

-- 授權未來創建的表的權限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"user\";

-- 授權序列權限
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"user\";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO \"user\";

-- 授權函數權限
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO \"user\";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO \"user\";
"

echo "Database initialization completed successfully"
echo "User 'user' now has full access to specforge and specforge_test databases"

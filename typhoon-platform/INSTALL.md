# EarthVision - 安装指南

## 系统要求

- Node.js 18+
- npm 9+
- PostgreSQL 14+ (可选)
- Docker (可选)

## 安装

### 方式一：直接安装

```bash
# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动
npm run dev
```

### 方式二：一键安装 (Windows)

```bash
setup.bat
```

### 方式三：一键安装 (Linux/Mac)

```bash
chmod +x setup.sh
./setup.sh
```

### 方式四：Docker

```bash
docker-compose up -d
```

## 环境变量

编辑 `.env` 文件：

```env
# 数据库 (可选，不配置则使用模拟数据)
DATABASE_URL="postgresql://postgres:password@localhost:5432/earthvision"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# MIMO API (可选，用于AI分析)
MIMO_API_KEY=""
MIMO_API_URL="https://api.mimo.com/v1"

# Mapbox (可选，用于地图)
NEXT_PUBLIC_MAPBOX_TOKEN=""

# Redis (可选)
REDIS_URL="redis://localhost:6379"

# ML Server (可选)
ML_SERVER_URL="http://localhost:8000"
```

## 启动命令

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start

# ML服务器
cd src/python/ml-server
pip install -r requirements.txt
python main.py
```

## 访问

- 主应用: http://localhost:3000
- ML服务: http://localhost:8000
- API文档: http://localhost:8000/docs

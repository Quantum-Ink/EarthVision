#!/bin/bash

echo "========================================"
echo "  AI台风预测分析平台 - 安装脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
echo -e "${YELLOW}[1/6] 检查 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Node.js，请先安装 Node.js 18+${NC}"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}[成功] Node.js 版本: $NODE_VERSION${NC}"

# 检查 npm
echo -e "${YELLOW}[2/6] 检查 npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 npm${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}[成功] npm 版本: $NPM_VERSION${NC}"

# 安装依赖
echo -e "${YELLOW}[3/6] 安装项目依赖...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误] 依赖安装失败${NC}"
    exit 1
fi
echo -e "${GREEN}[成功] 依赖安装完成${NC}"

# 生成 Prisma Client
echo -e "${YELLOW}[4/6] 生成 Prisma Client...${NC}"
npx prisma generate
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误] Prisma Client 生成失败${NC}"
    exit 1
fi
echo -e "${GREEN}[成功] Prisma Client 生成完成${NC}"

# 创建环境配置
echo -e "${YELLOW}[5/6] 创建环境配置文件...${NC}"
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# 数据库配置
DATABASE_URL="postgresql://postgres:password@localhost:5432/typhoon_platform"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-change-this"
NEXTAUTH_URL="http://localhost:3000"

# MIMO API
MIMO_API_KEY="your-mimo-api-key"
MIMO_API_URL="https://api.mimo.com/v1"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="your-mapbox-token"

# Redis
REDIS_URL="redis://localhost:6379"

# ML Server
ML_SERVER_URL="http://localhost:8000"
EOF
    echo -e "${GREEN}[成功] 已创建 .env 配置文件${NC}"
    echo -e "${YELLOW}[提示] 请编辑 .env 文件配置数据库和API密钥${NC}"
else
    echo -e "${YELLOW}[跳过] .env 文件已存在${NC}"
fi

# 创建启动脚本
echo -e "${YELLOW}[6/6] 创建启动脚本...${NC}"

# 创建 start-dev.sh
cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "========================================"
echo "  AI台风预测分析平台 - 开发模式"
echo "========================================"
echo ""
echo "启动开发服务器..."
echo "访问地址: http://localhost:3000"
echo ""
npm run dev
EOF
chmod +x start-dev.sh

# 创建 start-prod.sh
cat > start-prod.sh << 'EOF'
#!/bin/bash
echo "========================================"
echo "  AI台风预测分析平台 - 生产模式"
echo "========================================"
echo ""
echo "构建项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "构建失败"
    exit 1
fi
echo ""
echo "启动生产服务器..."
echo "访问地址: http://localhost:3000"
echo ""
npm start
EOF
chmod +x start-prod.sh

# 创建 start-docker.sh
cat > start-docker.sh << 'EOF'
#!/bin/bash
echo "========================================"
echo "  AI台风预测分析平台 - Docker模式"
echo "========================================"
echo ""
echo "检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "[错误] 未检测到 Docker，请先安装 Docker"
    echo "下载地址: https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo ""
echo "启动 Docker 容器..."
docker-compose up -d
echo ""
echo "启动完成！"
echo "访问地址: http://localhost:3000"
echo "ML服务地址: http://localhost:8000"
echo ""
EOF
chmod +x start-docker.sh

# 创建 start-ml.sh
cat > start-ml.sh << 'EOF'
#!/bin/bash
echo "========================================"
echo "  AI台风预测 - ML服务器"
echo "========================================"
echo ""
echo "检查 Python..."
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未检测到 Python，请先安装 Python 3.11+"
    echo "下载地址: https://www.python.org/downloads/"
    exit 1
fi
echo ""
echo "安装 Python 依赖..."
cd src/python/ml-server
pip3 install -r requirements.txt
echo ""
echo "启动 ML 服务器..."
echo "访问地址: http://localhost:8000"
echo "API文档: http://localhost:8000/docs"
echo ""
python3 main.py
EOF
chmod +x start-ml.sh

echo ""
echo "========================================"
echo "  安装完成！"
echo "========================================"
echo ""
echo "使用方法:"
echo "  1. 编辑 .env 文件配置数据库和API密钥"
echo "  2. 运行 ./start-dev.sh 启动开发模式"
echo "  3. 或运行 ./start-docker.sh 使用Docker启动"
echo "  4. 或运行 ./start-ml.sh 启动ML服务器"
echo ""
echo "文件说明:"
echo "  start-dev.sh    - 开发模式启动"
echo "  start-prod.sh   - 生产模式启动"
echo "  start-docker.sh - Docker模式启动"
echo "  start-ml.sh     - ML服务器启动"
echo ""

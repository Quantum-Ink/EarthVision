#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          AI台风预测分析平台 - 一键安装脚本                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 Node.js
echo -e "${YELLOW}[步骤 1/7] 检查 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Node.js！${NC}"
    echo "请安装 Node.js 18+: https://nodejs.org/"
    exit 1
fi
NODE_VER=$(node --version)
echo -e "      找到 Node.js $NODE_VER"

# 检查 npm
echo -e "${YELLOW}[步骤 2/7] 检查 npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 npm${NC}"
    exit 1
fi
NPM_VER=$(npm --version)
echo -e "      找到 npm $NPM_VER"

# 创建 .env 文件
echo -e "${YELLOW}[步骤 3/7] 配置环境变量...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        cat > .env << EOF
DATABASE_URL="postgresql://postgres:password@localhost:5432/typhoon_platform"
NEXTAUTH_SECRET="$(openssl rand -hex 32 2>/dev/null || echo 'change-this-to-random-string')"
NEXTAUTH_URL="http://localhost:3000"
MIMO_API_KEY=""
MIMO_API_URL="https://api.mimo.com/v1"
NEXT_PUBLIC_MAPBOX_TOKEN=""
REDIS_URL="redis://localhost:6379"
ML_SERVER_URL="http://localhost:8000"
EOF
    fi
    echo -e "      已创建 .env 配置文件"
else
    echo -e "      .env 文件已存在，跳过"
fi

# 安装依赖
echo -e "${YELLOW}[步骤 4/7] 安装项目依赖（需要几分钟）...${NC}"
echo ""
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[错误] 依赖安装失败！${NC}"
    echo "尝试运行: npm install --legacy-peer-deps --force"
    exit 1
fi
echo ""
echo -e "      依赖安装完成"

# 生成 Prisma Client
echo -e "${YELLOW}[步骤 5/7] 生成 Prisma Client...${NC}"
npx prisma generate 2>/dev/null
echo -e "      Prisma Client 生成完成"

# 创建启动脚本
echo -e "${YELLOW}[步骤 6/7] 创建启动脚本...${NC}"

cat > start.sh << 'EOF'
#!/bin/bash
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          AI台风预测分析平台 - 开发模式                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "启动开发服务器..."
echo "访问地址: http://localhost:3000"
echo "按 Ctrl+C 停止服务器"
echo ""
npm run dev
EOF
chmod +x start.sh

cat > start-prod.sh << 'EOF'
#!/bin/bash
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          AI台风预测分析平台 - 生产模式                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "构建项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "构建失败！"
    exit 1
fi
echo ""
echo "启动生产服务器..."
echo "访问地址: http://localhost:3000"
echo ""
npm start
EOF
chmod +x start-prod.sh

cat > docker-start.sh << 'EOF'
#!/bin/bash
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          AI台风预测分析平台 - Docker模式                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
if ! command -v docker &> /dev/null; then
    echo "[错误] 未检测到 Docker！"
    echo "请安装 Docker: https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo "启动 Docker 容器..."
docker-compose up -d
echo ""
echo "启动完成！"
echo "访问地址: http://localhost:3000"
echo "ML服务: http://localhost:8000"
echo ""
EOF
chmod +x docker-start.sh

cat > start-ml.sh << 'EOF'
#!/bin/bash
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          AI台风预测 - ML服务器                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未检测到 Python！"
    echo "请安装 Python 3.11+: https://www.python.org/downloads/"
    exit 1
fi
echo "安装 Python 依赖..."
cd src/python/ml-server
pip3 install -r requirements.txt
echo ""
echo "启动 ML 服务器..."
echo "API文档: http://localhost:8000/docs"
echo ""
python3 main.py
EOF
chmod +x start-ml.sh

echo -e "      启动脚本创建完成"

# 完成
echo -e "${YELLOW}[步骤 7/7] 安装完成！${NC}"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                      安装成功！                             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "使用方法:"
echo "────────────────────────────────────────────────────────────────"
echo "  ./start.sh          启动开发模式（推荐）"
echo "  ./start-prod.sh     启动生产模式"
echo "  ./docker-start.sh   使用Docker启动"
echo "  ./start-ml.sh       启动ML服务器"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "首次使用:"
echo "  1. 运行 ./start.sh 启动项目"
echo "  2. 打开浏览器访问 http://localhost:3000"
echo ""
echo "如需配置数据库或API:"
echo "  编辑 .env 文件"
echo ""

#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    EarthVision 安装                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js
echo "[1/5] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请安装: https://nodejs.org/"
    exit 1
fi
echo "      Node.js 已就绪"

# 创建 .env
echo "[2/5] 配置环境变量..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        cat > .env << EOF
DATABASE_URL="postgresql://postgres:password@localhost:5432/earthvision"
NEXTAUTH_SECRET="$(openssl rand -hex 32 2>/dev/null || echo 'change-this')"
NEXTAUTH_URL="http://localhost:3000"
EOF
    fi
    echo "      已创建 .env"
else
    echo "      .env 已存在"
fi

# 安装依赖
echo "[3/5] 安装依赖..."
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo "[错误] 安装失败"
    exit 1
fi

# 生成 Prisma
echo "[4/5] 生成 Prisma Client..."
npx prisma generate 2>/dev/null

# 创建启动脚本
echo "[5/5] 创建启动脚本..."

cat > start.sh << 'EOF'
#!/bin/bash
echo "启动 EarthVision..."
echo "访问: http://localhost:3000"
npm run dev
EOF
chmod +x start.sh

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    安装完成！                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "运行 ./start.sh 启动项目"
echo "访问 http://localhost:3000"
echo ""

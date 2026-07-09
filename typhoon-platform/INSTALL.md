# AI台风预测分析平台 - 安装指南

## 系统要求

### 必需软件
- **Node.js** 18.0 或更高版本
- **npm** 9.0 或更高版本
- **PostgreSQL** 14 或更高版本
- **Redis** 7 或更高版本（可选，用于缓存）

### 可选软件
- **Docker** 和 **Docker Compose**（用于容器化部署）
- **Python** 3.11 或更高版本（用于ML服务器）
- **Git**（用于版本控制）

## 快速安装

### Windows 用户

1. **下载并解压项目**
   ```
   解压 typhoon-platform.zip 到任意目录
   ```

2. **运行安装脚本**
   ```
   双击 install.bat
   ```

3. **配置环境变量**
   ```
   编辑 .env 文件，配置数据库连接和API密钥
   ```

4. **启动项目**
   ```
   双击 start-dev.bat 启动开发模式
   ```

### Linux/macOS 用户

1. **下载并解压项目**
   ```bash
   unzip typhoon-platform.zip
   cd typhoon-platform
   ```

2. **运行安装脚本**
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **配置环境变量**
   ```bash
   nano .env
   # 编辑数据库连接和API密钥
   ```

4. **启动项目**
   ```bash
   ./start-dev.sh
   ```

## 详细安装步骤

### 1. 安装 Node.js

访问 https://nodejs.org/ 下载并安装 Node.js 18+。

安装完成后，打开终端验证：
```bash
node --version
npm --version
```

### 2. 安装 PostgreSQL

#### Windows
访问 https://www.postgresql.org/download/windows/ 下载安装。

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Linux (Ubuntu)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 创建数据库
```bash
# 登录 PostgreSQL
sudo -u postgres psql

# 创建数据库
CREATE DATABASE typhoon_platform;

# 创建用户（可选）
CREATE USER typhoon WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE typhoon_platform TO typhoon;

# 退出
\q
```

### 3. 安装 Redis（可选）

#### Windows
访问 https://github.com/microsoftarchive/releases/releases 下载安装。

#### macOS
```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu)
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### 4. 配置环境变量

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 数据库配置
DATABASE_URL="postgresql://postgres:password@localhost:5432/typhoon_platform"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-change-this"
NEXTAUTH_URL="http://localhost:3000"

# MIMO API（可选）
MIMO_API_KEY="your-mimo-api-key"
MIMO_API_URL="https://api.mimo.com/v1"

# Mapbox（可选，用于地图）
NEXT_PUBLIC_MAPBOX_TOKEN="your-mapbox-token"

# Redis（可选）
REDIS_URL="redis://localhost:6379"

# ML Server（可选）
ML_SERVER_URL="http://localhost:8000"
```

### 5. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 推送数据库 schema
npx prisma db push

# 导入示例数据（可选）
npx prisma db seed
```

### 6. 启动项目

#### 开发模式
```bash
npm run dev
```
访问 http://localhost:3000

#### 生产模式
```bash
npm run build
npm start
```

#### Docker 模式
```bash
docker-compose up -d
```
访问 http://localhost:3000

### 7. 启动 ML 服务器（可选）

```bash
# 进入 ML 服务器目录
cd src/python/ml-server

# 安装 Python 依赖
pip install -r requirements.txt

# 启动服务器
python main.py
```
访问 http://localhost:8000 查看 API 文档

## 常见问题

### Q: npm install 失败怎么办？

A: 尝试以下解决方案：
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### Q: 数据库连接失败怎么办？

A: 检查以下几点：
1. PostgreSQL 服务是否启动
2. 数据库用户名和密码是否正确
3. 数据库是否已创建
4. 防火墙是否允许连接

### Q: 地图不显示怎么办？

A: 需要配置 Mapbox token：
1. 访问 https://www.mapbox.com/ 注册账号
2. 获取 API token
3. 在 `.env` 文件中配置 `NEXT_PUBLIC_MAPBOX_TOKEN`

### Q: AI 分析功能不可用怎么办？

A: 需要配置 MIMO API：
1. 获取 MIMO API key
2. 在 `.env` 文件中配置 `MIMO_API_KEY`

### Q: Docker 启动失败怎么办？

A: 检查以下几点：
1. Docker 是否安装并启动
2. 端口是否被占用
3. 查看日志：`docker-compose logs`

## 项目结构

```
typhoon-platform/
├── src/
│   ├── app/                    # Next.js 页面
│   │   ├── api/               # API 路由
│   │   ├── forecast/          # 预测页面
│   │   └── ...
│   ├── components/            # React 组件
│   ├── services/              # 业务服务
│   │   ├── data-collector/    # 数据采集
│   │   ├── data-fusion/       # 数据融合
│   │   ├── probability/       # 概率模拟
│   │   └── ai-analysis/       # AI 分析
│   ├── python/                # Python ML 服务
│   │   └── ml-server/         # ML 服务器
│   └── lib/                   # 工具库
├── prisma/                    # 数据库配置
├── public/                    # 静态资源
├── docker-compose.yml         # Docker 配置
├── install.bat                # Windows 安装脚本
├── install.sh                 # Linux/macOS 安装脚本
└── README.md                  # 项目说明
```

## 获取帮助

- 查看 [README.md](./README.md) 了解项目详情
- 提交 Issue 反馈问题
- 查看 API 文档：http://localhost:8000/docs

## 许可证

MIT License

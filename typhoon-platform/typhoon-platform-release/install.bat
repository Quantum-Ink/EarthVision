@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   AI台风预测分析平台 - 安装脚本
echo ========================================
echo.

:: 检查 Node.js
echo [1/6] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [成功] Node.js 版本: %NODE_VERSION%

:: 检查 npm
echo [2/6] 检查 npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 npm
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [成功] npm 版本: %NPM_VERSION%

:: 安装依赖
echo [3/6] 安装项目依赖...
call npm install
if errorlevel 1 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [成功] 依赖安装完成

:: 生成 Prisma Client
echo [4/6] 生成 Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo [错误] Prisma Client 生成失败
    pause
    exit /b 1
)
echo [成功] Prisma Client 生成完成

:: 创建环境配置
echo [5/6] 创建环境配置文件...
if not exist .env (
    copy .env.example .env >nul 2>&1
    if not exist .env (
        (
            echo # 数据库配置
            echo DATABASE_URL="postgresql://postgres:password@localhost:5432/typhoon_platform"
            echo.
            echo # NextAuth
            echo NEXTAUTH_SECRET="your-secret-key-change-this"
            echo NEXTAUTH_URL="http://localhost:3000"
            echo.
            echo # MIMO API
            echo MIMO_API_KEY="your-mimo-api-key"
            echo MIMO_API_URL="https://api.mimo.com/v1"
            echo.
            echo # Mapbox
            echo NEXT_PUBLIC_MAPBOX_TOKEN="your-mapbox-token"
            echo.
            echo # Redis
            echo REDIS_URL="redis://localhost:6379"
            echo.
            echo # ML Server
            echo ML_SERVER_URL="http://localhost:8000"
        ) > .env
        echo [成功] 已创建 .env 配置文件
        echo [提示] 请编辑 .env 文件配置数据库和API密钥
    )
) else (
    echo [跳过] .env 文件已存在
)

:: 创建启动脚本
echo [6/6] 创建启动脚本...

:: 创建 start-dev.bat
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo echo ========================================
    echo echo   AI台风预测分析平台 - 开发模式
    echo echo ========================================
    echo echo.
    echo echo 启动开发服务器...
    echo echo 访问地址: http://localhost:3000
    echo echo.
    echo call npm run dev
    echo pause
) > start-dev.bat

:: 创建 start-prod.bat
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo echo ========================================
    echo echo   AI台风预测分析平台 - 生产模式
    echo echo ========================================
    echo echo.
    echo echo 构建项目...
    echo call npm run build
    echo if errorlevel 1 ^(
    echo     echo 构建失败
    echo     pause
    echo     exit /b 1
    echo ^)
    echo echo.
    echo echo 启动生产服务器...
    echo echo 访问地址: http://localhost:3000
    echo echo.
    echo call npm start
    echo pause
) > start-prod.bat

:: 创建 start-docker.bat
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo echo ========================================
    echo echo   AI台风预测分析平台 - Docker模式
    echo echo ========================================
    echo echo.
    echo echo 检查 Docker...
    echo docker --version ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo [错误] 未检测到 Docker，请先安装 Docker Desktop
    echo     echo 下载地址: https://www.docker.com/products/docker-desktop
    echo     pause
    echo     exit /b 1
    echo ^)
    echo echo.
    echo echo 启动 Docker 容器...
    echo call docker-compose up -d
    echo echo.
    echo echo 启动完成！
    echo echo 访问地址: http://localhost:3000
    echo echo ML服务地址: http://localhost:8000
    echo echo.
    echo pause
) > start-docker.bat

:: 创建 start-ml.bat
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo echo ========================================
    echo echo   AI台风预测 - ML服务器
    echo echo ========================================
    echo echo.
    echo echo 检查 Python...
    echo python --version ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo [错误] 未检测到 Python，请先安装 Python 3.11+
    echo     echo 下载地址: https://www.python.org/downloads/
    echo     pause
    echo     exit /b 1
    echo ^)
    echo echo.
    echo echo 安装 Python 依赖...
    echo cd src\python\ml-server
    echo pip install -r requirements.txt
    echo echo.
    echo echo 启动 ML 服务器...
    echo echo 访问地址: http://localhost:8000
    echo echo API文档: http://localhost:8000/docs
    echo echo.
    echo python main.py
    echo pause
) > start-ml.bat

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 使用方法:
echo   1. 编辑 .env 文件配置数据库和API密钥
echo   2. 双击 start-dev.bat 启动开发模式
echo   3. 或双击 start-docker.bat 使用Docker启动
echo   4. 或双击 start-ml.bat 启动ML服务器
echo.
echo 文件说明:
echo   start-dev.bat    - 开发模式启动
echo   start-prod.bat   - 生产模式启动
echo   start-docker.bat - Docker模式启动
echo   start-ml.bat     - ML服务器启动
echo.
pause

@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          AI台风预测分析平台 - 一键安装脚本                  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: 检查 Node.js
echo [步骤 1/7] 检查 Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo [错误] 未检测到 Node.js！
    echo.
    echo 请按以下步骤安装:
    echo   1. 访问 https://nodejs.org/
    echo   2. 下载 LTS 版本
    echo   3. 运行安装程序
    echo   4. 重新运行此脚本
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo      找到 Node.js %NODE_VER%

:: 检查 npm
echo [步骤 2/7] 检查 npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 npm
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo      找到 npm %NPM_VER%

:: 创建 .env 文件
echo [步骤 3/7] 配置环境变量...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
    ) else (
        (
            echo DATABASE_URL="postgresql://postgres:password@localhost:5432/typhoon_platform"
            echo NEXTAUTH_SECRET="%RANDOM%%RANDOM%%RANDOM%%RANDOM%"
            echo NEXTAUTH_URL="http://localhost:3000"
            echo MIMO_API_KEY=""
            echo MIMO_API_URL="https://api.mimo.com/v1"
            echo NEXT_PUBLIC_MAPBOX_TOKEN=""
            echo REDIS_URL="redis://localhost:6379"
            echo ML_SERVER_URL="http://localhost:8000"
        ) > .env
    )
    echo      已创建 .env 配置文件
) else (
    echo      .env 文件已存在，跳过
)

:: 安装依赖
echo [步骤 4/7] 安装项目依赖（需要几分钟）...
echo.
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo.
    echo [错误] 依赖安装失败！
    echo 尝试运行: npm install --legacy-peer-deps --force
    pause
    exit /b 1
)
echo.
echo      依赖安装完成

:: 生成 Prisma Client
echo [步骤 5/7] 生成 Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo [警告] Prisma Client 生成失败，但可以继续
)
echo      Prisma Client 生成完成

:: 创建启动脚本
echo [步骤 6/7] 创建启动脚本...

:: 开发模式启动脚本
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo echo.
    echo echo ╔══════════════════════════════════════════════════════════════╗
    echo echo ║          AI台风预测分析平台 - 开发模式                      ║
    echo echo ╚══════════════════════════════════════════════════════════════╝
    echo echo.
    echo echo 启动开发服务器...
    echo echo 访问地址: http://localhost:3000
    echo echo 按 Ctrl+C 停止服务器
    echo echo.
    echo call npm run dev
    echo pause
) > start.bat

:: 生产模式启动脚本
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo echo.
    echo echo ╔══════════════════════════════════════════════════════════════╗
    echo echo ║          AI台风预测分析平台 - 生产模式                      ║
    echo echo ╚══════════════════════════════════════════════════════════════╝
    echo echo.
    echo echo 构建项目...
    echo call npm run build
    echo if errorlevel 1 ^(
    echo     echo 构建失败！
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

:: Docker 启动脚本
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo echo.
    echo echo ╔══════════════════════════════════════════════════════════════╗
    echo echo ║          AI台风预测分析平台 - Docker模式                    ║
    echo echo ╚══════════════════════════════════════════════════════════════╝
    echo echo.
    echo where docker ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo [错误] 未检测到 Docker！
    echo     echo 请安装 Docker Desktop: https://www.docker.com/products/docker-desktop
    echo     pause
    echo     exit /b 1
    echo ^)
    echo echo 启动 Docker 容器...
    echo docker-compose up -d
    echo echo.
    echo echo 启动完成！
    echo echo 访问地址: http://localhost:3000
    echo echo ML服务: http://localhost:8000
    echo echo.
    echo pause
) > docker-start.bat

:: ML 服务器启动脚本
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo echo.
    echo echo ╔══════════════════════════════════════════════════════════════╗
    echo echo ║          AI台风预测 - ML服务器                              ║
    echo echo ╚══════════════════════════════════════════════════════════════╝
    echo echo.
    echo where python ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo [错误] 未检测到 Python！
    echo     echo 请安装 Python 3.11+: https://www.python.org/downloads/
    echo     pause
    echo     exit /b 1
    echo ^)
    echo echo 安装 Python 依赖...
    echo cd src\python\ml-server
    echo pip install -r requirements.txt
    echo echo.
    echo echo 启动 ML 服务器...
    echo echo API文档: http://localhost:8000/docs
    echo echo.
    echo python main.py
    echo pause
) > start-ml.bat

echo      启动脚本创建完成

:: 完成
echo [步骤 7/7] 安装完成！
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                      安装成功！                             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 使用方法:
echo ────────────────────────────────────────────────────────────────
echo   双击 start.bat        启动开发模式（推荐）
echo   双击 start-prod.bat   启动生产模式
echo   双击 docker-start.bat 使用Docker启动
echo   双击 start-ml.bat     启动ML服务器
echo ────────────────────────────────────────────────────────────────
echo.
echo 首次使用:
echo   1. 双击 start.bat 启动项目
echo   2. 打开浏览器访问 http://localhost:3000
echo.
echo 如需配置数据库或API:
echo   编辑 .env 文件
echo.
echo 按任意键启动项目...
pause >nul

:: 自动启动
call start.bat

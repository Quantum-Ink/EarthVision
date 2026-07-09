@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    EarthVision 安装                         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: 检查 Node.js
echo [1/5] 检查 Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请安装: https://nodejs.org/
    pause
    exit /b 1
)
echo      Node.js 已就绪

:: 创建 .env
echo [2/5] 配置环境变量...
if not exist .env (
    copy .env.example .env >nul 2>&1
    if not exist .env (
        echo DATABASE_URL="postgresql://postgres:password@localhost:5432/earthvision" > .env
        echo NEXTAUTH_SECRET="%RANDOM%%RANDOM%" >> .env
        echo NEXTAUTH_URL="http://localhost:3000" >> .env
    )
    echo      已创建 .env
) else (
    echo      .env 已存在
)

:: 安装依赖
echo [3/5] 安装依赖...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo [错误] 安装失败
    pause
    exit /b 1
)

:: 生成 Prisma
echo [4/5] 生成 Prisma Client...
call npx prisma generate 2>nul

:: 创建启动脚本
echo [5/5] 创建启动脚本...

(
    echo @echo off
    echo echo 启动 EarthVision...
    echo echo 访问: http://localhost:3000
    echo call npm run dev
    echo pause
) > start.bat

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    安装完成！                               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 双击 start.bat 启动项目
echo 访问 http://localhost:3000
echo.
pause

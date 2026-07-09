@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          AI台风预测分析平台 - 创建安装包                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set PACKAGE_NAME=typhoon-platform-v1.0.0
set TEMP_DIR=typhoon-package-temp

:: 清理
if exist %TEMP_DIR% rmdir /s /q %TEMP_DIR%
if exist %PACKAGE_NAME%.zip del %PACKAGE_NAME%.zip

:: 创建临时目录
echo [1/4] 准备打包文件...
mkdir %TEMP_DIR%
mkdir %TEMP_DIR%\src
mkdir %TEMP_DIR%\prisma
mkdir %TEMP_DIR%\public

:: 复制核心文件
echo [2/4] 复制项目文件...

:: 源代码
xcopy /E /I /Y /Q src\app %TEMP_DIR%\src\app >nul 2>&1
xcopy /E /I /Y /Q src\components %TEMP_DIR%\src\components >nul 2>&1
xcopy /E /I /Y /Q src\services %TEMP_DIR%\src\services >nul 2>&1
xcopy /E /I /Y /Q src\lib %TEMP_DIR%\src\lib >nul 2>&1
xcopy /E /I /Y /Q src\hooks %TEMP_DIR%\src\hooks >nul 2>&1
xcopy /E /I /Y /Q src\types %TEMP_DIR%\src\types >nul 2>&1
xcopy /E /I /Y /Q src\python %TEMP_DIR%\src\python >nul 2>&1

:: Prisma
copy /Y prisma\schema.prisma %TEMP_DIR%\prisma\ >nul
copy /Y prisma\seed.ts %TEMP_DIR%\prisma\ >nul 2>nul

:: Public
xcopy /E /I /Y /Q public %TEMP_DIR%\public >nul 2>&1

:: 配置文件
copy /Y package.json %TEMP_DIR%\ >nul
copy /Y package-lock.json %TEMP_DIR%\ >nul
copy /Y tsconfig.json %TEMP_DIR%\ >nul
copy /Y next.config.ts %TEMP_DIR%\ >nul
copy /Y postcss.config.mjs %TEMP_DIR%\ >nul
copy /Y eslint.config.mjs %TEMP_DIR%\ >nul
copy /Y Dockerfile %TEMP_DIR%\ >nul
copy /Y docker-compose.yml %TEMP_DIR%\ >nul
copy /Y .dockerignore %TEMP_DIR%\ >nul
copy /Y .gitignore %TEMP_DIR%\ >nul

:: 安装脚本
copy /Y setup.bat %TEMP_DIR%\ >nul
copy /Y setup.sh %TEMP_DIR%\ >nul
copy /Y INSTALL.md %TEMP_DIR%\ >nul
copy /Y README.md %TEMP_DIR%\ >nul
copy /Y .env.example %TEMP_DIR%\ >nul

:: 创建 .env.example (如果不存在)
if not exist %TEMP_DIR%\.env.example (
    (
        echo # ========================================
        echo # AI台风预测分析平台 - 环境变量配置
        echo # ========================================
        echo.
        echo # 数据库配置 ^(PostgreSQL^)
        echo DATABASE_URL="postgresql://postgres:password@localhost:5432/typhoon_platform"
        echo.
        echo # NextAuth 配置
        echo NEXTAUTH_SECRET="your-secret-key-change-this-to-random-string"
        echo NEXTAUTH_URL="http://localhost:3000"
        echo.
        echo # MIMO API 配置 ^(可选 - AI分析功能^)
        echo MIMO_API_KEY=""
        echo MIMO_API_URL="https://api.mimo.com/v1"
        echo.
        echo # Mapbox 配置 ^(可选 - 地图功能^)
        echo NEXT_PUBLIC_MAPBOX_TOKEN=""
        echo.
        echo # Redis 配置 ^(可选 - 缓存^)
        echo REDIS_URL="redis://localhost:6379"
        echo.
        echo # ML Server 配置 ^(可选 - 机器学习服务^)
        echo ML_SERVER_URL="http://localhost:8000"
    ) > %TEMP_DIR%\.env.example
)

:: 创建 README
if not exist %TEMP_DIR%\README.md (
    (
        echo # AI台风预测分析平台
        echo.
        echo 基于人工智能的台风路径预测与风险分析平台。
        echo.
        echo ## 快速开始
        echo.
        echo ### Windows
        echo ```bash
        echo # 双击 setup.bat 或运行:
        echo setup.bat
        echo ```
        echo.
        echo ### Linux/macOS
        echo ```bash
        echo chmod +x setup.sh
        echo ./setup.sh
        echo ```
        echo.
        echo ### 启动项目
        echo ```bash
        echo # 开发模式
        echo start.bat  # Windows
        echo ./start.sh # Linux/macOS
        echo.
        echo # 访问 http://localhost:3000
        echo ```
        echo.
        echo ## 功能特性
        echo.
        echo - 多源数据采集 ^(JTWC, CMA, JMA, ECMWF, NOAA^)
        echo - 数据融合 ^(加权平均, 卡尔曼滤波, 贝叶斯融合^)
        echo - Monte Carlo 概率模拟
        echo - AI 智能分析
        echo - 专业预报图导出
        echo - 历史数据查询
        echo.
        echo ## 技术栈
        echo.
        echo - Next.js 15 + React 19
        echo - TypeScript + TailwindCSS
        echo - PostgreSQL + Redis
        echo - Python ML Server
        echo.
        echo ## 详细文档
        echo.
        echo 查看 [INSTALL.md](./INSTALL.md) 获取详细安装指南。
    ) > %TEMP_DIR%\README.md
)

:: 创建压缩包
echo [3/4] 创建压缩包...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%PACKAGE_NAME%.zip' -Force"

:: 清理临时文件
echo [4/4] 清理临时文件...
rmdir /s /q %TEMP_DIR%

:: 完成
if exist %PACKAGE_NAME%.zip (
    for %%A in (%PACKAGE_NAME%.zip) do set ZIP_SIZE=%%~zA
    set /a ZIP_SIZE_KB=!ZIP_SIZE! / 1024

    echo.
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║                      打包完成！                             ║
    echo ╚══════════════════════════════════════════════════════════════╝
    echo.
    echo 文件信息:
    echo   文件名: %PACKAGE_NAME%.zip
    echo   大小: !ZIP_SIZE_KB! KB
    echo.
    echo 使用方法:
    echo   1. 解压 %PACKAGE_NAME%.zip
    echo   2. Windows: 双击 setup.bat
    echo   3. Linux/macOS: ./setup.sh
    echo   4. 启动后访问 http://localhost:3000
    echo.
) else (
    echo [错误] 打包失败！
)

pause

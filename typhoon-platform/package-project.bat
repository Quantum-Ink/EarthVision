@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   AI台风预测分析平台 - 打包脚本
echo ========================================
echo.

:: 设置打包目录
set PACKAGE_DIR=typhoon-platform-release
set PACKAGE_NAME=typhoon-platform-v1.0.0

:: 清理旧的打包目录
if exist %PACKAGE_DIR% (
    echo 清理旧的打包目录...
    rmdir /s /q %PACKAGE_DIR%
)

:: 创建打包目录
echo [1/5] 创建打包目录...
mkdir %PACKAGE_DIR%

:: 复制必要文件
echo [2/5] 复制项目文件...

:: 复制源代码
xcopy /E /I /Y src %PACKAGE_DIR%\src >nul
xcopy /E /I /Y prisma %PACKAGE_DIR%\prisma >nul
xcopy /E /I /Y public %PACKAGE_DIR%\public >nul

:: 复制配置文件
copy /Y package.json %PACKAGE_DIR%\ >nul
copy /Y package-lock.json %PACKAGE_DIR%\ >nul
copy /Y tsconfig.json %PACKAGE_DIR%\ >nul
copy /Y next.config.ts %PACKAGE_DIR%\ >nul
copy /Y postcss.config.mjs %PACKAGE_DIR%\ >nul
copy /Y eslint.config.mjs %PACKAGE_DIR%\ >nul
copy /Y .env.example %PACKAGE_DIR%\ >nul 2>nul
if not exist %PACKAGE_DIR%\.env.example (
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
    ) > %PACKAGE_DIR%\.env.example
)

:: 复制安装脚本
copy /Y install.bat %PACKAGE_DIR%\ >nul
copy /Y install.sh %PACKAGE_DIR%\ >nul
copy /Y INSTALL.md %PACKAGE_DIR%\ >nul
copy /Y README.md %PACKAGE_DIR%\ >nul

:: 复制启动脚本
copy /Y start-dev.bat %PACKAGE_DIR%\ >nul
copy /Y start-prod.bat %PACKAGE_DIR%\ >nul
copy /Y start-docker.bat %PACKAGE_DIR%\ >nul
copy /Y start-ml.bat %PACKAGE_DIR%\ >nul

:: 复制 Docker 配置
copy /Y Dockerfile %PACKAGE_DIR%\ >nul
copy /Y docker-compose.yml %PACKAGE_DIR%\ >nul
copy /Y .dockerignore %PACKAGE_DIR%\ >nul

:: 创建 .gitignore
echo [3/5] 创建 .gitignore...
(
    echo # Dependencies
    echo node_modules/
    echo .pnp/
    echo .pnp.js
    echo.
    echo # Testing
    echo coverage/
    echo.
    echo # Next.js
    echo .next/
    echo out/
    echo.
    echo # Production
    echo build/
    echo.
    echo # Misc
    echo .DS_Store
    echo *.pem
    echo.
    echo # Debug
    echo npm-debug.log*
    echo yarn-debug.log*
    echo yarn-error.log*
    echo.
    echo # Local env files
    echo .env
    echo .env*.local
    echo.
    echo # Vercel
    echo .vercel
    echo.
    echo # TypeScript
    echo *.tsbuildinfo
    echo next-env.d.ts
    echo.
    echo # Python
    echo __pycache__/
    echo *.py[cod]
    echo *$py.class
    echo .Python
    echo venv/
    echo.
    echo # ML Models
    echo src/python/ml-server/saved_models/
    echo.
    echo # IDE
    echo .idea/
    echo .vscode/
    echo *.swp
    echo *.swo
) > %PACKAGE_DIR%\.gitignore

:: 创建 ZIP 压缩包
echo [4/5] 创建压缩包...
if exist %PACKAGE_NAME%.zip (
    del %PACKAGE_NAME%.zip
)

:: 使用 PowerShell 创建 ZIP
powershell -Command "Compress-Archive -Path '%PACKAGE_DIR%\*' -DestinationPath '%PACKAGE_NAME%.zip' -Force"

if exist %PACKAGE_NAME%.zip (
    echo [成功] 已创建压缩包: %PACKAGE_NAME%.zip
) else (
    echo [错误] 压缩包创建失败
)

:: 计算包大小
echo [5/5] 统计打包信息...
for %%A in (%PACKAGE_NAME%.zip) do set ZIP_SIZE=%%~zA
set /a ZIP_SIZE_MB=%ZIP_SIZE% / 1048576

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo 包信息:
echo   文件名: %PACKAGE_NAME%.zip
echo   大小: 约 %ZIP_SIZE_MB% MB
echo.
echo 包含内容:
echo   - 完整源代码
echo   - 安装脚本 (install.bat / install.sh)
echo   - 启动脚本 (start-*.bat)
echo   - Docker 配置
echo   - 安装文档 (INSTALL.md)
echo   - 环境变量模板 (.env.example)
echo.
echo 使用方法:
echo   1. 解压 %PACKAGE_NAME%.zip
echo   2. Windows: 双击 install.bat
echo   3. Linux/macOS: ./install.sh
echo   4. 按照 INSTALL.md 配置环境
echo   5. 启动项目
echo.
pause

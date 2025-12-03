@echo off
chcp 65001 >nul
echo ========================================
echo    图生视频服务启动脚本
echo ========================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "node_modules\" (
    echo [提示] 检测到依赖未安装，正在安装...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

REM 检查端口是否被占用
echo [检查] 检测端口 3000 是否被占用...
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo [警告] 端口 3000 已被占用，正在尝试关闭占用进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        taskkill /F /PID %%a >nul 2>nul
    )
    timeout /t 2 >nul
)

echo.
echo [启动] 正在启动开发服务器...
echo.
echo ----------------------------------------
echo  服务地址：
echo  - 前端页面：http://localhost:3000/webapp
echo  - 健康检查：http://localhost:3000/health
echo  - 开发 API：http://localhost:3000/dev/api
echo ----------------------------------------
echo.
echo [提示] 请保持此窗口打开，关闭窗口将停止服务
echo [提示] 按 Ctrl+C 可以停止服务
echo.

REM 启动服务
node start-dev.js

REM 如果服务异常退出
echo.
echo [错误] 服务已停止，请检查上方错误信息
pause

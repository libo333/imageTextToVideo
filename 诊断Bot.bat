@echo off
chcp 65001 >nul
echo ========================================
echo    Telegram Bot 诊断工具
echo ========================================
echo.

REM 读取环境变量
for /f "tokens=1,2 delims==" %%a in (.env.dev) do (
    if "%%a"=="TELEGRAM_BOT_TOKEN" set BOT_TOKEN=%%b
)

echo [1] 检查 Bot Token...
echo Token: %BOT_TOKEN%
echo.

echo [2] 测试 Telegram API 连接...
curl -s "https://api.telegram.org/bot%BOT_TOKEN%/getMe"
echo.
echo.

echo [3] 检查 Webhook 状态...
curl -s "https://api.telegram.org/bot%BOT_TOKEN%/getWebhookInfo"
echo.
echo.

echo [4] 检查是否能访问 Telegram...
ping -n 2 api.telegram.org
echo.

echo ========================================
echo 诊断完成
echo ========================================
echo.
echo 如果上述测试都正常，但 Bot 仍无法启动，可能是：
echo 1. 防火墙或代理设置阻止了连接
echo 2. 需要配置代理才能访问 Telegram
echo 3. Bot Token 在 Telegram 服务器端有问题
echo.
pause

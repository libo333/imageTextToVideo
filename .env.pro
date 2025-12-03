# ============================================
# 生产环境配置
# ============================================
# 此文件不会被提交到 Git（已在 .gitignore 中）
# ⚠️ 请填写真实的配置值后再部署

# Telegram Bot Token（从 @BotFather 获取）
TELEGRAM_BOT_TOKEN=8239286840:AAFNbFMHfyo0rJiLakfrKwF41jzevpXeGso

# Web App 公网 HTTPS 地址（⚠️ 必须是 HTTPS）
WEBAPP_URL=https://operations-davis-equations-premiere.trycloudflare.com/webapp

# 服务器配置
PORT=3000
NODE_ENV=production
API_BASE_URL=http://localhost:3000

# ComfyUI 服务器配置
# ⚠️ 根据你的实际 ComfyUI 服务器地址修改
COMFYUI_URL=http://192.168.20.59:8188
COMFYUI_API_URL=http://localhost:3001
SVD_API_URL=http://localhost:3002
SVD_API_PORT=3002
COGVIDEO_API_URL=http://localhost:3003
COGVIDEO_API_PORT=3003

# 输出目录
OUTPUT_DIR=./output

# 可选：阿里云 API（如果使用）
# ALIYUN_API_KEY=your_aliyun_api_key
# ALIYUN_REGION=beijing

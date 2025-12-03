// Render.com 云端启动文件
// 此文件专为 Render.com 部署优化

require('dotenv').config();
const { startServer } = require('./server');
const fs = require('fs');
const path = require('path');

console.log('🌐 Starting Telegram Bot on Render.com...');
console.log('='.repeat(50));
console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`🔌 Port: ${process.env.PORT || 3000}`);
console.log(`🌍 Region: ${process.env.RENDER_REGION || 'unknown'}`);
console.log('='.repeat(50));

// 环境检查
function checkEnvironment() {
    const required = [
        'TELEGRAM_BOT_TOKEN',
        'WEBAPP_URL',
        'API_BASE_URL'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('❌ 缺少必需的环境变量:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\n💡 请在 Render Dashboard 的 Environment 中配置这些变量');
        console.error('📖 详见: docs/deploy/render-deployment-guide.md');
        process.exit(1);
    }

    console.log('✅ 环境变量检查通过');
}

// 创建必需目录
function ensureDirectories() {
    const dirs = [
        './data',
        './temp',
        './output'
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 创建目录: ${dir}`);
        }
    });

    console.log('✅ 目录检查完成');
}

// ComfyUI 连接检查 (可选)
async function checkComfyUI() {
    const comfyuiUrl = process.env.COMFYUI_URL;

    if (!comfyuiUrl) {
        console.warn('⚠️  COMFYUI_URL 未配置');
        console.warn('   视频生成功能将无法使用');
        console.warn('   请配置 Cloudflare Tunnel 后设置此变量');
        console.warn('   📖 详见: docs/deploy/cloudflare-tunnel-guide.md');
        return;
    }

    console.log(`🔍 检查 ComfyUI 连接: ${comfyuiUrl}`);

    try {
        const axios = require('axios');
        const response = await axios.get(`${comfyuiUrl}/system_stats`, {
            timeout: 5000
        });

        if (response.status === 200) {
            console.log('✅ ComfyUI 连接成功');
            console.log(`   GPU: ${response.data?.system?.vram_total || 'unknown'}`);
        }
    } catch (error) {
        console.warn('⚠️  无法连接到 ComfyUI');
        console.warn(`   错误: ${error.message}`);
        console.warn('   请确保:');
        console.warn('   1. 本地 ComfyUI 正在运行');
        console.warn('   2. Cloudflare Tunnel 正在运行');
        console.warn('   3. COMFYUI_URL 配置正确');
    }
}

// 主启动流程
async function main() {
    try {
        // 1. 检查环境变量
        checkEnvironment();

        // 2. 创建必需目录
        ensureDirectories();

        // 3. 检查 ComfyUI (非阻塞)
        await checkComfyUI();

        console.log('\n' + '='.repeat(50));
        console.log('🚀 启动 Web App 服务器...');
        console.log('='.repeat(50) + '\n');

        // 4. 启动服务器 (不启动 Bot,仅 Web App)
        startServer(null);

        console.log('\n✅ 服务器启动成功!');
        console.log(`📱 Web App: ${process.env.WEBAPP_URL || 'https://your-app.onrender.com/webapp'}`);
        console.log(`🔗 API: ${process.env.API_BASE_URL || 'https://your-app.onrender.com'}/api`);
        console.log(`💚 Health Check: ${process.env.API_BASE_URL || 'https://your-app.onrender.com'}/health`);

        console.log('\n📝 注意:');
        console.log('   - Bot 功能未在云端启动(避免重复运行)');
        console.log('   - 仅提供 Web App 界面和 API 服务');
        console.log('   - 视频生成通过本地 ComfyUI (Cloudflare Tunnel)');

        console.log('\n📖 部署文档: docs/deploy/render-deployment-guide.md');

    } catch (error) {
        console.error('❌ 启动失败:', error);
        console.error('\n💡 故障排查:');
        console.error('   1. 检查 Render Logs 中的详细错误信息');
        console.error('   2. 确认所有环境变量已正确配置');
        console.error('   3. 查看部署文档: docs/deploy/render-deployment-guide.md');
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('\n🛑 收到 SIGTERM 信号 (Render 重启/关闭)');
    console.log('   正在优雅关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 收到 SIGINT 信号');
    console.log('   正在关闭服务器...');
    process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的 Promise 拒绝:', reason);
    process.exit(1);
});

// 启动
main();

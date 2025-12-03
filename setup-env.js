#!/usr/bin/env node

/**
 * 环境变量配置脚本
 * 用于快速创建 .env.dev 和 .env.pro 文件
 * 
 * 使用方法：
 * node setup-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function writeEnvFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 已创建: ${filePath}`);
}

async function setupEnv() {
    console.log('📝 环境变量配置向导\n');
    console.log('此脚本将帮助你创建 .env.dev 和 .env.pro 文件\n');

    // 检查是否已存在文件
    const envDevExists = fs.existsSync('.env.dev');
    const envProExists = fs.existsSync('.env.pro');

    if (envDevExists || envProExists) {
        const overwrite = await question('检测到已存在的 .env 文件，是否覆盖？(y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
            console.log('已取消操作');
            rl.close();
            return;
        }
    }

    console.log('\n=== 开发环境配置 (.env.dev) ===\n');

    const devTelegramToken = await question('Telegram Bot Token (开发环境，可直接回车使用示例值): ');
    const devWebappUrl = await question('Web App URL (开发环境，默认 http://localhost:3000/webapp): ') || 'http://localhost:3000/webapp';
    const devPort = await question('服务器端口 (默认 3000): ') || '3000';
    const devComfyUIUrl = await question('ComfyUI 服务器地址 (默认 http://localhost:8188): ') || 'http://localhost:8188';

    console.log('\n=== 生产环境配置 (.env.pro) ===\n');

    const proTelegramToken = await question('Telegram Bot Token (生产环境): ');
    if (!proTelegramToken) {
        console.log('⚠️  警告：生产环境 Bot Token 不能为空！');
        rl.close();
        return;
    }

    const proWebappUrl = await question('Web App URL (生产环境，必须是 HTTPS): ');
    if (!proWebappUrl || !proWebappUrl.startsWith('https://')) {
        console.log('⚠️  警告：生产环境 Web App URL 必须是 HTTPS 地址！');
        const continueAnyway = await question('是否继续？(y/N): ');
        if (continueAnyway.toLowerCase() !== 'y') {
            rl.close();
            return;
        }
    }

    const proPort = await question('服务器端口 (默认 3333): ') || '3333';
    const proComfyUIUrl = await question('ComfyUI 服务器地址: ') || 'http://localhost:8188';

    // 生成 .env.dev
    const envDevContent = `# ============================================
# 开发环境配置
# ============================================
# 此文件不会被提交到 Git（已在 .gitignore 中）

# Telegram Bot Token（从 @BotFather 获取）
TELEGRAM_BOT_TOKEN=${devTelegramToken || 'your_telegram_bot_token_here'}

# Web App 地址（开发环境可以使用 localhost）
WEBAPP_URL=${devWebappUrl}

# 服务器配置
PORT=${devPort}
NODE_ENV=development
API_BASE_URL=http://localhost:${devPort}

# ComfyUI 服务器配置
COMFYUI_URL=${devComfyUIUrl}
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
`;

    // 生成 .env.pro
    const envProContent = `# ============================================
# 生产环境配置
# ============================================
# 此文件不会被提交到 Git（已在 .gitignore 中）
# ⚠️ 请填写真实的配置值后再部署

# Telegram Bot Token（从 @BotFather 获取）
TELEGRAM_BOT_TOKEN=${proTelegramToken}

# Web App 公网 HTTPS 地址（⚠️ 必须是 HTTPS）
WEBAPP_URL=${proWebappUrl || 'https://your-domain.com/webapp'}

# 服务器配置
PORT=${proPort}
NODE_ENV=production
API_BASE_URL=http://localhost:${proPort}

# ComfyUI 服务器配置
# ⚠️ 根据你的实际 ComfyUI 服务器地址修改
COMFYUI_URL=${proComfyUIUrl}
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
`;

    // 写入文件
    writeEnvFile('.env.dev', envDevContent);
    writeEnvFile('.env.pro', envProContent);

    console.log('\n✅ 环境变量配置完成！\n');
    console.log('📝 下一步：');
    console.log('1. 检查 .env.dev 和 .env.pro 文件，确保所有配置正确');
    console.log('2. 如果使用开发环境，运行: npm run dev');
    console.log('3. 如果使用生产环境，运行: npm run prod');
    console.log('\n📖 更多信息请参考: docs/ENV_CONFIG_GUIDE.md\n');

    rl.close();
}

// 运行配置向导
setupEnv().catch(error => {
    console.error('❌ 配置失败:', error);
    rl.close();
    process.exit(1);
});


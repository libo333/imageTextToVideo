const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 导入路由
const uploadRouter = require('./api/upload');
const taskRouter = require('./api/task');
const UserManager = require('./user-manager');
const userManager = new UserManager();

// Bot 实例（供 API 使用）
let bot = null;

// ==================== 中间件 ====================

// CORS 配置
app.use(cors({
    origin: [
        'https://web.telegram.org',
        'https://k.web.telegram.org',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    credentials: true
}));

// 解析 JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务（Web App）
app.use('/webapp', express.static(path.join(__dirname, 'webapp')));

// 静态文件服务（临时图片）
// 这样上传的图片可以通过 https://your-domain/temp/filename.jpg 访问
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// Telegram 数据验证中间件
function validateTelegramData(req, res, next) {
    const initData = req.headers['x-telegram-init-data'];

    if (!initData) {
        return res.status(401).json({
            success: false,
            error: '缺少 Telegram 验证数据'
        });
    }

    try {
        // 解析 initData
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        // 按键名排序并构建验证字符串
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // 计算签名
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(process.env.TELEGRAM_BOT_TOKEN)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        // 验证签名
        if (calculatedHash !== hash) {
            return res.status(401).json({
                success: false,
                error: 'Telegram 数据验证失败'
            });
        }

        // 解析用户信息
        const userParam = urlParams.get('user');
        if (userParam) {
            req.telegramUser = JSON.parse(decodeURIComponent(userParam));
        }

        next();

    } catch (error) {
        console.error('[Telegram Validation Error]', error);
        return res.status(401).json({
            success: false,
            error: '无效的 Telegram 数据'
        });
    }
}

// ==================== 路由 ====================

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Web App 首页
app.get('/', (req, res) => {
    res.redirect('/webapp');
});

app.get('/webapp', (req, res) => {
    res.sendFile(path.join(__dirname, 'webapp', 'index.html'));
});

// API 路由（需要验证）
app.use('/api', validateTelegramData, uploadRouter);
app.use('/api', validateTelegramData, taskRouter);

// 开发环境：跳过验证的 API（仅用于测试）
if (process.env.NODE_ENV === 'development') {
    console.log('📌 注册开发环境路由...');

    // 测试路由
    app.get('/dev/api/test', (req, res) => {
        console.log('✅ 测试路由被访问');
        res.json({ message: 'Test route works!' });
    });

    // 开发环境的用户API（不需要验证）- 需要在其他路由之前注册
    app.get('/dev/api/user/:userId/check', (req, res) => {
        console.log('✅ 用户检查路由被访问:', req.params.userId);
        try {
            const { userId } = req.params;
            const check = userManager.canUseService(userId);
            res.json(check);
        } catch (error) {
            console.error('检查用户权限失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
    });

    app.get('/dev/api/user/:userId', (req, res) => {
        console.log('✅ 用户信息路由被访问:', req.params.userId);
        try {
            const { userId } = req.params;
            const { username, firstName, lastName } = req.query;

            let stats = userManager.getUserStats(userId);

            if (!stats) {
                // 注册新用户时传递用户信息
                const userInfo = {};
                if (username) userInfo.username = username;
                if (firstName) userInfo.firstName = firstName;
                if (lastName) userInfo.lastName = lastName;

                console.log('新用户注册，用户信息:', userInfo);
                userManager.registerUser(userId, userInfo);

                stats = userManager.getUserStats(userId);
                const todayUsage = [];
                return res.json({
                    ...stats,
                    todayUsage
                });
            }

            // 如果已有用户，但信息不完整，更新用户信息
            if ((username && !stats.username) || (firstName && !stats.firstName)) {
                console.log('更新用户信息');
                const updates = {};
                if (username && !stats.username) updates.username = username;
                if (firstName && !stats.firstName) updates.firstName = firstName;
                if (lastName && !stats.lastName) updates.lastName = lastName;

                userManager.updateUserInfo(userId, updates);
                stats = userManager.getUserStats(userId);
            }

            const todayUsage = userManager.getTodayUsage(userId);
            res.json({
                ...stats,
                todayUsage: todayUsage
            });
        } catch (error) {
            console.error('获取用户信息失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
    });

    // 其他开发环境路由
    app.use('/dev/api', uploadRouter);
    app.use('/dev/api', taskRouter);
}

// ==================== 错误处理 ====================

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '路径不存在'
    });
});

// 全局错误处理
app.use((error, req, res, next) => {
    console.error('[Server Error]', error);

    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
});

// ==================== 启动服务器 ====================

function startServer(botInstance) {
    // 保存 Bot 实例供 API 使用
    bot = botInstance;
    module.exports.bot = bot;

    app.listen(port, () => {
        console.log(`🚀 Web App Server started on port ${port}`);
        console.log(`📱 Web App URL: http://localhost:${port}/webapp`);
        console.log(`🔗 API Base URL: http://localhost:${port}/api`);

        if (process.env.NODE_ENV === 'development') {
            console.log(`🛠️  Dev API URL: http://localhost:${port}/dev/api`);
        }
    });

    return app;
}

// 如果直接运行这个文件（用于测试）
if (require.main === module) {
    console.log('⚠️  Starting server in standalone mode (without bot)');
    startServer(null);
}

module.exports = {
    app,
    startServer,
    bot: null
};
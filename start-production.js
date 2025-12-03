// 生产环境启动文件
require('dotenv').config();

const { startServer } = require('./server');

console.log('🌐 启动生产环境 Web App 服务器...');
console.log(`📍 环境: ${process.env.NODE_ENV || 'production'}`);
console.log(`🔌 端口: ${process.env.PORT || 3333}`);

// 不启动 Bot，直接启动服务器（因为 Telegram API 在中国可能无法访问）
startServer(null);

console.log('✅ 生产环境 Web App 服务器已启动！');
console.log('📝 注意：Bot 功能未启动，仅提供 Web App 界面和 API');

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('🛑 收到 SIGTERM 信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 收到 SIGINT 信号，正在关闭服务器...');
    process.exit(0);
});

// 仅启动 Web App 服务器（不启动 Bot）
require('dotenv').config({ path: '.env.dev' });

const { startServer } = require('./server');

console.log('🌐 启动 Web App 服务器（不启动 Bot）...');

// 不启动 Bot，直接启动服务器
startServer(null);

console.log('✅ Web App 服务器已启动！');
console.log('📝 注意：Bot 功能未启动，仅提供 Web App 界面');

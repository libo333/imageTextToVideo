// 测试 Bot 连接的简单脚本
require('dotenv').config({ path: '.env.dev' });
const { Telegraf } = require('telegraf');

console.log('开始测试 Bot 连接...');
console.log('Token 前缀:', process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) + '...' : 'No token');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// 简单的启动命令
bot.start((ctx) => {
  console.log('收到 /start 命令');
  ctx.reply('Bot 正在运行！');
});

// 尝试启动 Bot
console.log('尝试启动 Bot...');

bot.launch()
  .then(() => {
    console.log('✅ Bot 启动成功！');
  })
  .catch(err => {
    console.log('❌ Bot 启动失败:', err.message);
    console.error('详细错误:', err);
  });

// 设置超时检查
setTimeout(() => {
  console.log('⏰ 10秒超时 - 如果没有看到成功消息，可能存在网络问题');
}, 10000);

// 优雅关闭
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
// 如果没有从启动脚本加载，则使用默认 .env
if (!process.env.TELEGRAM_BOT_TOKEN) {
    require('dotenv').config();
}
const { Telegraf } = require('telegraf');
const { getAvailableMotions, isMotionSupported, getCategorizedMotions } = require('./model-configs');
const UserManager = require('./user-manager');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// 初始化 Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// 初始化用户管理器
const userManager = new UserManager();

// 存储用户会话数据
const userSessions = new Map();

// 默认模型设置（ComfyUI AnimateDiff）
const DEFAULT_MODEL = 'ComfyUI AnimateDiff';

// API 基础地址
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const API_PREFIX = '/api';

// 模型名称映射（Bot 内部名称 -> API 模型名称）
const MODEL_MAP = {
  'ComfyUI AnimateDiff': 'comfyui-animatediff',
  'AnimateDiff': 'comfyui-animatediff',
  'SVD': 'comfyui-svd',
  'CogVideoX': 'comfyui-cogvideo',
  'CogVideoX 1.5': 'comfyui-cogvideo'
};

// 启动命令
bot.start((ctx) => {
  const userId = ctx.from.id;
  const webAppUrl = process.env.WEBAPP_URL || 'https://your-domain.com/webapp';

  // 注册用户
  userManager.registerUser(userId, {
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name
  });

  // 获取用户统计
  const stats = userManager.getUserStats(userId);
  const membershipEmoji = {
    'free': '🆓',
    'monthly': '⭐',
    'yearly': '💎'
  };

  let statsMessage = `\n\n📊 您的使用情况：\n`;
  statsMessage += `${membershipEmoji[stats.membership.type]} ${stats.membership.typeName}\n`;
  statsMessage += `📅 今日已使用：${stats.todayCount}/${stats.dailyLimit} 次\n`;
  statsMessage += `✨ 剩余次数：${stats.remaining} 次\n`;

  if (stats.membership.isActive && stats.membership.daysLeft !== undefined) {
    statsMessage += `⏰ 会员剩余：${stats.membership.daysLeft} 天\n`;
  }

  ctx.reply(
    '欢迎使用图生视频 Bot！\n\n' +
    '🎬 点击下方按钮打开创作工具，享受可视化操作体验！\n\n' +
    '或者直接发送图片给我，我会将它转换成视频。' +
    statsMessage +
    '\n\n可用命令：\n' +
    '/start - 显示此帮助信息\n' +
    '/stats - 查看使用统计\n' +
    '/membership - 会员中心\n' +
    '/help - 显示帮助信息\n' +
    '/models - 选择AI模型\n' +
    '/motions - 查看可用的运动效果\n' +
    '/cancel - 取消当前操作',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎬 打开创作工具',
              web_app: { url: webAppUrl }
            }
          ],
          [
            { text: '📊 使用统计', callback_data: 'stats' },
            { text: '⭐ 会员中心', callback_data: 'membership' }
          ],
          [
            { text: '📖 查看帮助', callback_data: 'help' }
          ]
        ]
      }
    }
  );
});

// 帮助命令
bot.help((ctx) => {
  ctx.reply(
    '使用说明：\n\n' +
    '1. 发送一张图片给我\n' +
    '2. 我会询问你是否需要添加提示词或选择运动效果\n' +
    '3. 等待视频生成完成（通常需要1-3分钟）\n' +
    '4. 接收生成的视频\n\n' +
    '提示词示例：\n' +
    '- 一个人在海边漫步，夕阳西下\n' +
    '- 古装美女在竹林中起舞\n' +
    '- 科幻场景，未来城市，霓虹灯闪烁\n\n' +
    '命令：\n' +
    '/stats - 查看使用统计\n' +
    '/membership - 会员中心\n' +
    '/models - 选择AI模型\n' +
    '/motions - 查看可用的运动效果\n' +
    '/cancel - 取消当前操作'
  );
});

// 统计信息命令
bot.command('stats', (ctx) => {
  const userId = ctx.from.id;
  const stats = userManager.getUserStats(userId);

  if (!stats) {
    ctx.reply('获取统计信息失败，请重试。');
    return;
  }

  const membershipEmoji = {
    'free': '🆓',
    'monthly': '⭐',
    'yearly': '💎'
  };

  let message = `📊 使用统计\n\n`;
  message += `👤 用户：${stats.firstName || stats.username || '未知'}\n`;
  message += `${membershipEmoji[stats.membership.type]} 会员类型：${stats.membership.typeName}\n\n`;
  message += `📅 今日使用情况：\n`;
  message += `   已使用：${stats.todayCount} 次\n`;
  message += `   每日限额：${stats.dailyLimit} 次\n`;
  message += `   剩余次数：${stats.remaining} 次\n\n`;
  message += `📈 累计生成：${stats.totalUsage} 次\n`;

  if (stats.membership.isActive && stats.membership.daysLeft !== undefined) {
    message += `\n⏰ 会员有效期：剩余 ${stats.membership.daysLeft} 天\n`;
    message += `   到期日期：${new Date(stats.membership.expiry).toLocaleDateString('zh-CN')}`;
  } else {
    message += `\n💡 升级会员可获得更多使用次数！\n`;
    message += `   发送 /membership 查看会员套餐`;
  }

  ctx.reply(message);
});

// 会员中心命令
bot.command('membership', (ctx) => {
  const userId = ctx.from.id;
  const stats = userManager.getUserStats(userId);

  if (!stats) {
    ctx.reply('获取用户信息失败，请重试。');
    return;
  }

  let message = `⭐ 会员中心\n\n`;
  message += `当前状态：${stats.membership.typeName}\n`;

  if (stats.membership.isActive) {
    message += `到期时间：${new Date(stats.membership.expiry).toLocaleDateString('zh-CN')}\n`;
    message += `剩余天数：${stats.membership.daysLeft} 天\n`;
  }

  message += `\n💎 会员套餐：\n\n`;
  message += `🆓 免费用户\n`;
  message += `   • 每日 3 次免费生成\n`;
  message += `   • 支持所有模型和特效\n\n`;
  message += `⭐ 月度会员 (¥29.9/月)\n`;
  message += `   • 每日 100 次生成\n`;
  message += `   • 优先处理队列\n`;
  message += `   • 支持所有功能\n\n`;
  message += `💎 年度会员 (¥199/年)\n`;
  message += `   • 每日 200 次生成\n`;
  message += `   • 最高优先级\n`;
  message += `   • 专属客服支持\n`;
  message += `   • 新功能抢先体验\n\n`;
  message += `📱 如需购买会员，请联系客服。`;

  ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💬 联系客服', url: 'https://t.me/your_support_bot' },
          { text: '📊 查看统计', callback_data: 'stats' }
        ]
      ]
    }
  });
});

// 模型选择命令
bot.command('models', (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions.get(userId) || {};
  const currentModel = session.selectedModel || DEFAULT_MODEL;

  let message = `🤖 当前使用的AI模型：\n\n`;
  message += `✅ ${currentModel}\n\n`;
  message += `📊 模型信息：\n`;
  message += `• 基础模型：realisticVisionV20（写实风格）\n`;
  message += `• 分辨率：768×768\n`;
  message += `• 视频时长：3秒（24帧@8fps）\n`;
  message += `• 运动效果：8种动态效果\n`;
  message += `• 成本：$0.08/次\n\n`;
  message += `🎬 支持的运动效果：\n`;
  message += `• zoom-in / zoom-out - 缩放\n`;
  message += `• pan-left / pan-right - 左右平移\n`;
  message += `• pan-up / pan-down - 上下平移\n`;
  message += `• roll-clockwise / roll-anticlockwise - 旋转\n\n`;
  message += `💡 使用 /motions 查看所有运动效果`;

  ctx.reply(message);
});

// 运动效果列表
bot.command('motions', (ctx) => {
  const userId = ctx.from.id;

  let message = `🎬 ComfyUI 运动效果：\n\n`;

  // 获取 AnimateDiff 运动效果
  const animateDiffMotions = getAvailableMotions('animatediff');
  const categorizedMotions = getCategorizedMotions('animatediff');

  message += `📱 AnimateDiff (${animateDiffMotions.length}种)：\n`;

  // 按分类显示
  for (const [category, motions] of Object.entries(categorizedMotions)) {
    if (motions.length > 0) {
      message += `\n${category}:\n`;
      motions.forEach(motion => {
        message += `• ${motion}\n`;
      });
    }
  }

  message += `\n🎞️ SVD (Stable Video Diffusion)：\n`;
  message += `• 运动强度：1-255 (数值越高，运动越强烈)\n`;
  message += `• 默认值：100\n\n`;

  message += `💡 使用方法：\n`;
  message += `发送图片后，选择"使用运动效果"，然后输入上述运动效果名称即可\n\n`;

  message += `📖 示例：zoom-in, pan-left, roll-clockwise`;

  ctx.reply(message);
});

// 取消命令
bot.command('cancel', (ctx) => {
  const userId = ctx.from.id;
  if (userSessions.has(userId)) {
    userSessions.delete(userId);
    ctx.reply('操作已取消。你可以重新发送图片开始新的任务。');
  } else {
    ctx.reply('当前没有进行中的操作。');
  }
});

// 处理图片消息
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;

  try {
    // 检查用户是否可以使用服务
    const usageCheck = userManager.canUseService(userId);

    if (!usageCheck.allowed) {
      const membershipEmoji = {
        'free': '🆓',
        'monthly': '⭐',
        'yearly': '💎'
      };

      let message = `${membershipEmoji[usageCheck.membershipType]} 使用次数已达上限\n\n`;
      message += `今日已使用：${usageCheck.todayCount}/${usageCheck.dailyLimit} 次\n\n`;

      if (usageCheck.membershipType === 'free') {
        message += `💡 您可以：\n`;
        message += `• 明天继续使用免费次数\n`;
        message += `• 升级会员获得更多使用次数\n\n`;
        message += `发送 /membership 查看会员套餐`;
      } else {
        message += `请明天再来使用！`;
      }

      ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⭐ 升级会员', callback_data: 'membership' },
              { text: '📊 查看统计', callback_data: 'stats' }
            ]
          ]
        }
      });
      return;
    }

    // 获取最高质量的图片
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;

    ctx.reply(`收到图片！正在下载...\n\n✨ 今日剩余次数：${usageCheck.remaining - 1} 次`);

    // 获取文件信息
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    // 使用 Telegram 的公网 URL
    // 这个 URL 是公网可访问的
    const imagePath = fileUrl;

    // 保存会话数据（保留之前选择的模型）
    const existingSession = userSessions.get(userId) || {};
    const currentModel = existingSession.selectedModel || DEFAULT_MODEL;

    userSessions.set(userId, {
      ...existingSession,  // 保留已有的会话数据（如 selectedModel）
      imagePath: imagePath,  // 现在存储的是 URL 而不是本地路径
      imageUrl: fileUrl,     // 保存 URL 供后续使用
      state: 'waiting_for_prompt'
    });

    // 询问用户输入
    ctx.reply(
      '图片已保存！\n\n' +
      `当前模型：${currentModel}\n\n` +
      '请选择：\n' +
      '1. 直接输入提示词（描述你想要的视频效果）\n' +
      '2. 回复 "motion" 使用运动效果\n' +
      '3. 回复 "skip" 跳过提示词直接生成\n\n' +
      '💡 发送 /models 可切换模型',
      {
        reply_markup: {
          keyboard: [
            ['输入提示词'],
            ['使用运动效果', '跳过提示词']
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      }
    );

  } catch (error) {
    console.error('处理图片失败:', error);
    ctx.reply('处理图片时出错，请重试。');
  }
});

// 处理文本消息
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  // 跳过命令
  if (text.startsWith('/')) {
    return;
  }

  // 检查是否是模型选择
  const availableModels = getAvailableModels().map(m => m.id);
  if (availableModels.includes(text.trim())) {
    const session = userSessions.get(userId) || {};
    session.selectedModel = text.trim();
    userSessions.set(userId, session);

    ctx.reply(
      `✅ 已切换到模型：${text.trim()}\n\n` +
      `发送 /motions 查看该模型支持的运动效果\n` +
      `或直接发送图片开始生成视频`
    );
    return;
  }

  const session = userSessions.get(userId);

  if (!session) {
    ctx.reply('请先发送一张图片。');
    return;
  }

  try {
    if (session.state === 'waiting_for_prompt') {
      if (text === '使用运动效果' || text.toLowerCase() === 'motion') {
        session.state = 'waiting_for_motion';
        userSessions.set(userId, session);
        ctx.reply(
          '请选择运动效果：\n\n' +
          '📏 缩放：zoom-in, zoom-out\n' +
          '↔️ 水平平移：pan-left, pan-right\n' +
          '↕️ 垂直平移：pan-up, pan-down\n' +
          '🔄 旋转：roll-clockwise, roll-anticlockwise\n\n' +
          '💡 示例：zoom-in\n\n' +
          '输入 /motions 查看详细说明'
        );
      } else if (text === '跳过提示词' || text.toLowerCase() === 'skip') {
        const currentModel = session.selectedModel || DEFAULT_MODEL;
        await generateVideo(ctx, session.imageUrl, '', null, currentModel);
        userSessions.delete(userId);
      } else if (text === '输入提示词') {
        ctx.reply('请输入你的提示词（最多2000字符）：');
      } else {
        // 用户输入了提示词
        const currentModel = session.selectedModel || DEFAULT_MODEL;
        await generateVideo(ctx, session.imageUrl, text, null, currentModel);
        userSessions.delete(userId);
      }
    } else if (session.state === 'waiting_for_motion') {
      // 验证运动效果
      const currentModel = session.selectedModel || DEFAULT_MODEL;
      const motionName = text.toLowerCase().trim();

      // 定义有效的运动效果
      const validMotions = [
        'zoom-in', 'zoom-out',
        'pan-left', 'pan-right', 'pan-up', 'pan-down',
        'roll-clockwise', 'roll-anticlockwise'
      ];

      if (validMotions.includes(motionName)) {
        // 用户输入了有效的运动效果
        await generateVideo(ctx, session.imageUrl, '', motionName, currentModel);
        userSessions.delete(userId);
      } else {
        // 运动效果无效
        let errorMessage = `❌ 未识别的运动效果: "${text}"\n\n`;
        errorMessage += `✅ 有效的运动效果：\n`;
        errorMessage += `📏 缩放：zoom-in, zoom-out\n`;
        errorMessage += `↔️ 水平：pan-left, pan-right\n`;
        errorMessage += `↕️ 垂直：pan-up, pan-down\n`;
        errorMessage += `🔄 旋转：roll-clockwise, roll-anticlockwise\n\n`;
        errorMessage += `请重新输入或发送 /cancel 取消`;

        ctx.reply(errorMessage);
      }
    }
  } catch (error) {
    console.error('处理消息失败:', error);
    ctx.reply('处理失败，请重试。');
    userSessions.delete(userId);
  }
});

// 生成视频的核心函数
async function generateVideo(ctx, imageUrl, prompt, template, selectedModel = null) {
  const userId = ctx.from.id;
  const session = userSessions.get(userId) || {};
  const model = selectedModel || session.selectedModel || DEFAULT_MODEL;
  const apiModel = MODEL_MAP[model] || MODEL_MAP[DEFAULT_MODEL];

  const statusMsg = await ctx.reply(
    `正在生成视频，请稍候...\n` +
    `使用模型: ${model}\n` +
    `这可能需要1-3分钟。`
  );

  let tempImagePath = null;
  let tempVideoPath = null;

  try {
    // 1. 下载 Telegram 图片到本地
    ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      null,
      '正在下载图片...'
    );

    const imageResponse = await axios.get(imageUrl, { responseType: 'stream' });
    tempImagePath = path.join(__dirname, 'temp', `bot_${userId}_${Date.now()}.jpg`);
    
    // 确保 temp 目录存在
    const tempDir = path.dirname(tempImagePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const imageWriter = fs.createWriteStream(tempImagePath);
    imageResponse.data.pipe(imageWriter);

    await new Promise((resolve, reject) => {
      imageWriter.on('finish', resolve);
      imageWriter.on('error', reject);
    });

    // 2. 上传图片到服务器
    ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      null,
      '正在上传图片到服务器...'
    );

    const formData = new FormData();
    formData.append('image', fs.createReadStream(tempImagePath));
    formData.append('userId', userId.toString());

    const uploadResponse = await axios.post(`${API_BASE_URL}${API_PREFIX}/upload`, formData, {
      headers: formData.getHeaders()
    });

    if (!uploadResponse.data.success) {
      throw new Error(uploadResponse.data.error || '图片上传失败');
    }

    const imageId = uploadResponse.data.imageId;

    // 3. 创建视频生成任务
    ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      null,
      '任务已创建，正在生成视频...'
    );

    const generateBody = {
      imageId,
      model: apiModel,
      prompt: prompt || '',
      userId: userId.toString()
    };

    // 根据模型类型添加不同参数
    if (apiModel === 'comfyui-animatediff' && template) {
      generateBody.motionType = template;
    } else if (apiModel === 'comfyui-svd') {
      // SVD 使用 motionBucketId，默认 100
      generateBody.motionBucketId = 100;
    }

    const generateResponse = await axios.post(`${API_BASE_URL}${API_PREFIX}/generate`, generateBody, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!generateResponse.data.success) {
      throw new Error(generateResponse.data.error || '任务创建失败');
    }

    const taskId = generateResponse.data.taskId;

    // 4. 轮询任务状态
    let lastProgress = 0;
    let lastStatus = 'PENDING';
    const maxWaitTime = 20 * 60 * 1000; // 20 分钟
    const startTime = Date.now();
    const pollInterval = 3000; // 3 秒轮询一次

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const statusResponse = await axios.get(`${API_BASE_URL}${API_PREFIX}/task/${taskId}`);
        const task = statusResponse.data;

        if (task.status === 'SUCCEEDED') {
          // 任务成功
          ctx.telegram.editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            null,
            '视频生成成功！正在下载...'
          );

          // 5. 下载视频
          tempVideoPath = path.join(__dirname, 'temp', `bot_${userId}_${Date.now()}.mp4`);
          const videoResponse = await axios.get(`${API_BASE_URL}${API_PREFIX}/download/${taskId}`, {
            responseType: 'stream'
          });

          const videoWriter = fs.createWriteStream(tempVideoPath);
          videoResponse.data.pipe(videoWriter);

          await new Promise((resolve, reject) => {
            videoWriter.on('finish', resolve);
            videoWriter.on('error', reject);
          });

          // 6. 发送视频
          ctx.telegram.editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            null,
            '正在上传视频...'
          );

          await ctx.replyWithVideo(
            { source: tempVideoPath },
            {
              caption: template ? `使用运动效果: ${template}` : (prompt || '图生视频')
            }
          );

          // 7. 记录用户使用
          userManager.recordUsage(userId, {
            model: model,
            template: template,
            prompt: prompt,
            success: true
          });

          // 8. 删除状态消息
          ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);

          // 9. 获取更新后的用户统计
          const stats = userManager.getUserStats(userId);

          // 10. 发送成功消息
          ctx.reply(
            `🎉 视频生成成功！\n\n` +
            `📊 今日剩余：${stats.remaining} 次\n` +
            `📈 累计生成：${stats.totalUsage} 次\n\n` +
            `继续发送图片可生成更多视频！`
          );

          break; // 退出循环

        } else if (task.status === 'FAILED') {
          throw new Error(task.error || '视频生成失败');
        } else {
          // 更新进度
          const progress = task.progress || 0;
          const status = task.status || 'RUNNING';

          if (progress !== lastProgress || status !== lastStatus) {
            const progressText = status === 'RUNNING' ? `进度: ${progress}%` : '处理中...';
            ctx.telegram.editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              null,
              `任务进行中...\n模型: ${model}\n状态: ${status}\n${progressText}\n\n请耐心等待...`
            ).catch(err => {
              if (!err.message.includes('message is not modified')) {
                console.error('编辑消息失败:', err);
              }
            });
            lastProgress = progress;
            lastStatus = status;
          }
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          throw new Error('任务不存在或已过期');
        }
        throw error;
      }
    }

    if (Date.now() - startTime >= maxWaitTime) {
      throw new Error('任务超时，请重试');
    }

  } catch (error) {
    console.error('生成视频失败:', error);
    ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      null,
      `生成失败: ${error.message || '未知错误'}`
    );
  } finally {
    // 清理临时文件
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      try {
        fs.unlinkSync(tempImagePath);
      } catch (err) {
        console.error('清理图片文件失败:', err);
      }
    }
    if (tempVideoPath && fs.existsSync(tempVideoPath)) {
      try {
        fs.unlinkSync(tempVideoPath);
      } catch (err) {
        console.error('清理视频文件失败:', err);
      }
    }
  }
}

// 错误处理
bot.catch((err, ctx) => {
  console.error('Bot 错误:', err);
  ctx.reply('发生错误，请稍后重试。');
});

// 处理回调查询
bot.on('callback_query', async (ctx) => {
  const action = ctx.callbackQuery.data;

  if (action === 'stats') {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const stats = userManager.getUserStats(userId);

    if (!stats) {
      ctx.reply('获取统计信息失败，请重试。');
      return;
    }

    const membershipEmoji = {
      'free': '🆓',
      'monthly': '⭐',
      'yearly': '💎'
    };

    let message = `📊 使用统计\n\n`;
    message += `👤 用户：${stats.firstName || stats.username || '未知'}\n`;
    message += `${membershipEmoji[stats.membership.type]} 会员类型：${stats.membership.typeName}\n\n`;
    message += `📅 今日使用情况：\n`;
    message += `   已使用：${stats.todayCount} 次\n`;
    message += `   每日限额：${stats.dailyLimit} 次\n`;
    message += `   剩余次数：${stats.remaining} 次\n\n`;
    message += `📈 累计生成：${stats.totalUsage} 次\n`;

    if (stats.membership.isActive && stats.membership.daysLeft !== undefined) {
      message += `\n⏰ 会员有效期：剩余 ${stats.membership.daysLeft} 天\n`;
      message += `   到期日期：${new Date(stats.membership.expiry).toLocaleDateString('zh-CN')}`;
    }

    ctx.reply(message);
  } else if (action === 'membership') {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const stats = userManager.getUserStats(userId);

    if (!stats) {
      ctx.reply('获取用户信息失败，请重试。');
      return;
    }

    let message = `⭐ 会员中心\n\n`;
    message += `当前状态：${stats.membership.typeName}\n`;

    if (stats.membership.isActive) {
      message += `到期时间：${new Date(stats.membership.expiry).toLocaleDateString('zh-CN')}\n`;
      message += `剩余天数：${stats.membership.daysLeft} 天\n`;
    }

    message += `\n💎 会员套餐：\n\n`;
    message += `🆓 免费用户\n`;
    message += `   • 每日 3 次免费生成\n\n`;
    message += `⭐ 月度会员 (¥29.9/月)\n`;
    message += `   • 每日 100 次生成\n\n`;
    message += `💎 年度会员 (¥199/年)\n`;
    message += `   • 每日 200 次生成\n\n`;
    message += `📱 如需购买会员，请联系客服。`;

    ctx.reply(message);
  } else if (action === 'help') {
    await ctx.answerCbQuery();
    await ctx.reply(
      '使用说明：\n\n' +
      '🌟 方式一：Web App（推荐）\n' +
      '点击 /start 命令下方的"打开创作工具"按钮，在可视化界面中：\n' +
      '• 上传图片并预览\n' +
      '• 选择 AI 模型\n' +
      '• 选择运动效果\n' +
      '• 输入提示词\n' +
      '• 实时查看生成进度\n\n' +
      '📱 方式二：传统命令\n' +
      '1. 发送一张图片给我\n' +
      '2. 我会询问你是否需要添加提示词或选择运动效果\n' +
      '3. 等待视频生成完成（通常需要1-3分钟）\n' +
      '4. 接收生成的视频\n\n' +
      '提示词示例：\n' +
      '- 一个人在海边漫步，夕阳西下\n' +
      '- 古装美女在竹林中起舞\n' +
      '- 科幻场景，未来城市，霓虹灯闪烁\n\n' +
      '命令：\n' +
      '/stats - 查看使用统计\n' +
      '/membership - 会员中心\n' +
      '/models - 选择AI模型\n' +
      '/templates - 查看可用的特效模板\n' +
      '/cancel - 取消当前操作'
    );
  }
});

// 启动 Web 服务器
const { startServer } = require('./server');
startServer(bot);

// 启动 Bot
bot.launch().then(() => {
  console.log('🤖 Bot 已启动！');
  console.log('⏳ 等待用户消息...');
}).catch(err => {
  console.error('❌ Bot 启动失败:', err.message);
  console.log('⚠️  服务器仍在运行，仅 Web 功能可用');
});

// 优雅关闭
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

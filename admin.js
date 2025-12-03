// 管理员工具脚本
const UserManager = require('./user-manager');
const userManager = new UserManager();

const commands = {
  // 查看用户统计
  stats: (userId) => {
    if (!userId) {
      console.log('错误：请提供用户ID');
      console.log('用法: node admin.js stats <userId>');
      return;
    }

    const stats = userManager.getUserStats(userId);
    if (!stats) {
      console.log(`用户 ${userId} 不存在`);
      return;
    }

    console.log('\n📊 用户统计信息:');
    console.log('━'.repeat(50));
    console.log(`用户ID: ${stats.userId}`);
    console.log(`用户名: ${stats.username || '未设置'}`);
    console.log(`姓名: ${stats.firstName || '未知'}`);
    console.log(`注册时间: ${new Date(stats.createdAt).toLocaleString('zh-CN')}`);
    console.log('');
    console.log(`会员类型: ${stats.membership.typeName}`);
    if (stats.membership.isActive) {
      console.log(`到期时间: ${new Date(stats.membership.expiry).toLocaleString('zh-CN')}`);
      console.log(`剩余天数: ${stats.membership.daysLeft} 天`);
    }
    console.log('');
    console.log(`今日使用: ${stats.todayCount}/${stats.dailyLimit} 次`);
    console.log(`剩余次数: ${stats.remaining} 次`);
    console.log(`累计生成: ${stats.totalUsage} 次`);
    console.log('━'.repeat(50));
  },

  // 升级会员
  upgrade: (userId, type, days) => {
    if (!userId || !type || !days) {
      console.log('错误：参数不完整');
      console.log('用法: node admin.js upgrade <userId> <type> <days>');
      console.log('示例: node admin.js upgrade 123456789 monthly 30');
      console.log('      node admin.js upgrade 123456789 yearly 365');
      return;
    }

    const validTypes = ['monthly', 'yearly'];
    if (!validTypes.includes(type)) {
      console.log(`错误：无效的会员类型 "${type}"`);
      console.log('有效类型: monthly, yearly');
      return;
    }

    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays <= 0) {
      console.log('错误：天数必须是正整数');
      return;
    }

    const result = userManager.upgradeMembership(userId, type, numDays);

    if (result.success) {
      console.log('\n✅ 会员升级成功!');
      console.log('━'.repeat(50));
      console.log(`用户ID: ${userId}`);
      console.log(`会员类型: ${type === 'monthly' ? '月度会员' : '年度会员'}`);
      console.log(`有效期: ${numDays} 天`);
      console.log(`到期时间: ${result.expiry.toLocaleString('zh-CN')}`);
      console.log('━'.repeat(50));
    } else {
      console.log(`\n❌ 升级失败: ${result.message}`);
    }
  },

  // 列出所有用户
  list: () => {
    const allUsers = userManager.db.getAllUsers();
    const userIds = Object.keys(allUsers);

    if (userIds.length === 0) {
      console.log('暂无用户数据');
      return;
    }

    console.log(`\n📋 用户列表 (共 ${userIds.length} 个用户):`);
    console.log('━'.repeat(80));
    console.log('用户ID'.padEnd(15), '用户名'.padEnd(15), '会员类型'.padEnd(12), '今日使用', '累计生成');
    console.log('━'.repeat(80));

    userIds.forEach(userId => {
      const stats = userManager.getUserStats(userId);
      if (stats) {
        const membershipEmoji = {
          'free': '🆓',
          'monthly': '⭐',
          'yearly': '💎'
        };
        console.log(
          userId.toString().padEnd(15),
          (stats.username || '未知').padEnd(15),
          `${membershipEmoji[stats.membership.type]} ${stats.membership.typeName}`.padEnd(20),
          `${stats.todayCount}/${stats.dailyLimit}`,
          stats.totalUsage
        );
      }
    });
    console.log('━'.repeat(80));
  },

  // 查看今日使用记录
  usage: (userId) => {
    if (!userId) {
      console.log('错误：请提供用户ID');
      console.log('用法: node admin.js usage <userId>');
      return;
    }

    const usage = userManager.getTodayUsage(userId);
    if (!usage || usage.length === 0) {
      console.log(`用户 ${userId} 今日暂无使用记录`);
      return;
    }

    console.log(`\n📝 用户 ${userId} 今日使用记录:`);
    console.log('━'.repeat(80));
    console.log('时间'.padEnd(25), '模型'.padEnd(25), '模板'.padEnd(15), '状态');
    console.log('━'.repeat(80));

    usage.forEach(record => {
      console.log(
        new Date(record.timestamp).toLocaleString('zh-CN').padEnd(25),
        record.model.padEnd(25),
        (record.template || '-').padEnd(15),
        record.success ? '✅ 成功' : '❌ 失败'
      );
    });
    console.log('━'.repeat(80));
  },

  // 清理旧数据
  clean: () => {
    console.log('正在清理旧数据...');
    userManager.db.cleanOldData();
    console.log('✅ 清理完成');
  },

  // 显示帮助
  help: () => {
    console.log('\n📚 管理员工具使用指南');
    console.log('━'.repeat(80));
    console.log('');
    console.log('命令列表:');
    console.log('');
    console.log('  stats <userId>                    查看用户统计信息');
    console.log('  upgrade <userId> <type> <days>   升级用户会员');
    console.log('  list                              列出所有用户');
    console.log('  usage <userId>                    查看用户今日使用记录');
    console.log('  clean                             清理旧数据（保留30天）');
    console.log('  help                              显示此帮助信息');
    console.log('');
    console.log('示例:');
    console.log('');
    console.log('  node admin.js stats 123456789');
    console.log('  node admin.js upgrade 123456789 monthly 30');
    console.log('  node admin.js upgrade 123456789 yearly 365');
    console.log('  node admin.js list');
    console.log('  node admin.js usage 123456789');
    console.log('  node admin.js clean');
    console.log('');
    console.log('会员类型:');
    console.log('  monthly  - 月度会员 (100次/天)');
    console.log('  yearly   - 年度会员 (200次/天)');
    console.log('━'.repeat(80));
  }
};

// 主程序
const main = () => {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help') {
    commands.help();
    return;
  }

  const commandFunc = commands[command];
  if (!commandFunc) {
    console.log(`❌ 未知命令: ${command}`);
    console.log('运行 "node admin.js help" 查看帮助');
    return;
  }

  commandFunc(...args);
};

main();

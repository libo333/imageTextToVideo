// 用户管理系统
const Database = require('./database');

class UserManager {
  constructor() {
    this.db = new Database();
    this.FREE_DAILY_LIMIT = 3; // 免费用户每日限制
    this.MONTHLY_DAILY_LIMIT = 100; // 月度会员每日限制
    this.YEARLY_DAILY_LIMIT = 200; // 年度会员每日限制
  }

  // 注册或更新用户信息
  registerUser(userId, userData = {}) {
    const existingUser = this.db.getUser(userId);

    if (!existingUser) {
      console.log(`新用户注册: ${userId}`);
      this.db.saveUser(userId, userData);
    } else {
      // 更新用户信息（如用户名变更）
      if (userData.username && userData.username !== existingUser.username) {
        this.db.saveUser(userId, { ...existingUser, ...userData });
      }
    }

    return this.db.getUser(userId);
  }

  // 检查用户是否可以使用服务
  canUseService(userId) {
    const user = this.db.getUser(userId);

    if (!user) {
      // 新用户，自动注册
      this.registerUser(userId);
      return {
        allowed: true,
        remaining: this.FREE_DAILY_LIMIT,
        membershipType: 'free',
        reason: '欢迎新用户！'
      };
    }

    // 检查会员状态
    const membershipType = this.getMembershipType(userId);
    const dailyLimit = this.getDailyLimit(membershipType);
    const todayCount = this.db.getUserTodayCount(userId);
    const remaining = Math.max(0, dailyLimit - todayCount);

    if (todayCount >= dailyLimit) {
      return {
        allowed: false,
        remaining: 0,
        todayCount: todayCount,
        dailyLimit: dailyLimit,
        membershipType: membershipType,
        reason: membershipType === 'free'
          ? '今日免费使用次数已用完，请明天再来或升级会员！'
          : '今日使用次数已达上限，请明天再来！'
      };
    }

    return {
      allowed: true,
      remaining: remaining,
      todayCount: todayCount,
      dailyLimit: dailyLimit,
      membershipType: membershipType,
      reason: '可以使用'
    };
  }

  // 记录使用
  recordUsage(userId, details = {}) {
    // 确保用户存在
    if (!this.db.getUser(userId)) {
      this.registerUser(userId);
    }

    // 记录使用
    this.db.recordUsage(userId, details);

    // 更新用户总使用次数
    const user = this.db.getUser(userId);
    if (user) {
      user.totalUsage = (user.totalUsage || 0) + 1;
      this.db.saveUser(userId, user);
    }

    return true;
  }

  // 获取用户会员类型
  getMembershipType(userId) {
    const user = this.db.getUser(userId);

    if (!user) {
      return 'free';
    }

    // 检查会员是否过期
    if (user.membershipType !== 'free' && user.membershipExpiry) {
      const expiry = new Date(user.membershipExpiry);
      const now = new Date();

      if (now > expiry) {
        // 会员过期，降级为免费用户
        user.membershipType = 'free';
        user.membershipExpiry = null;
        this.db.saveUser(userId, user);
        return 'free';
      }
    }

    return user.membershipType || 'free';
  }

  // 获取每日限制次数
  getDailyLimit(membershipType) {
    switch (membershipType) {
      case 'monthly':
        return this.MONTHLY_DAILY_LIMIT;
      case 'yearly':
        return this.YEARLY_DAILY_LIMIT;
      case 'free':
      default:
        return this.FREE_DAILY_LIMIT;
    }
  }

  // 升级会员
  upgradeMembership(userId, type, durationDays) {
    const user = this.db.getUser(userId);

    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    user.membershipType = type;
    user.membershipExpiry = expiry.toISOString();

    this.db.saveUser(userId, user);

    return {
      success: true,
      message: `会员升级成功！有效期至 ${expiry.toLocaleDateString('zh-CN')}`,
      expiry: expiry
    };
  }

  // 获取用户统计信息
  getUserStats(userId) {
    const user = this.db.getUser(userId);

    if (!user) {
      return null;
    }

    const membershipType = this.getMembershipType(userId);
    const todayCount = this.db.getUserTodayCount(userId);
    const dailyLimit = this.getDailyLimit(membershipType);
    const remaining = Math.max(0, dailyLimit - todayCount);

    let membershipInfo = {
      type: membershipType,
      typeName: this.getMembershipName(membershipType),
      expiry: user.membershipExpiry,
      isActive: membershipType !== 'free'
    };

    if (user.membershipExpiry) {
      const expiry = new Date(user.membershipExpiry);
      const now = new Date();
      const daysLeft = Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));
      membershipInfo.daysLeft = Math.max(0, daysLeft);
    }

    return {
      userId: user.userId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      totalUsage: user.totalUsage || 0,
      todayCount: todayCount,
      dailyLimit: dailyLimit,
      remaining: remaining,
      membership: membershipInfo
    };
  }

  // 获取会员类型名称
  getMembershipName(type) {
    const names = {
      'free': '免费用户',
      'monthly': '月度会员',
      'yearly': '年度会员'
    };
    return names[type] || '未知';
  }

  // 获取今日使用记录
  getTodayUsage(userId) {
    return this.db.getUserTodayUsage(userId);
  }

  // 更新用户信息
  updateUserInfo(userId, updates = {}) {
    const user = this.db.getUser(userId);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.db.saveUser(userId, updatedUser);
      console.log(`用户信息已更新: ${userId}`, updates);
      return updatedUser;
    }
    return null;
  }
}

module.exports = UserManager;

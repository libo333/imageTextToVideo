// 用户 API 端点
const UserManager = require('../user-manager');
const userManager = new UserManager();

module.exports = function(app, skipValidation = false) {
    const basePath = skipValidation ? '/dev/api' : '/api';

    // 获取用户信息和统计
    app.get(`${basePath}/user/:userId`, (req, res) => {
        try {
            const { userId } = req.params;

            // 获取用户统计
            const stats = userManager.getUserStats(userId);

            if (!stats) {
                // 用户不存在，自动注册
                userManager.registerUser(userId);
                const newStats = userManager.getUserStats(userId);

                return res.json({
                    ...newStats,
                    todayUsage: []
                });
            }

            // 获取今日使用记录
            const todayUsage = userManager.getTodayUsage(userId);

            // 返回完整数据
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

    // 检查用户是否可以使用服务
    app.get(`${basePath}/user/:userId/check`, (req, res) => {
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

    // 升级会员（管理员接口，需要添加认证）
    app.post(`${basePath}/user/:userId/upgrade`, (req, res) => {
        try {
            const { userId } = req.params;
            const { type, days } = req.body;

            // TODO: 添加管理员认证
            // if (!req.isAdmin) {
            //     return res.status(403).json({ success: false, message: '权限不足' });
            // }

            const result = userManager.upgradeMembership(userId, type, days);
            res.json(result);

        } catch (error) {
            console.error('升级会员失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
    });

    // 获取所有用户列表（管理员接口）
    app.get(`${basePath}/users`, (req, res) => {
        try {
            // TODO: 添加管理员认证

            const allUsers = userManager.db.getAllUsers();
            const userList = Object.keys(allUsers).map(userId => {
                const stats = userManager.getUserStats(userId);
                return {
                    userId: stats.userId,
                    username: stats.username,
                    firstName: stats.firstName,
                    membershipType: stats.membership.type,
                    membershipTypeName: stats.membership.typeName,
                    todayCount: stats.todayCount,
                    dailyLimit: stats.dailyLimit,
                    totalUsage: stats.totalUsage,
                    createdAt: stats.createdAt
                };
            });

            res.json({
                success: true,
                total: userList.length,
                users: userList
            });

        } catch (error) {
            console.error('获取用户列表失败:', error);
            res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
    });
};

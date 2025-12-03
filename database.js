// 简单的 JSON 文件数据库系统
const fs = require('fs');
const path = require('path');

class Database {
    constructor(dbPath = './data') {
        this.dbPath = dbPath;
        this.usersFile = path.join(dbPath, 'users.json');
        this.usageFile = path.join(dbPath, 'usage.json');
        this.init();
    }

    // 初始化数据库
    init() {
        // 创建数据目录
        if (!fs.existsSync(this.dbPath)) {
            fs.mkdirSync(this.dbPath, { recursive: true });
        }

        // 初始化用户文件
        if (!fs.existsSync(this.usersFile)) {
            this.saveData(this.usersFile, {});
        }

        // 初始化使用记录文件
        if (!fs.existsSync(this.usageFile)) {
            this.saveData(this.usageFile, {});
        }
    }

    // 读取数据
    loadData(file) {
        try {
            const data = fs.readFileSync(file, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`读取文件失败 ${file}:`, error);
            return {};
        }
    }

    // 保存数据
    saveData(file, data) {
        try {
            fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`保存文件失败 ${file}:`, error);
            return false;
        }
    }

    // 获取所有用户
    getAllUsers() {
        return this.loadData(this.usersFile);
    }

    // 获取单个用户
    getUser(userId) {
        const users = this.getAllUsers();
        return users[userId] || null;
    }

    // 创建或更新用户
    saveUser(userId, userData) {
        const users = this.getAllUsers();

        if (!users[userId]) {
            // 新用户
            users[userId] = {
                userId: userId,
                username: userData.username || '',
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                createdAt: new Date().toISOString(),
                membershipType: 'free', // free, monthly, yearly
                membershipExpiry: null,
                totalUsage: 0
            };
        } else {
            // 更新现有用户
            Object.assign(users[userId], userData);
        }

        return this.saveData(this.usersFile, users);
    }

    // 获取所有使用记录
    getAllUsage() {
        return this.loadData(this.usageFile);
    }

    // 获取用户今日使用记录
    getUserTodayUsage(userId) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const usageData = this.getAllUsage();
        const userUsage = usageData[userId] || {};

        return userUsage[today] || [];
    }

    // 记录用户使用
    recordUsage(userId, details = {}) {
        const today = new Date().toISOString().split('T')[0];
        const usageData = this.getAllUsage();

        if (!usageData[userId]) {
            usageData[userId] = {};
        }

        if (!usageData[userId][today]) {
            usageData[userId][today] = [];
        }

        usageData[userId][today].push({
            timestamp: new Date().toISOString(),
            model: details.model || 'unknown',
            template: details.template || null,
            prompt: details.prompt || '',
            success: details.success !== false
        });

        return this.saveData(this.usageFile, usageData);
    }

    // 获取用户今日使用次数
    getUserTodayCount(userId) {
        return this.getUserTodayUsage(userId).length;
    }

    // 清理旧数据（保留最近30天）
    cleanOldData() {
        const usageData = this.getAllUsage();
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

        let cleaned = false;

        for (const userId in usageData) {
            for (const date in usageData[userId]) {
                if (date < cutoffDate) {
                    delete usageData[userId][date];
                    cleaned = true;
                }
            }
        }

        if (cleaned) {
            this.saveData(this.usageFile, usageData);
            console.log('旧数据清理完成');
        }
    }
}

module.exports = Database;

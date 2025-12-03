// 嵌入式用户中心

let userCenterUserId = null;
let userCenterData = null;

// 等待 i18n 加载完成
function waitForI18nEmbedded(callback) {
    let count = 0;
    const checkI18n = () => {
        if (typeof i18n !== 'undefined' && i18n.translations && Object.keys(i18n.translations).length > 0) {
            callback();
        } else if (count < 50) {
            count++;
            setTimeout(checkI18n, 100);
        }
    };
    checkI18n();
}

// 初始化标签页
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            // 移除所有活动状态
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // 激活当前标签
            btn.classList.add('active');
            const targetTab = document.getElementById(tabName + 'Tab');
            if (targetTab) {
                targetTab.classList.add('active');
            }

            // 如果切换到个人中心，始终重新加载最新数据
            if (tabName === 'profile') {
                loadUserCenterData();
            }
        });
    });
}

// 获取用户ID
function getUserCenterId() {
    // 1. 从 URL 参数获取
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('userId')) {
        return urlParams.get('userId');
    }

    // 2. 从 Telegram WebApp 获取
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            console.log('从 Telegram 获取用户 ID:', tg.initDataUnsafe.user.id);
            return tg.initDataUnsafe.user.id.toString();
        }
    }

    // 3. 开发测试模式 - 使用测试用户
    console.log('使用测试用户 ID');
    return 'test_user_123';
}

// 加载用户中心数据
async function loadUserCenterData() {
    userCenterUserId = getUserCenterId();

    if (!userCenterUserId) {
        renderUserCenterError('无法获取用户信息');
        return;
    }

    try {
        // 获取 Telegram 用户信息
        let userInfo = null;
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                userInfo = {
                    username: tg.initDataUnsafe.user.username || null,
                    firstName: tg.initDataUnsafe.user.first_name || null,
                    lastName: tg.initDataUnsafe.user.last_name || null
                };
            }
        }

        // 始终使用 /dev/api 路径（开发测试阶段）
        // 生产环境需要配置 Telegram 认证后使用 /api 路径
        const apiPath = `/dev/api/user/${userCenterUserId}`;

        console.log('正在加载用户数据，API路径:', apiPath);
        console.log('当前 hostname:', window.location.hostname);
        console.log('用户信息:', userInfo);

        // 如果有用户信息，通过查询参数传递
        let url = apiPath;
        if (userInfo) {
            const params = new URLSearchParams();
            if (userInfo.username) params.append('username', userInfo.username);
            if (userInfo.firstName) params.append('firstName', userInfo.firstName);
            if (userInfo.lastName) params.append('lastName', userInfo.lastName);
            url = `${apiPath}?${params.toString()}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            console.error('API响应错误:', response.status, response.statusText);
            throw new Error('加载失败');
        }

        userCenterData = await response.json();
        console.log('用户数据加载成功:', userCenterData);
        renderUserCenter(userCenterData);
    } catch (error) {
        console.error('加载用户数据失败:', error);
        renderUserCenterError('加载失败，请刷新重试');
    }
}

// 渲染用户中心
function renderUserCenter(data) {
    const container = document.getElementById('userCenterContent');

    const membershipIcons = {
        'free': '🆓',
        'monthly': '⭐',
        'yearly': '💎'
    };

    const membershipColors = {
        'free': '#6b7280',
        'monthly': '#f59e0b',
        'yearly': '#8b5cf6'
    };

    const percentage = (data.todayCount / data.dailyLimit) * 100;

    let membershipDetails = '';
    if (data.membership.isActive) {
        membershipDetails = `
            <p><span>${typeof i18n !== 'undefined' ? i18n.t('profile.expiryDate') : '到期时间'}</span><span>${formatDate(data.membership.expiry)}</span></p>
            <p><span>${typeof i18n !== 'undefined' ? i18n.t('profile.daysLeft') : '剩余天数'}</span><span>${data.membership.daysLeft} ${typeof i18n !== 'undefined' ? i18n.t('profile.days') : '天'}</span></p>
        `;
    } else {
        membershipDetails = `<p style="text-align: center; color: #6b7280;">${typeof i18n !== 'undefined' ? i18n.t('profile.upgradeHint') : '升级会员享受更多次数'}</p>`;
    }

    const historyHtml = renderHistory(data.todayUsage || []);

    container.innerHTML = `
        <div class="user-center-wrapper">
            <!-- 使用情况卡片 -->
            <div class="user-stat-card">
                <div class="stat-header">
                    <h2>${typeof i18n !== 'undefined' ? i18n.t('profile.todayUsage') : '📈 今日使用情况'}</h2>
                    <div class="header-right">
                        <span class="usage-text">${typeof i18n !== 'undefined' ? i18n.t('profile.usedCount') : '已使用'} ${data.todayCount} / ${data.dailyLimit}</span>
                        <button class="refresh-mini-btn" onclick="loadUserCenterData()">🔄</button>
                    </div>
                </div>
                <div class="usage-display">
                    <div class="remaining-box" style="background: linear-gradient(135deg, ${data.remaining > 0 ? '#10b981' : '#ef4444'}, ${data.remaining > 0 ? '#059669' : '#dc2626'});">
                        <div class="remaining-count">${data.remaining}</div>
                        <div class="remaining-label">${typeof i18n !== 'undefined' ? i18n.t('profile.remainingCount') : '剩余次数'}</div>
                    </div>
                </div>
            </div>

            <!-- 会员状态卡片 -->
            <div class="user-stat-card">
                <div class="stat-header">
                    <h2>${membershipIcons[data.membership.type]} ${typeof i18n !== 'undefined' ? i18n.t('profile.membershipStatus') : '会员状态'}</h2>
                </div>
                <div class="membership-status">
                    <div class="membership-type" style="background: ${membershipColors[data.membership.type]};">
                        <span>${getMembershipName(data.membership.type)}</span>
                    </div>
                    <div class="membership-details">
                        ${membershipDetails}
                    </div>
                </div>
                ${!data.membership.isActive ? `<button class="upgrade-btn" onclick="showUpgradeInfo()">⭐ ${typeof i18n !== 'undefined' ? i18n.t('profile.upgradeMembership') : '升级会员'}</button>` : ''}
            </div>

            <!-- 用户信息卡片 -->
            <div class="user-stat-card">
                <div class="stat-header">
                    <h2>${typeof i18n !== 'undefined' ? i18n.t('profile.userInfo') : '👤 用户信息'}</h2>
                </div>
                <div class="user-info-grid">
                    <div class="info-item">
                        <span class="label">${typeof i18n !== 'undefined' ? i18n.t('profile.username') : '用户名'}</span>
                        <span class="value">${data.username || (typeof i18n !== 'undefined' ? i18n.t('profile.notSet') : '未设置')}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">${typeof i18n !== 'undefined' ? i18n.t('profile.firstName') : '姓名'}</span>
                        <span class="value">${([data.firstName, data.lastName].filter(Boolean).join(' ') || (typeof i18n !== 'undefined' ? i18n.t('profile.unknown') : '未知'))}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">${typeof i18n !== 'undefined' ? i18n.t('profile.totalGenerated') : '累计生成'}</span>
                        <span class="value highlight">${data.totalUsage || 0}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">${typeof i18n !== 'undefined' ? i18n.t('profile.registeredDate') : '注册时间'}</span>
                        <span class="value">${formatDate(data.createdAt)}</span>
                    </div>
                </div>
            </div>

            <!-- 今日记录 -->
            <div class="user-stat-card">
                <div class="stat-header">
                    <h2>${typeof i18n !== 'undefined' ? i18n.t('profile.todayHistory') : '📝 今日使用记录'}</h2>
                </div>
                ${historyHtml}
            </div>
        </div>
    `;
}

// 渲染历史记录
function renderHistory(usage) {
    if (!usage || usage.length === 0) {
        return `<div class="empty-state"><p>${typeof i18n !== 'undefined' ? i18n.t('profile.emptyHistory') : '📭 今日暂无使用记录'}</p></div>`;
    }

    const html = usage.map(record => {
        const statusClass = record.success ? 'success' : 'failed';
        const statusText = record.success ? i18n.t('profile.success') : i18n.t('profile.failed');

        return `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-time">${formatTime(record.timestamp)}</div>
                    <div class="history-model">${typeof i18n !== 'undefined' ? i18n.t('profile.model') : '模型'}: ${record.model}</div>
                    ${record.template ? `<div class="history-template">${typeof i18n !== 'undefined' ? i18n.t('profile.effect') : '特效'}: ${record.template}</div>` : ''}
                </div>
                <div class="history-status ${statusClass}">${statusText}</div>
            </div>
        `;
    }).join('');

    return `<div class="history-list">${html}</div>`;
}

// 渲染错误
function renderUserCenterError(message) {
    const container = document.getElementById('userCenterContent');
    container.innerHTML = `
        <div class="error-state">
            <p>❌ ${message}</p>
        </div>
    `;
}

// 显示升级信息
function showUpgradeInfo() {
    const message = typeof i18n !== 'undefined' ? i18n.t('profile.contactSupport') : '请返回 Telegram Bot，发送 /membership 命令查看会员套餐并购买。';
    alert(message);
}

// 获取会员名称（国际化）
function getMembershipName(type) {
    const names = {
        'free': typeof i18n !== 'undefined' ? i18n.t('profile.planFree') : '免费用户',
        'monthly': typeof i18n !== 'undefined' ? i18n.t('profile.planMonthly') : '月度会员',
        'yearly': typeof i18n !== 'undefined' ? i18n.t('profile.planYearly') : '年度会员'
    };
    return names[type] || type;
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const locale = typeof i18n !== 'undefined' ? 
        ({'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'en-US': 'en-US', 'ja-JP': 'ja-JP'}[i18n.getLanguage()] || 'zh-CN') :
        'zh-CN';
    return date.toLocaleDateString(locale);
}

// 格式化时间
function formatTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const locale = typeof i18n !== 'undefined' ? 
        ({'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'en-US': 'en-US', 'ja-JP': 'ja-JP'}[i18n.getLanguage()] || 'zh-CN') :
        'zh-CN';
    return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    
    // 等待 i18n 加载完成后加载用户数据
    waitForI18nEmbedded(() => {
        // 监听语言改变事件
        document.addEventListener('languageChanged', () => {
            if (userCenterData) {
                renderUserCenter(userCenterData);
            }
        });
    });
});

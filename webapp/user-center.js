// 用户中心 JavaScript

let userId = null;
let userData = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 等待 i18n 初始化完成
    waitForI18n(() => {
        // 获取用户ID (从 URL 参数或 Telegram WebApp)
        userId = getUserId();

        if (!userId) {
            showError(i18n.t('messages.error'));
            return;
        }

        // 加载数据
        loadUserData();

        // 绑定事件
        document.getElementById('refreshBtn').addEventListener('click', loadUserData);
        document.getElementById('upgradeBtn').addEventListener('click', showMembershipModal);

        // 监听语言改变事件
        document.addEventListener('languageChanged', () => {
            if (userData) {
                renderUserData(userData);
            }
        });
    });
});

// 等待 i18n 加载完成
function waitForI18n(callback) {
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

// 获取用户ID
function getUserId() {
    // 1. 尝试从 URL 参数获取
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('userId')) {
        return urlParams.get('userId');
    }

    // 2. 尝试从 Telegram WebApp 获取
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            return tg.initDataUnsafe.user.id.toString();
        }
    }

    // 3. 开发模式：使用测试用户ID
    if (window.location.hostname === 'localhost') {
        return 'test_user_123';
    }

    return null;
}

// 加载用户数据
async function loadUserData() {
    showLoading();

    try {
        const response = await fetch(`/api/user/${userId}`);

        if (!response.ok) {
            throw new Error(i18n.t('messages.loadError'));
        }

        userData = await response.json();
        renderUserData(userData);
        hideLoading();
    } catch (error) {
        console.error('加载用户数据失败:', error);
        showError(i18n.t('messages.loadError'));
    }
}

// 渲染用户数据
function renderUserData(data) {
    // 用户信息
    document.getElementById('username').textContent = data.username || i18n.t('profile.notSet');
    document.getElementById('firstName').textContent = data.firstName || i18n.t('profile.unknown');
    document.getElementById('createdAt').textContent = formatDate(data.createdAt);
    document.getElementById('totalUsage').textContent = data.totalUsage || 0;

    // 会员状态
    const membershipIcons = {
        'free': '🆓',
        'monthly': '⭐',
        'yearly': '💎'
    };
    document.getElementById('membershipIcon').textContent = membershipIcons[data.membership.type];
    
    const membershipNames = {
        'free': i18n.t('profile.planFree'),
        'monthly': i18n.t('profile.planMonthly'),
        'yearly': i18n.t('profile.planYearly')
    };
    document.getElementById('membershipType').textContent = membershipNames[data.membership.type];

    // 会员详情
    const detailsHtml = [];
    if (data.membership.isActive) {
        detailsHtml.push(`<p><span>${i18n.t('profile.expiryDate')}</span><span>${formatDate(data.membership.expiry)}</span></p>`);
        detailsHtml.push(`<p><span>${i18n.t('profile.daysLeft')}</span><span>${data.membership.daysLeft} ${i18n.t('profile.days')}</span></p>`);
    } else {
        detailsHtml.push(`<p style="text-align: center; color: #6b7280;">${i18n.t('profile.upgradeHint')}</p>`);
    }
    document.getElementById('membershipDetails').innerHTML = detailsHtml.join('');

    // 使用情况
    document.getElementById('usageText').textContent = `${data.todayCount} / ${data.dailyLimit}`;
    document.getElementById('remainingCount').textContent = data.remaining;

    const percentage = (data.todayCount / data.dailyLimit) * 100;
    document.getElementById('progressFill').style.width = `${percentage}%`;

    // 限额信息
    const limitText = i18n.t('profile.dailyLimit', { limit: data.dailyLimit });
    document.getElementById('limitInfo').textContent = limitText;

    // 今日使用记录
    renderHistory(data.todayUsage || []);
}

// 渲染历史记录
function renderHistory(usage) {
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');

    if (!usage || usage.length === 0) {
        historyList.style.display = 'none';
        emptyHistory.style.display = 'block';
        return;
    }

    historyList.style.display = 'flex';
    emptyHistory.style.display = 'none';

    const html = usage.map(record => {
        const statusClass = record.success ? 'success' : 'failed';
        const statusText = record.success ? i18n.t('profile.success') : i18n.t('profile.failed');
        const modelLabel = i18n.t('profile.model');
        const templateLabel = i18n.t('profile.effect');
        const promptLabel = i18n.t('profile.prompt');

        let extra = '';
        if (record.template) {
            extra += `<div class="history-template">${templateLabel}: ${record.template}</div>`;
        }
        if (record.prompt) {
            extra += `<div class="history-template">${promptLabel}: ${record.prompt.substring(0, 50)}${record.prompt.length > 50 ? '...' : ''}</div>`;
        }

        return `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-time">${formatTime(record.timestamp)}</div>
                    <div class="history-model">${modelLabel}: ${record.model}</div>
                    ${extra}
                </div>
                <div class="history-status ${statusClass}">${statusText}</div>
            </div>
        `;
    }).join('');

    historyList.innerHTML = html;
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    
    // 根据当前语言选择日期格式
    let locales = {
        'zh-CN': 'zh-CN',
        'zh-TW': 'zh-TW',
        'en-US': 'en-US',
        'ja-JP': 'ja-JP'
    };
    const locale = locales[i18n.getLanguage()] || 'zh-CN';
    
    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// 格式化时间
function formatTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    
    // 根据当前语言选择时间格式
    let locales = {
        'zh-CN': 'zh-CN',
        'zh-TW': 'zh-TW',
        'en-US': 'en-US',
        'ja-JP': 'ja-JP'
    };
    const locale = locales[i18n.getLanguage()] || 'zh-CN';
    
    return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 显示加载状态
function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

// 显示错误
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    const errorMsg = document.getElementById('errorState').querySelector('p');
    if (errorMsg) {
        errorMsg.textContent = `❌ ${message}`;
    }
}

// 显示会员弹窗
function showMembershipModal() {
    document.getElementById('membershipModal').classList.add('active');
}

// 关闭会员弹窗
function closeMembershipModal() {
    document.getElementById('membershipModal').classList.remove('active');
}

// 点击弹窗外部关闭
document.addEventListener('click', (e) => {
    const modal = document.getElementById('membershipModal');
    if (e.target === modal) {
        closeMembershipModal();
    }
});

// 自动刷新（可选）
// setInterval(loadUserData, 60000); // 每分钟刷新一次

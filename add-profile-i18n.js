const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, 'webapp', 'i18n');

// 用户中心相关的翻译
const profileTranslations = {
  'zh-CN': {
    "profile": {
      "title": "个人中心",
      "refresh": "🔄 刷新",
      "userInfo": "👤 用户信息",
      "username": "用户名",
      "firstName": "姓名",
      "registeredDate": "注册时间",
      "totalGenerated": "累计生成",
      "membershipStatus": "会员状态",
      "upgradeMembership": "⭐ 升级会员",
      "todayUsage": "📈 今日使用情况",
      "usedCount": "已使用",
      "remainingCount": "剩余次数",
      "dailyLimit": "💡 每日限额 {limit} 次",
      "todayHistory": "📝 今日使用记录",
      "emptyHistory": "📭 今日暂无使用记录",
      "membershipPlans": "💎 会员套餐",
      "planFree": "免费用户",
      "planFreeLimit": "3 次/天",
      "planAllModels": "✓ 所有模型",
      "planAllEffects": "✓ 所有特效",
      "planHot": "热门",
      "planMonthly": "月度会员",
      "planMonthlyLimit": "100 次/天",
      "planPriority": "✓ 优先处理",
      "planAllFeatures": "✓ 所有功能",
      "planBest": "最划算",
      "planYearly": "年度会员",
      "planYearlyLimit": "200 次/天",
      "planTopPriority": "✓ 最高优先级",
      "planDedicatedSupport": "✓ 专属客服",
      "planEarlyAccess": "✓ 新功能抢先",
      "contactSupport": "📱 如需购买会员，请在 Telegram 中联系客服",
      "footer": "© 2025 图生视频 Bot - Powered by Aliyun AI",
      "membershipCenter": "⭐ 会员中心",
      "membershipHint1": "请返回 Telegram Bot，发送 /membership 命令查看详细套餐信息并购买。",
      "membershipHint2": "或联系客服购买会员。",
      "close": "关闭",
      "expiryDate": "到期时间",
      "daysLeft": "剩余天数",
      "days": "天",
      "upgradeHint": "升级会员享受更多次数",
      "success": "✅ 成功",
      "failed": "❌ 失败",
      "model": "模型",
      "effect": "特效",
      "prompt": "提示"
    },
    "messages": {
      "loading": "加载中...",
      "loadError": "❌ 加载失败，请刷新重试"
    }
  },
  'zh-TW': {
    "profile": {
      "title": "個人中心",
      "refresh": "🔄 刷新",
      "userInfo": "👤 用戶信息",
      "username": "用戶名",
      "firstName": "姓名",
      "registeredDate": "註冊時間",
      "totalGenerated": "累計生成",
      "membershipStatus": "會員狀態",
      "upgradeMembership": "⭐ 升級會員",
      "todayUsage": "📈 今日使用情況",
      "usedCount": "已使用",
      "remainingCount": "剩餘次數",
      "dailyLimit": "💡 每日限額 {limit} 次",
      "todayHistory": "📝 今日使用記錄",
      "emptyHistory": "📭 今日暫無使用記錄",
      "membershipPlans": "💎 會員套餐",
      "planFree": "免費用戶",
      "planFreeLimit": "3 次/天",
      "planAllModels": "✓ 所有模型",
      "planAllEffects": "✓ 所有特效",
      "planHot": "熱門",
      "planMonthly": "月度會員",
      "planMonthlyLimit": "100 次/天",
      "planPriority": "✓ 優先處理",
      "planAllFeatures": "✓ 所有功能",
      "planBest": "最划算",
      "planYearly": "年度會員",
      "planYearlyLimit": "200 次/天",
      "planTopPriority": "✓ 最高優先級",
      "planDedicatedSupport": "✓ 專屬客服",
      "planEarlyAccess": "✓ 新功能搶先",
      "contactSupport": "📱 如需購買會員，請在 Telegram 中聯繫客服",
      "footer": "© 2025 圖生視頻 Bot - Powered by Aliyun AI",
      "membershipCenter": "⭐ 會員中心",
      "membershipHint1": "請返回 Telegram Bot，發送 /membership 命令查看詳細套餐信息並購買。",
      "membershipHint2": "或聯繫客服購買會員。",
      "close": "關閉",
      "expiryDate": "到期時間",
      "daysLeft": "剩餘天數",
      "days": "天",
      "upgradeHint": "升級會員享受更多次數",
      "success": "✅ 成功",
      "failed": "❌ 失敗",
      "model": "模型",
      "effect": "特效",
      "prompt": "提示"
    },
    "messages": {
      "loading": "加載中...",
      "loadError": "❌ 加載失敗，請刷新重試"
    }
  },
  'en-US': {
    "profile": {
      "title": "Profile",
      "refresh": "🔄 Refresh",
      "userInfo": "👤 User Info",
      "username": "Username",
      "firstName": "Name",
      "registeredDate": "Registered",
      "totalGenerated": "Total Generated",
      "membershipStatus": "Membership Status",
      "upgradeMembership": "⭐ Upgrade Membership",
      "todayUsage": "📈 Today's Usage",
      "usedCount": "Used",
      "remainingCount": "Remaining",
      "dailyLimit": "💡 Daily Limit: {limit} times",
      "todayHistory": "📝 Today's History",
      "emptyHistory": "📭 No usage records today",
      "membershipPlans": "💎 Membership Plans",
      "planFree": "Free User",
      "planFreeLimit": "3 times/day",
      "planAllModels": "✓ All Models",
      "planAllEffects": "✓ All Effects",
      "planHot": "Popular",
      "planMonthly": "Monthly Member",
      "planMonthlyLimit": "100 times/day",
      "planPriority": "✓ Priority Processing",
      "planAllFeatures": "✓ All Features",
      "planBest": "Best Value",
      "planYearly": "Yearly Member",
      "planYearlyLimit": "200 times/day",
      "planTopPriority": "✓ Top Priority",
      "planDedicatedSupport": "✓ Dedicated Support",
      "planEarlyAccess": "✓ Early Access",
      "contactSupport": "📱 To purchase membership, contact support on Telegram",
      "footer": "© 2025 Image to Video Bot - Powered by Aliyun AI",
      "membershipCenter": "⭐ Membership Center",
      "membershipHint1": "Return to Telegram Bot and send /membership to view plans and purchase.",
      "membershipHint2": "Or contact support to purchase membership.",
      "close": "Close",
      "expiryDate": "Expiry Date",
      "daysLeft": "Days Left",
      "days": "days",
      "upgradeHint": "Upgrade for more daily usage",
      "success": "✅ Success",
      "failed": "❌ Failed",
      "model": "Model",
      "effect": "Effect",
      "prompt": "Prompt"
    },
    "messages": {
      "loading": "Loading...",
      "loadError": "❌ Failed to load, please refresh"
    }
  },
  'ja-JP': {
    "profile": {
      "title": "プロフィール",
      "refresh": "🔄 更新",
      "userInfo": "👤 ユーザー情報",
      "username": "ユーザー名",
      "firstName": "名前",
      "registeredDate": "登録日",
      "totalGenerated": "累計生成",
      "membershipStatus": "メンバーシップステータス",
      "upgradeMembership": "⭐ メンバーシップをアップグレード",
      "todayUsage": "📈 本日の使用状況",
      "usedCount": "使用済み",
      "remainingCount": "残り",
      "dailyLimit": "💡 毎日の制限: {limit} 回",
      "todayHistory": "📝 本日の履歴",
      "emptyHistory": "📭 本日の使用記録はありません",
      "membershipPlans": "💎 メンバーシップ プラン",
      "planFree": "無料ユーザー",
      "planFreeLimit": "1 日 3 回",
      "planAllModels": "✓ すべてのモデル",
      "planAllEffects": "✓ すべてのエフェクト",
      "planHot": "人気",
      "planMonthly": "月間メンバー",
      "planMonthlyLimit": "1 日 100 回",
      "planPriority": "✓ 優先処理",
      "planAllFeatures": "✓ すべての機能",
      "planBest": "最高価値",
      "planYearly": "年間メンバー",
      "planYearlyLimit": "1 日 200 回",
      "planTopPriority": "✓ 最優先",
      "planDedicatedSupport": "✓ 専任サポート",
      "planEarlyAccess": "✓ 早期アクセス",
      "contactSupport": "📱 メンバーシップを購入するには、Telegram でサポートにお問い合わせください",
      "footer": "© 2025 Image to Video Bot - Powered by Aliyun AI",
      "membershipCenter": "⭐ メンバーシップセンター",
      "membershipHint1": "Telegram Bot に戻り、/membership を送信して、プランを表示して購入してください。",
      "membershipHint2": "またはサポートに連絡してメンバーシップを購入してください。",
      "close": "閉じる",
      "expiryDate": "有効期限",
      "daysLeft": "残り日数",
      "days": "日",
      "upgradeHint": "毎日の使用数を増やすためにアップグレード",
      "success": "✅ 成功",
      "failed": "❌ 失敗",
      "model": "モデル",
      "effect": "エフェクト",
      "prompt": "プロンプト"
    },
    "messages": {
      "loading": "読み込み中...",
      "loadError": "❌ 読み込みに失敗しました。ページを更新してください"
    }
  }
};

// 読み込み完了
Object.entries(profileTranslations).forEach(([lang, data]) => {
  const filePath = path.join(i18nDir, `${lang}.json`);
  
  // 現在の内容を读み込む
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch(e) {
    console.log(`新規作成: ${lang}.json`);
  }
  
  // マージ
  const merged = { ...existing, ...data };
  
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`✅ 更新完了: ${lang}.json`);
});

console.log('✨ すべてのファイルが更新されました！');

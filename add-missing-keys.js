const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, 'webapp', 'i18n');

// 添加缺失的翻译键
const additionalTranslations = {
  'zh-CN': {
    "messages": {
      "error": "发生错误"
    }
  },
  'zh-TW': {
    "messages": {
      "error": "發生錯誤"
    }
  },
  'en-US': {
    "messages": {
      "error": "An error occurred"
    }
  },
  'ja-JP': {
    "messages": {
      "error": "エラーが発生しました"
    }
  }
};

const languages = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'];

languages.forEach(lang => {
  const filePath = path.join(i18nDir, `${lang}.json`);
  
  // 读取现有内容
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch(e) {
    console.log(`文件不存在，将新建: ${lang}.json`);
  }
  
  // 确保 messages 对象存在
  if (!data.messages) {
    data.messages = {};
  }
  
  // 合并新的翻译
  data.messages = { ...data.messages, ...additionalTranslations[lang].messages };
  
  // 写回文件
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ 已更新 ${lang}.json 中的 messages.error`);
});

console.log('✨ 所有缺失的翻译已添加！');

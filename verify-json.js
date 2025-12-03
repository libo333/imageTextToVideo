const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, 'webapp', 'i18n');
const languages = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'];

languages.forEach(lang => {
  try {
    const filePath = path.join(i18nDir, `${lang}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`✅ ${lang}.json 文件有效，包含 ${Object.keys(data).length} 个顶级键`);
    
    // 检查 profile 键是否存在
    if (data.profile) {
      console.log(`   └─ profile 包含 ${Object.keys(data.profile).length} 个翻译`);
    }
  } catch(e) {
    console.error(`❌ ${lang}.json 解析失败：${e.message}`);
  }
});

console.log('\n✨ JSON 文件验证完成！');

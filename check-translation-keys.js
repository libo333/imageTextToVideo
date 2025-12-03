const fs = require('fs');
const path = require('path');

// 读取 user-center.js 中使用的所有 i18n.t() 调用
const userCenterCode = fs.readFileSync(path.join(__dirname, 'webapp', 'user-center.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'webapp', 'app.js'), 'utf8');

// 匹配 i18n.t('...') 模式
const keyPattern = /i18n\.t\(['"]([^'"]+)['"]/g;

const usedKeys = new Set();
let match;

// 从 user-center.js 提取
while ((match = keyPattern.exec(userCenterCode)) !== null) {
    usedKeys.add(match[1]);
}

// 从 app.js 提取
while ((match = keyPattern.exec(appCode)) !== null) {
    usedKeys.add(match[1]);
}

console.log('📋 使用的翻译键:\n');

// 检查 HTML 文件中的 data-i18n 属性
const htmlFiles = ['index.html', 'user-center.html'];
htmlFiles.forEach(file => {
    const content = fs.readFileSync(path.join(__dirname, 'webapp', file), 'utf8');
    const htmlKeyPattern = /data-i18n=['"]([^'"]+)['"]/g;
    while ((match = htmlKeyPattern.exec(content)) !== null) {
        usedKeys.add(match[1]);
    }
});

const sortedKeys = Array.from(usedKeys).sort();
sortedKeys.forEach(key => console.log(`  - ${key}`));

console.log(`\n✓ 总共使用了 ${sortedKeys.length} 个翻译键\n`);

// 验证每个键在所有语言文件中都存在
const languages = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'];
const i18nDir = path.join(__dirname, 'webapp', 'i18n');

const missingKeys = {};

languages.forEach(lang => {
    const filePath = path.join(i18nDir, `${lang}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const missing = [];
    sortedKeys.forEach(key => {
        const keys = key.split('.');
        let value = data;
        for (const k of keys) {
            value = value[k];
            if (!value) break;
        }
        if (!value) {
            missing.push(key);
        }
    });

    if (missing.length > 0) {
        missingKeys[lang] = missing;
    }
});

if (Object.keys(missingKeys).length > 0) {
    console.error('❌ 缺失的翻译键:\n');
    Object.entries(missingKeys).forEach(([lang, keys]) => {
        console.error(`  ${lang}:`);
        keys.forEach(key => console.error(`    - ${key}`));
    });
} else {
    console.log('✅ 所有使用的翻译键都存在于所有语言文件中！');
}

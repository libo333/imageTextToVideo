#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🌍 多语言系统完整性检查\n');
console.log('='.repeat(70));

// 读取所有 JSON 文件
const languages = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'];
const i18nDir = path.join(__dirname, 'webapp', 'i18n');
const translations = {};

languages.forEach(lang => {
    const filePath = path.join(i18nDir, `${lang}.json`);
    translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

// 获取所有唯一的顶级键
const topLevelKeys = new Set();
languages.forEach(lang => {
    Object.keys(translations[lang]).forEach(key => topLevelKeys.add(key));
});

// 显示按语言的键统计
console.log('\n📊 按语言的翻译统计\n');

const stats = {};
languages.forEach(lang => {
    const keyCount = countKeys(translations[lang]);
    stats[lang] = keyCount;
    console.log(`  ${lang.padEnd(8)} : ${keyCount.toLocaleString('en-US').padStart(4)} 个翻译键`);
});

console.log('\n');
console.log('='.repeat(70));
console.log('\n📁 按类别的翻译键\n');

// 按类别显示
Array.from(topLevelKeys).sort().forEach(category => {
    const categoryData = translations['zh-CN'][category];
    const count = categoryData && typeof categoryData === 'object' ? 
        countKeys(categoryData) : 1;
    
    console.log(`  ${category.padEnd(12)} : ${count.toString().padStart(3)} 个键`);
});

// 检查所有语言的一致性
console.log('\n');
console.log('='.repeat(70));
console.log('\n🔍 跨语言一致性检查\n');

let inconsistencies = 0;

languages.forEach((lang, idx) => {
    if (idx > 0) return; // 只用第一个语言作为参考
    
    const reference = translations[lang];
    
    languages.forEach(checkLang => {
        if (checkLang === lang) return;
        
        const missing = [];
        const extra = [];
        
        // 检查缺失的键
        const refKeys = getAllKeys(reference);
        const checkKeys = getAllKeys(translations[checkLang]);
        
        refKeys.forEach(key => {
            if (!checkKeys.includes(key)) {
                missing.push(key);
            }
        });
        
        checkKeys.forEach(key => {
            if (!refKeys.includes(key)) {
                extra.push(key);
            }
        });
        
        if (missing.length === 0 && extra.length === 0) {
            console.log(`  ✅ ${lang} ↔️  ${checkLang} : 完全一致`);
        } else {
            console.log(`  ⚠️  ${lang} ↔️  ${checkLang} :`);
            if (missing.length > 0) {
                console.log(`       缺失: ${missing.join(', ')}`);
            }
            if (extra.length > 0) {
                console.log(`       额外: ${extra.join(', ')}`);
            }
            inconsistencies++;
        }
    });
});

// 样本检查
console.log('\n');
console.log('='.repeat(70));
console.log('\n💬 样本翻译对比\n');

const sampleKeys = [
    'app.title',
    'profile.title',
    'generate.button',
    'profile.success',
    'profile.failed'
];

sampleKeys.forEach(key => {
    console.log(`  ${key}`);
    languages.forEach(lang => {
        const value = getValueByPath(translations[lang], key);
        if (value) {
            console.log(`    ${lang} : "${value}"`);
        }
    });
    console.log('');
});

console.log('='.repeat(70));
console.log('\n✨ 检查完成！\n');

if (inconsistencies > 0) {
    console.log(`⚠️  发现 ${inconsistencies} 处不一致\n`);
} else {
    console.log('✅ 所有语言完全一致，多语言系统已准备就绪！\n');
}

// 辅助函数
function countKeys(obj) {
    let count = 0;
    
    function traverse(o) {
        Object.values(o).forEach(v => {
            if (typeof v === 'object' && v !== null) {
                traverse(v);
            } else {
                count++;
            }
        });
    }
    
    traverse(obj);
    return count;
}

function getAllKeys(obj, prefix = '') {
    const keys = [];
    
    function traverse(o, p) {
        Object.entries(o).forEach(([k, v]) => {
            const fullKey = p ? `${p}.${k}` : k;
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                traverse(v, fullKey);
            } else {
                keys.push(fullKey);
            }
        });
    }
    
    traverse(obj, prefix);
    return keys;
}

function getValueByPath(obj, path) {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
}

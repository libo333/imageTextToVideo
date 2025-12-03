#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n📋 多语言系统实现检查清单\n');
console.log('=' .repeat(60));

const checks = [
    {
        name: '核心 i18n 文件',
        items: [
            { path: 'webapp/i18n/i18n.js', type: 'file' },
            { path: 'webapp/language-selector.css', type: 'file' },
            { path: 'webapp/language-switcher.js', type: 'file' }
        ]
    },
    {
        name: '翻译文件',
        items: [
            { path: 'webapp/i18n/zh-CN.json', type: 'file' },
            { path: 'webapp/i18n/zh-TW.json', type: 'file' },
            { path: 'webapp/i18n/en-US.json', type: 'file' },
            { path: 'webapp/i18n/ja-JP.json', type: 'file' }
        ]
    },
    {
        name: '页面集成',
        items: [
            { path: 'webapp/index.html', type: 'file' },
            { path: 'webapp/app.js', type: 'file' },
            { path: 'webapp/user-center.html', type: 'file' },
            { path: 'webapp/user-center.js', type: 'file' }
        ]
    },
    {
        name: '文档',
        items: [
            { path: 'webapp/I18N_GUIDE.md', type: 'file' },
            { path: 'docs/reference/MULTI_LANGUAGE_IMPLEMENTATION.md', type: 'file' }
        ]
    }
];

let allPassed = true;

checks.forEach(section => {
    console.log(`\n✓ ${section.name}`);
    
    section.items.forEach(item => {
        const fullPath = path.join(__dirname, item.path);
        const exists = fs.existsSync(fullPath);
        
        if (exists) {
            const stats = fs.statSync(fullPath);
            const size = (stats.size / 1024).toFixed(1);
            console.log(`  ✅ ${item.path} (${size} KB)`);
        } else {
            console.log(`  ❌ ${item.path} - 不存在`);
            allPassed = false;
        }
    });
});

console.log('\n' + '='.repeat(60));

// 检查 HTML 集成
console.log('\n📝 HTML 集成检查\n');

const htmlFiles = {
    'webapp/index.html': [
        'i18n/i18n.js',
        'language-selector.css',
        'language-switcher.js',
        'data-i18n'
    ],
    'webapp/user-center.html': [
        'i18n/i18n.js',
        'language-selector.css',
        'language-switcher.js',
        'data-i18n'
    ]
};

Object.entries(htmlFiles).forEach(([filePath, requirements]) => {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        console.log(`❌ ${filePath} 不存在`);
        allPassed = false;
        return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const missing = requirements.filter(req => !content.includes(req));
    
    if (missing.length === 0) {
        console.log(`✅ ${filePath}`);
    } else {
        console.log(`⚠️  ${filePath} 缺少: ${missing.join(', ')}`);
        allPassed = false;
    }
});

// 验证 JSON 文件
console.log('\n🔍 JSON 文件验证\n');

const languages = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'];
languages.forEach(lang => {
    const filePath = path.join(__dirname, 'webapp', 'i18n', `${lang}.json`);
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const keyCount = Object.keys(data).length;
        console.log(`✅ ${lang}.json (${keyCount} 个顶级键)`);
    } catch(e) {
        console.log(`❌ ${lang}.json - JSON 解析错误: ${e.message}`);
        allPassed = false;
    }
});

// 最终结果
console.log('\n' + '='.repeat(60));
if (allPassed) {
    console.log('\n✨ 所有检查都通过了！多语言系统已准备就绪。\n');
    process.exit(0);
} else {
    console.log('\n⚠️  存在一些问题需要解决。\n');
    process.exit(1);
}

"""
# 🌍 多语言功能实现说明

## ✨ 功能概览

已完整实现多语言支持系统，支持以下语言：
- 🇨🇳 简体中文 (zh-CN)
- 🇹🇼 繁體中文 (zh-TW)
- 🇬🇧 English (en-US)
- 🇯🇵 日本語 (ja-JP)

## 📁 新增文件结构

```
webapp/
├── index.html                 # 更新：添加语言选择器
├── app.js                     # 更新：集成多语言支持
├── language-selector.css      # 新增：语言选择器样式
├── language-switcher.js       # 新增：语言切换逻辑
└── i18n/
    ├── i18n.js               # 新增：i18n 核心模块
    ├── zh-CN.json            # 新增：简体中文翻译
    ├── zh-TW.json            # 新增：繁體中文翻译
    ├── en-US.json            # 新增：英文翻译
    └── ja-JP.json            # 新增：日文翻译
```

## 🎯 核心功能

### 1. i18n.js - 翻译管理核心

```javascript
// 获取翻译文本
i18n.t('app.title')  // 返回 "图文生视频创作工具"

// 切换语言
i18n.setLanguage('en-US')

// 获取当前语言
i18n.getLanguage()  // 返回 'en-US'

// 获取所有支持的语言
i18n.getSupportedLanguages()
```

**特性：**
- ✅ 自动检测浏览器语言并加载对应语言
- ✅ 保存用户语言偏好到 localStorage
- ✅ 支持嵌套翻译 key（如 `button.generate`）
- ✅ 支持参数替换（如 `{name}`）
- ✅ 缺少翻译时自动降级到中文

### 2. language-switcher.js - 语言选择器

提供用户友好的语言选择面板：
- 固定在页面右上角
- 点击展开语言列表
- 显示当前选中的语言
- 自动更新 DOM 中的所有翻译内容

### 3. HTML 翻译标记

使用数据属性标记需要翻译的元素：

```html
<!-- 文本翻译 -->
<h1 data-i18n="app.title">图文生视频创作工具</h1>

<!-- 占位符翻译 -->
<input data-i18n-placeholder="prompt.placeholder">

<!-- 标题翻译 -->
<button data-i18n-title="button.help">帮助</button>

<!-- HTML 内容翻译 -->
<div data-i18n-html="app.description">...</div>
```

## 🚀 使用方法

### 为新文本添加翻译

#### 步骤 1：添加到所有语言文件

编辑 `webapp/i18n/*.json` 文件：

```json
// zh-CN.json
{
  "myFeature": {
    "title": "我的功能",
    "description": "这是功能描述"
  }
}

// en-US.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is feature description"
  }
}
```

#### 步骤 2：在 HTML 中使用

```html
<h2 data-i18n="myFeature.title">我的功能</h2>
<p data-i18n="myFeature.description">这是功能描述</p>
```

#### 步骤 3：在 JavaScript 中使用

```javascript
// 简单翻译
const title = i18n.t('myFeature.title');

// 带参数的翻译
const message = i18n.t('messages.welcome', { name: 'John' });

// 显示多语言提示信息
showMessage('myFeature.title');  // 自动翻译
```

## 🔄 工作流程

```
用户页面加载
     ↓
i18n.js 初始化
     ↓
检测语言偏好 (localStorage > 浏览器语言 > 默认中文)
     ↓
加载对应语言的 JSON 文件
     ↓
更新页面中所有 [data-i18n] 元素
     ↓
用户点击语言按钮
     ↓
选择新语言
     ↓
保存到 localStorage
     ↓
触发 languageChanged 事件
     ↓
更新所有 DOM 元素
```

## 📝 翻译内容结构

每个语言文件遵循相同的结构：

```json
{
  "app": {
    "title": "应用标题",
    "subtitle": "应用描述"
  },
  "tabs": {
    "create": "创作工具",
    "profile": "个人中心"
  },
  "upload": {
    "title": "上传图片",
    "drag": "点击或拖拽",
    "error": {
      "size": "文件过大",
      "type": "不支持的格式"
    }
  },
  "messages": {
    "success": "成功",
    "error": "错误"
  }
}
```

## 🎨 语言选择器外观

- 🎯 固定在右上角（固定定位）
- 🎨 渐变紫色背景
- ✨ 平滑过渡动画
- 📱 响应式设计（移动端隐藏文本）
- 🌀 悬停时语言图标旋转

## 💾 数据持久化

当用户切换语言时：
1. 语言偏好保存到 `localStorage['app-language']`
2. 页面刷新后会自动加载已保存的语言
3. localStorage 由浏览器自动管理

## 🔧 自定义和扩展

### 添加新语言

1. 在 `webapp/i18n/` 创建新的 JSON 文件（如 `ko-KR.json`）
2. 在 `i18n.js` 的 `supportedLanguages` 和 `languageNames` 中添加新语言
3. 完成翻译即可

### 修改语言选择器样式

编辑 `language-selector.css` 中的 CSS 变量和类：

```css
.lang-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);  /* 修改渐变色 */
}
```

### 自定义翻译 key 命名

推荐遵循的命名约定：
- `component.action`（如 `button.generate`）
- `section.subsection.item`（如 `upload.error.size`）
- `messages.type`（如 `messages.success`）

## 🐛 调试技巧

### 在浏览器控制台测试

```javascript
// 检查当前语言
i18n.getLanguage()

// 测试翻译
i18n.t('app.title')

// 切换语言
i18n.setLanguage('en-US')

// 获取所有语言
i18n.getSupportedLanguages()

// 监听语言改变事件
document.addEventListener('languageChanged', (e) => {
    console.log('语言已切换:', e.detail.language);
});
```

### 查看翻译文件是否加载

```javascript
// 检查翻译文件是否已加载
console.log(i18n.translations)
```

## ⚡ 性能优化

- 翻译文件平行加载（所有语言同时加载）
- 缓存已加载的翻译
- 使用 localStorage 避免重复检测浏览器语言
- 仅在必要时更新 DOM

## 🌐 浏览器兼容性

支持所有现代浏览器：
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- 移动浏览器（iOS Safari, Chrome Mobile）

## 📊 当前翻译覆盖范围

已翻译的内容：
- ✅ 应用标题和说明
- ✅ 标签页名称
- ✅ 上传相关文本
- ✅ AI 引擎选择
- ✅ 运动幅度控制
- ✅ 提示词输入
- ✅ 生成按钮
- ✅ 进度显示
- ✅ 用户中心（基础）
- ✅ 错误和提示消息

## 📈 未来计划

- [ ] 实现右到左 (RTL) 语言支持（阿拉伯语）
- [ ] 添加更多语言（韩文、越南文、西班牙文）
- [ ] 支持时间和数字本地化
- [ ] 提供 Web 端翻译编辑界面
- [ ] 支持翻译 ICU 消息格式

## 📞 常见问题

**Q: 如何在 Node.js 后端也实现多语言？**
A: 可以使用相同的 JSON 文件结构，使用 node-i18n 或 i18next 库。

**Q: 如何处理 RTL 语言？**
A: 需要添加 `<html dir="rtl">` 并调整 CSS，目前暂未实现。

**Q: 翻译文件太大会影响性能吗？**
A: 当前 4 个语言文件总共约 15KB，加载不会有性能问题。

**Q: 可以动态加载翻译吗？**
A: 可以，修改 i18n.js 中的 `loadTranslations()` 方法即可实现按需加载。

---

**实现完成！** ✨ 现在用户可以用 4 种语言使用您的应用了！
"""

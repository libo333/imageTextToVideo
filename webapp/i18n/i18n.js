/**
 * 轻量级多语言 (i18n) 系统
 * 支持语言: 简体中文、繁体中文、英文、日文
 */

class I18n {
    constructor() {
        this.translations = {};
        this.languageNames = {
            'zh-CN': '简体中文',
            'zh-TW': '繁體中文',
            'en-US': 'English',
            'ja-JP': '日本語'
        };
        this.supportedLanguages = Object.keys(this.languageNames);
        this.currentLanguage = this.getDefaultLanguage();
        this.loadTranslations();
    }

    /**
     * 获取默认语言
     * 优先级: 本地存储 > 浏览器语言 > 简体中文
     */
    getDefaultLanguage() {
        // 1. 检查本地存储
        const saved = localStorage.getItem('app-language');
        if (saved && this.supportedLanguages && this.supportedLanguages.includes(saved)) {
            return saved;
        }

        // 2. 检查浏览器语言
        const browserLang = navigator.language || navigator.userLanguage;
        const supportedLangs = {
            'zh-CN': 'zh-CN',
            'zh-cn': 'zh-CN',
            'zh-Hans': 'zh-CN',
            'zh-TW': 'zh-TW',
            'zh-tw': 'zh-TW',
            'zh-Hant': 'zh-TW',
            'en': 'en-US',
            'en-US': 'en-US',
            'en-GB': 'en-US',
            'ja': 'ja-JP',
            'ja-JP': 'ja-JP'
        };
        
        if (supportedLangs[browserLang]) {
            return supportedLangs[browserLang];
        }

        // 3. 默认简体中文
        return 'zh-CN';
    }

    /**
     * 动态加载翻译文件
     */
    async loadTranslations() {
        try {
            // 平行加载所有语言
            const promises = this.supportedLanguages.map(lang =>
                fetch(`./i18n/${lang}.json`)
                    .then(res => res.json())
                    .then(data => {
                        this.translations[lang] = data;
                    })
                    .catch(err => console.error(`Failed to load ${lang}:`, err))
            );

            await Promise.all(promises);
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    /**
     * 获取翻译文本
     * @param {string} key - 翻译键 (支持嵌套，如 "button.generate")
     * @param {object} params - 替换参数 (如 {name: 'John'})
     * @returns {string} - 翻译后的文本
     */
    t(key, params = {}) {
        let text = this.getNestedValue(this.translations[this.currentLanguage] || {}, key);
        
        // 如果找不到翻译，尝试从中文获取
        if (!text) {
            text = this.getNestedValue(this.translations['zh-CN'] || {}, key);
        }
        
        // 如果还是找不到，返回 key 本身
        if (!text) {
            return key;
        }

        // 替换参数
        Object.keys(params).forEach(key => {
            text = text.replace(new RegExp(`{${key}}`, 'g'), params[key]);
        });

        return text;
    }

    /**
     * 获取嵌套对象的值
     * @private
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    /**
     * 切换语言
     */
    setLanguage(lang) {
        if (this.supportedLanguages.includes(lang)) {
            this.currentLanguage = lang;
            localStorage.setItem('app-language', lang);
            this.updatePageLanguage();
            return true;
        }
        return false;
    }

    /**
     * 获取当前语言
     */
    getLanguage() {
        return this.currentLanguage;
    }

    /**
     * 获取语言名称
     */
    getLanguageName(lang = this.currentLanguage) {
        return this.languageNames[lang] || lang;
    }

    /**
     * 获取所有支持的语言列表
     */
    getSupportedLanguages() {
        return this.supportedLanguages.map(lang => ({
            code: lang,
            name: this.languageNames[lang]
        }));
    }

    /**
     * 更新页面中所有需要翻译的元素
     */
    updatePageLanguage() {
        // 更新所有具有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // 更新所有具有 data-i18n-placeholder 属性的元素
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // 更新所有具有 data-i18n-title 属性的元素
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // 更新所有具有 data-i18n-html 属性的元素
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            element.innerHTML = this.t(key);
        });

        // 触发自定义事件，通知应用语言已改变
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLanguage }
        }));
    }

    /**
     * 翻译 HTML 字符串中包含 data-i18n 属性的元素
     * 用于动态生成的 HTML 内容
     */
    translateHTML(htmlString) {
        const temp = document.createElement('div');
        temp.innerHTML = htmlString;
        
        // 翻译所有具有 data-i18n 属性的元素
        temp.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // 翻译所有具有 data-i18n-placeholder 属性的元素
        temp.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // 翻译所有具有 data-i18n-title 属性的元素
        temp.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        return temp.innerHTML;
    }
}

// 创建全局 i18n 实例
const i18n = new I18n();

// 异步加载翻译文件并更新页面
(async () => {
    try {
        await i18n.loadTranslations();
        i18n.updatePageLanguage();
    } catch (error) {
        console.error('Failed to load i18n translations:', error);
    }
})();

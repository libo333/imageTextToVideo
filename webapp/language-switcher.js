/**
 * 多语言集成模块
 * 与 app.js 配合使用，处理语言切换和 UI 更新
 */

class LanguageSwitcher {
    constructor() {
        this.langBtn = document.getElementById('langBtn');
        this.langMenu = document.getElementById('langMenu');
        this.langName = document.getElementById('langName');
        this.langOptions = document.querySelectorAll('.lang-option');
        
        this.init();
    }

    init() {
        // 设置初始语言显示
        this.updateLanguageDisplay();

        // 语言按钮点击
        if (this.langBtn) {
            this.langBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
        }

        // 语言选项点击
        this.langOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const lang = option.getAttribute('data-lang');
                this.selectLanguage(lang);
            });
        });

        // 点击页面其他地方关闭菜单
        document.addEventListener('click', () => {
            this.closeMenu();
        });

        // 监听语言改变事件
        document.addEventListener('languageChanged', () => {
            this.updateLanguageDisplay();
            this.updateMenuActiveState();
        });
    }

    toggleMenu() {
        if (this.langMenu.style.display === 'none') {
            this.openMenu();
        } else {
            this.closeMenu();
        }
    }

    openMenu() {
        this.langMenu.style.display = 'block';
        this.langBtn.classList.add('active');
        this.updateMenuActiveState();
    }

    closeMenu() {
        this.langMenu.style.display = 'none';
        this.langBtn.classList.remove('active');
    }

    selectLanguage(lang) {
        i18n.setLanguage(lang);
        this.closeMenu();
    }

    updateLanguageDisplay() {
        const langCode = i18n.getLanguage();
        const langName = i18n.getLanguageName(langCode);
        
        if (this.langName) {
            this.langName.textContent = langName;
        }

        // 更新 HTML lang 属性
        document.documentElement.lang = langCode;
        document.documentElement.setAttribute('data-language', langCode);
    }

    updateMenuActiveState() {
        const currentLang = i18n.getLanguage();
        this.langOptions.forEach(option => {
            const lang = option.getAttribute('data-lang');
            if (lang === currentLang) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
}

// 页面加载完成后初始化
async function initLanguageSwitcher() {
    // 等待 i18n 加载完成（最多等待 5 秒）
    let waitCount = 0;
    while (typeof i18n === 'undefined' && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }

    if (typeof i18n === 'undefined') {
        console.error('i18n failed to initialize');
        return;
    }

    new LanguageSwitcher();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguageSwitcher);
} else {
    initLanguageSwitcher();
}

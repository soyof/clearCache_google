/**
 * 弹窗脚本
 * 处理弹窗界面的交互和功能
 */

// 导入工具模块
import {
    BrowsingDataManager,
    ButtonManager,
    CleanerManager,
    SettingsManager,
    StatusManager,
    TabManager,
    ThemeManager,
    getMessage,
    initializePageI18n,
    getUserLanguage,
    switchLanguage
} from './utils/index.js';

// 获取当前标签页信息
let currentTab = null;
let currentUrl = '';

// DOM 元素
const elements = {
    currentUrl: document.getElementById('current-url'),
    status: document.getElementById('status'),
    statusContainer: document.querySelector('.status-container'),
    progress: document.getElementById('progress'),
    progressFill: document.querySelector('.progress-fill'),

    // 针对当前网站的按钮
    normalReload: document.getElementById('normal-reload'),
    hardReloadOnly: document.getElementById('hard-reload-only'),
    clearCurrentAll: document.getElementById('clear-current-all'),
    hardReloadCacheOnly: document.getElementById('hard-reload-cache-only'),
    hardReload: document.getElementById('hard-reload'),
    clearCurrentCookies: document.getElementById('clear-current-cookies'),
    clearLocalStorage: document.getElementById('clear-localstorage'),
    clearSessionStorage: document.getElementById('clear-sessionstorage'),
    clearCurrentIndexedDB: document.getElementById('clear-current-indexeddb'),

    // 针对整个浏览器的按钮
    clearAll: document.getElementById('clear-all'),
    clearCache: document.getElementById('clear-cache'),
    clearCookies: document.getElementById('clear-cookies'),
    clearIndexedDB: document.getElementById('clear-indexeddb'),
    clearHistory: document.getElementById('clear-history'),
    clearDownloads: document.getElementById('clear-downloads'),
    clearDownloadsFiles: document.getElementById('clear-downloads-files'),

    // 复选框
    clearPasswords: document.getElementById('clear-passwords'),
    clearFormData: document.getElementById('clear-formdata'),
    includeProtected: document.getElementById('include-protected'),

    // 高级设置元素
    themeRadios: document.querySelectorAll('input[name="theme"]'),
    enableNotifications: document.getElementById('enable-notifications'),
    notificationSound: document.getElementById('notification-sound'),
    languageSelect: document.getElementById('language-select'),
};

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化国际化
    await initializePageI18n();

    await initializeCurrentTab();
    loadVersionInfo();
    bindEventListeners();
    loadSettings();
    restoreTabState();
    initializeAdvancedSettings();

    // 调整标签页文本大小
    adjustTabTextSize();

    // Service Worker状态检查已移除
});

/**
 * 初始化当前标签页信息
 */
async function initializeCurrentTab() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            currentTab = tabs[0];
            currentUrl = currentTab.url;

            // 显示当前URL
            if (elements.currentUrl) {
                elements.currentUrl.textContent = formatUrl(currentUrl);
                elements.currentUrl.title = currentUrl;
            }
        }
    } catch (error) {
        showStatus(getMessage('cannotGetCurrentTabInfo'), 'error');
    }
}

/**
 * 格式化URL
 * @param {string} url - URL
 * @returns {string} 格式化后的URL
 */
function formatUrl(url) {
    try {
        if (!url) return getMessage('unknownSite');

        // 移除协议
        let formattedUrl = url.replace(/^(https?:\/\/)/, '');

        // 移除路径和查询参数
        formattedUrl = formattedUrl.split('/')[0];

        // 如果URL太长，截断它
        if (formattedUrl.length > 30) {
            formattedUrl = formattedUrl.substring(0, 27) + '...';
        }

        return formattedUrl;
    } catch (error) {
        return getMessage('unknownSite');
    }
}

/**
 * 加载版本信息
 */
async function loadVersionInfo() {
    try {
        const manifest = chrome.runtime.getManifest();
        const versionElement = document.querySelector('.version');
        if (versionElement) {
            versionElement.textContent = 'v' + manifest.version;
        }
    } catch (error) {
        // 忽略版本加载错误
    }
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 当前网站标签页按钮
    bindButtonEvent(elements.normalReload, normalReload);
    bindButtonEvent(elements.hardReloadOnly, hardReloadOnly);
    bindButtonEvent(elements.clearCurrentAll, clearCurrentWebsiteData);
    bindButtonEvent(elements.hardReloadCacheOnly, hardReloadCacheOnly);
    bindButtonEvent(elements.hardReload, hardReloadPage);
    bindButtonEvent(elements.clearCurrentCookies, clearCookies);
    bindButtonEvent(elements.clearLocalStorage, clearLocalStorage);
    bindButtonEvent(elements.clearSessionStorage, clearSessionStorage);
    bindButtonEvent(elements.clearCurrentIndexedDB, clearCurrentIndexedDB);

    // 整个浏览器标签页按钮
    bindButtonEvent(elements.clearAll, clearAllData);
    bindButtonEvent(elements.clearCache, clearCache);
    bindButtonEvent(elements.clearCookies, clearCookies);
    bindButtonEvent(elements.clearIndexedDB, clearIndexedDB);
    bindButtonEvent(elements.clearHistory, clearHistory);
    bindButtonEvent(elements.clearDownloads, clearDownloads);
    bindButtonEvent(elements.clearDownloadsFiles, clearDownloadFiles);

    // Tab切换
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', handleTabClick);
    });

    // 主题切换
    elements.themeRadios.forEach(radio => {
        radio.addEventListener('change', handleThemeChange);
    });

    // 设置变更
    if (elements.clearPasswords) {
        elements.clearPasswords.addEventListener('change', saveAdvancedSettings);
    }
    if (elements.clearFormData) {
        elements.clearFormData.addEventListener('change', saveAdvancedSettings);
    }
    if (elements.includeProtected) {
        elements.includeProtected.addEventListener('change', saveAdvancedSettings);
    }
    if (elements.enableNotifications) {
        elements.enableNotifications.addEventListener('change', saveAdvancedSettings);
    }
    if (elements.notificationSound) {
        elements.notificationSound.addEventListener('change', saveAdvancedSettings);
    }

    // 语言切换
    if (elements.languageSelect) {
        elements.languageSelect.addEventListener('change', handleLanguageChange);
    }
}

/**
 * 绑定按钮事件
 * @param {HTMLElement} button - 按钮元素
 * @param {Function} handler - 事件处理函数
 */
function bindButtonEvent(button, handler) {
    if (button) {
        button.addEventListener('click', handler);
    }
}

/**
 * 处理标签页切换
 * @param {Event} event - 事件对象
 */
function handleTabClick(event) {
    const tabId = event.currentTarget.dataset.tab;
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    TabManager.switchTo(tabId, tabButtons, tabContents);
}

/**
 * 恢复标签页状态
 */
async function restoreTabState() {
    try {
        const result = await chrome.storage.local.get('activeTab');
        if (result.activeTab) {
            const tabButtons = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');
            TabManager.switchTo(result.activeTab, tabButtons, tabContents);
        }
    } catch (error) {
        // 忽略恢复标签页状态错误
    }
}

/**
 * 加载设置
 */
async function loadSettings() {
    try {
        const settings = await SettingsManager.get([
            'clearPasswords',
            'clearFormData',
            'includeProtected'
        ]);

        if (elements.clearPasswords) {
            elements.clearPasswords.checked = settings.clearPasswords !== false;
        }

        if (elements.clearFormData) {
            elements.clearFormData.checked = settings.clearFormData !== false;
        }

        if (elements.includeProtected) {
            elements.includeProtected.checked = settings.includeProtected !== false;
        }
    } catch (error) {
        showStatus(getMessage('loadSettingsFailed'), 'error');
    }
}

/**
 * 执行清理操作
 * @param {Function} cleanupFunction - 清理函数
 * @param {HTMLElement} button - 按钮元素
 * @param {string} successMessage - 成功消息
 * @param {string} errorMessage - 错误消息
 */
async function executeCleanup(cleanupFunction, button, successMessage, errorMessage) {
    try {
        // 设置按钮为加载状态
        ButtonManager.setLoading(button);

        // 执行清理操作
        await cleanupFunction();

        // 设置按钮为成功状态
        ButtonManager.setSuccess(button);

        // 显示成功消息
        showStatus(successMessage, 'success');
    } catch (error) {
        // 设置按钮为错误状态
        ButtonManager.setError(button);

        // 显示错误消息
        showStatus(errorMessage + ': ' + error.message, 'error');
    }
}

/**
 * 显示状态消息
 * @param {string} message - 状态消息
 * @param {string} type - 状态类型
 */
function showStatus(message, type = 'info') {
    StatusManager.show(elements.status, elements.statusContainer, message, type);
}

// 清理功能实现

/**
 * 清空当前网站所有数据
 */
async function clearCurrentWebsiteData() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error(getMessage('cannotGetCurrentTab'));
        await CleanerManager.clearCurrentWebsiteData(currentTab);
    }, elements.clearCurrentAll, getMessage('currentSiteCacheCleared'), getMessage('currentSiteCacheClearFailed'));
}

/**
 * 清空所有数据
 */
async function clearAllData() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error(getMessage('cannotGetCurrentTab'));

        // 获取清理选项设置
        const settings = await SettingsManager.get([
            'clearPasswords',
            'clearFormData',
            'includeProtected'
        ]);

        await CleanerManager.clearAllData(currentTab, settings);
    }, elements.clearAll, getMessage('allCacheCleared'), getMessage('allCacheClearFailed'));
}

/**
 * 清空缓存
 */
async function clearCache() {
    await executeCleanup(async () => {
        await BrowsingDataManager.clearCache({ since: 0 });
    }, elements.clearCache, getMessage('cacheCleared'), getMessage('cacheClearFailed'));
}

/**
 * 清空 Cookies
 */
async function clearCookies() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error(getMessage('cannotGetCurrentTab'));
        await CleanerManager.clearCookiesData(currentTab);
    }, elements.clearCurrentCookies, getMessage('cookiesCleared'), getMessage('cookiesClearFailed'));
}

/**
 * 清空 LocalStorage
 */
async function clearLocalStorage() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error(getMessage('cannotGetCurrentTab'));
        await CleanerManager.clearLocalStorageData(currentTab);
    }, elements.clearLocalStorage, getMessage('localStorageCleared'), getMessage('localStorageClearFailed'));
}

/**
 * 清空 SessionStorage
 */
async function clearSessionStorage() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error(getMessage('cannotGetCurrentTab'));
        await CleanerManager.clearSessionStorageData(currentTab);
    }, elements.clearSessionStorage, getMessage('sessionStorageCleared'), getMessage('sessionStorageClearFailed'));
}

/**
 * 清空 IndexedDB
 */
async function clearCurrentIndexedDB() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error(getMessage('cannotGetCurrentTab'));
        await CleanerManager.clearIndexedDBData(currentTab);
    }, elements.clearCurrentIndexedDB, getMessage('indexedDBCleared'), getMessage('indexedDBClearFailed'));
}

/**
 * 清空所有 IndexedDB
 */
async function clearIndexedDB() {
    await executeCleanup(async () => {
        await BrowsingDataManager.clearIndexedDB({ since: 0 });
    }, elements.clearIndexedDB, getMessage('allIndexedDBCleared'), getMessage('indexedDBClearFailed'));
}

/**
 * 清空历史记录
 */
async function clearHistory() {
    await executeCleanup(async () => {
        await CleanerManager.clearHistoryData();
    }, elements.clearHistory, getMessage('historyCleared'), getMessage('historyClearFailed'));
}

/**
 * 清空下载记录
 */
async function clearDownloads() {
    await executeCleanup(async () => {
        await CleanerManager.clearDownloadsData();
    }, elements.clearDownloads, getMessage('downloadsCleared'), getMessage('downloadsClearFailed'));
}

/**
 * 清空下载文件
 */
async function clearDownloadFiles() {
    await executeCleanup(async () => {
        await CleanerManager.clearDownloadFiles();
    }, elements.clearDownloadsFiles, getMessage('downloadFilesCleared'), getMessage('downloadFilesClearFailed'));
}

/**
 * 正常重新加载
 */
async function normalReload() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error(getMessage('cannotGetCurrentTab'));
        await CleanerManager.normalReload(currentTab);
    }, elements.normalReload, getMessage('pageReloading'), getMessage('reloadFailed'));
}

/**
 * 硬性重新加载（绕过缓存）
 */
async function hardReloadOnly() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error(getMessage('cannotGetCurrentTab'));
        await CleanerManager.hardReloadOnly(currentTab);
    }, elements.hardReloadOnly, getMessage('pageHardReloading'), getMessage('hardReloadFailed'));
}

/**
 * 清空缓存并硬性重新加载（保留登录状态）
 */
async function hardReloadCacheOnly() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error(getMessage('cannotGetCurrentTab'));
        await CleanerManager.hardReloadCacheOnly(currentTab);
    }, elements.hardReloadCacheOnly, getMessage('cacheAndPageReloading'), getMessage('cacheAndReloadFailed'));
}

/**
 * 清空所有数据并硬性重新加载（包括登录状态）
 */
async function hardReloadPage() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error(getMessage('cannotGetCurrentTab'));
        await CleanerManager.hardReloadPage(currentTab);
    }, elements.hardReload, getMessage('allDataAndPageReloading'), getMessage('allDataAndReloadFailed'));
}

/**
 * 初始化高级设置
 */
async function initializeAdvancedSettings() {
    await loadAdvancedSettings();
    await loadLanguageSettings();

    // 绑定主题切换事件
    elements.themeRadios.forEach(radio => {
        radio.addEventListener('change', handleThemeChange);
    });
}

/**
 * 处理主题切换
 * @param {Event} event - 事件对象
 */
function handleThemeChange(event) {
    const theme = event.target.value;
    applyTheme(theme);
    updateThemeSelection(theme);

    // 保存主题设置
    chrome.storage.local.set({ theme });
}

/**
 * 应用主题
 * @param {string} theme - 主题名称
 */
function applyTheme(theme) {
    const container = document.querySelector('.container');
    const body = document.body;

    ThemeManager.apply(theme, container, body);
}

/**
 * 更新主题选择的视觉标识
 * @param {string} selectedTheme - 选中的主题
 */
function updateThemeSelection(selectedTheme) {
    ThemeManager.updateSelection(selectedTheme);
}

/**
 * 加载高级设置
 */
async function loadAdvancedSettings() {
    try {
        const settings = await SettingsManager.get([
            'theme',
            'enableNotifications',
            'notificationSound'
        ]);

        // 设置主题
        const theme = settings.theme || 'dark'; // 默认使用深色主题
        const themeRadio = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
            applyTheme(theme);
            // 更新主题选择的视觉标识
            updateThemeSelection(theme);
        }

        // 设置其他选项
        if (elements.enableNotifications) {
            elements.enableNotifications.checked = settings.enableNotifications !== false;
        }
        if (elements.notificationSound) {
            elements.notificationSound.checked = settings.notificationSound === true;
        }
    } catch (error) {
        // 加载高级设置失败
    }
}

/**
 * 处理语言切换
 * @param {Event} event - 事件对象
 */
async function handleLanguageChange(event) {
    try {
        const selectedLanguage = event.target.value;
        const success = await switchLanguage(selectedLanguage);

        if (success) {
            showStatus(getMessage('languageChanged'), 'success');

            // 重新加载当前URL显示（因为"未知网站"等文本可能需要更新）
            if (elements.currentUrl && currentUrl) {
                elements.currentUrl.textContent = formatUrl(currentUrl);
            }

            // 重新加载版本信息
            loadVersionInfo();

            // 重新调整标签页文本大小
            setTimeout(() => {
                adjustTabTextSize();
            }, 100);
        } else {
            showStatus(getMessage('languageChangeFailed'), 'error');
            // 恢复到之前的选择
            const currentLang = await getUserLanguage();
            elements.languageSelect.value = currentLang;
        }
    } catch (error) {
        showStatus(getMessage('languageChangeFailed'), 'error');
    }
}

/**
 * 加载语言设置
 */
async function loadLanguageSettings() {
    try {
        const userLanguage = await getUserLanguage();
        if (elements.languageSelect) {
            elements.languageSelect.value = userLanguage;
        }
    } catch (error) {
        // 加载语言设置失败，使用默认值
    }
}

/**
 * 调整标签页文本大小以防止换行
 */
function adjustTabTextSize() {
    try {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const containerWidth = document.querySelector('.tab-nav')?.offsetWidth || 520;
        const buttonWidth = containerWidth / 3; // 三个按钮平分宽度

        tabButtons.forEach(button => {
            const textElement = button.querySelector('.tab-text');
            const iconElement = button.querySelector('.tab-icon');

            if (!textElement) return;

            // 重置字体大小
            textElement.style.fontSize = '';

            // 计算可用宽度（减去图标、间距和内边距）
            const iconWidth = iconElement ? 18 : 0; // 图标宽度
            const gap = 4; // gap 宽度
            const padding = 16; // 左右内边距总和
            const availableWidth = buttonWidth - iconWidth - gap - padding;

            const textContent = textElement.textContent;
            const textLength = textContent.length;

            // 检测文本语言类型（中文、日文、韩文字符密度更高）
            const isCJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(textContent);

            // 根据文本长度和语言类型智能调整字体大小
            let baseFontSize;
            if (isCJK) {
                // 中日韩文字密度高，需要稍微调整阈值
                if (textLength <= 3) {
                    baseFontSize = 0.95; // 短文本使用较大字体
                } else if (textLength <= 5) {
                    baseFontSize = 0.85; // 中等文本使用中等字体
                } else {
                    baseFontSize = 0.8; // 长文本使用较小字体
                }
            } else {
                // 拉丁文字
                if (textLength <= 4) {
                    baseFontSize = 0.9; // 短文本使用较大字体
                } else if (textLength <= 8) {
                    baseFontSize = 0.85; // 中等文本使用中等字体
                } else {
                    baseFontSize = 0.8; // 长文本使用较小字体
                }
            }

            // 测量文本宽度
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            // 先尝试基础字体大小
            let fontSize = baseFontSize;
            context.font = `600 ${fontSize}rem SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`;
            let textWidth = context.measureText(textContent).width;

            // 如果文本太宽，逐步减小字体大小
            while (textWidth > availableWidth && fontSize > 0.6) {
                fontSize -= 0.05;
                context.font = `600 ${fontSize}rem SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`;
                textWidth = context.measureText(textContent).width;
            }

            // 如果文本很短且有足够空间，可以适当增大字体
            if (textLength <= 3 && textWidth < availableWidth * 0.7 && fontSize < 1.0) {
                const maxFontSize = Math.min(1.0, baseFontSize + 0.1);
                let testFontSize = fontSize + 0.05;

                while (testFontSize <= maxFontSize) {
                    context.font = `600 ${testFontSize}rem SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`;
                    const testWidth = context.measureText(textContent).width;

                    if (testWidth <= availableWidth) {
                        fontSize = testFontSize;
                        testFontSize += 0.05;
                    } else {
                        break;
                    }
                }
            }

            // 应用字体大小
            if (Math.abs(fontSize - 0.85) > 0.01) { // 只有当字体大小与默认不同时才设置
                textElement.style.fontSize = `${fontSize}rem`;
            }
        });
    } catch (error) {
        // 调整标签页文本大小失败，使用默认样式
    }
}

/**
 * 保存高级设置
 */
async function saveAdvancedSettings() {
    try {
        const settings = {
            enableNotifications: elements.enableNotifications?.checked !== false,
            notificationSound: elements.notificationSound?.checked === true,
            clearPasswords: elements.clearPasswords?.checked !== false,
            clearFormData: elements.clearFormData?.checked !== false,
            includeProtected: elements.includeProtected?.checked !== false
        };

        await SettingsManager.save(settings);
        showStatus(getMessage('settingsSaved'), 'success');
    } catch (error) {
        // 保存高级设置失败
        showStatus(getMessage('settingsSaveFailed'), 'error');
    }
}

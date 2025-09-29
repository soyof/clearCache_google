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
    ThemeManager
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
};

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    await initializeCurrentTab();
    loadVersionInfo();
    bindEventListeners();
    loadSettings();
    restoreTabState();
    initializeAdvancedSettings();
    
    // 立即检查Service Worker状态
    checkServiceWorkerStatus();
    
    // 当页面获得焦点时，重新检查Service Worker状态
    window.addEventListener('focus', () => {
        // 页面获得焦点，重新检查Service Worker状态
        checkServiceWorkerStatus();
    });
    
    // 当页面可见性改变时，如果变为可见，重新检查Service Worker状态
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // 页面变为可见，重新检查Service Worker状态
            checkServiceWorkerStatus();
        }
    });
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
        showStatus('无法获取当前标签页信息', 'error');
    }
}

/**
 * 格式化URL
 * @param {string} url - URL
 * @returns {string} 格式化后的URL
 */
function formatUrl(url) {
    try {
        if (!url) return '未知网站';
        
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
        return '未知网站';
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
        showStatus('加载设置失败', 'error');
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
        if (!currentTab) throw new Error('无法获取当前标签页');
        await CleanerManager.clearCurrentWebsiteData(currentTab);
    }, elements.clearCurrentAll, '🌐 当前网站缓存已清空', '❌ 清空当前网站缓存失败');
}

/**
 * 清空所有数据
 */
async function clearAllData() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');
        
        // 获取清理选项设置
        const settings = await SettingsManager.get([
            'clearPasswords',
            'clearFormData',
            'includeProtected'
        ]);
        
        await CleanerManager.clearAllData(currentTab, settings);
    }, elements.clearAll, '🌐 所有缓存已清空', '❌ 清空所有缓存失败');
}

/**
 * 清空缓存
 */
async function clearCache() {
    await executeCleanup(async () => {
        await BrowsingDataManager.clearCache({ since: 0 });
    }, elements.clearCache, '🗑️ 缓存已清空', '❌ 清空缓存失败');
}

/**
 * 清空 Cookies
 */
async function clearCookies() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');
        await CleanerManager.clearCookiesData(currentTab);
    }, elements.clearCurrentCookies, '🍪 Cookies 已清空', '❌ 清空 Cookies 失败');
}

/**
 * 清空 LocalStorage
 */
async function clearLocalStorage() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');
        await CleanerManager.clearLocalStorageData(currentTab);
    }, elements.clearLocalStorage, '💾 LocalStorage 已清空', '❌ 清空 LocalStorage 失败');
}

/**
 * 清空 SessionStorage
 */
async function clearSessionStorage() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');
        await CleanerManager.clearSessionStorageData(currentTab);
    }, elements.clearSessionStorage, '📂 SessionStorage 已清空', '❌ 清空 SessionStorage 失败');
}

/**
 * 清空 IndexedDB
 */
async function clearCurrentIndexedDB() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');
        await CleanerManager.clearIndexedDBData(currentTab);
    }, elements.clearCurrentIndexedDB, '📊 IndexedDB 已清空', '❌ 清空 IndexedDB 失败');
}

/**
 * 清空所有 IndexedDB
 */
async function clearIndexedDB() {
    await executeCleanup(async () => {
        await BrowsingDataManager.clearIndexedDB({ since: 0 });
    }, elements.clearIndexedDB, '📊 所有 IndexedDB 已清空', '❌ 清空 IndexedDB 失败');
}

/**
 * 清空历史记录
 */
async function clearHistory() {
    await executeCleanup(async () => {
        await CleanerManager.clearHistoryData();
    }, elements.clearHistory, '📜 历史记录已清空', '❌ 清空历史记录失败');
}

/**
 * 清空下载记录
 */
async function clearDownloads() {
    await executeCleanup(async () => {
        await CleanerManager.clearDownloadsData();
    }, elements.clearDownloads, '📥 下载记录已清空', '❌ 清空下载记录失败');
}

/**
 * 清空下载文件
 */
async function clearDownloadFiles() {
    await executeCleanup(async () => {
        await CleanerManager.clearDownloadFiles();
    }, elements.clearDownloadsFiles, '📁 下载文件已清除', '❌ 清除下载文件失败');
}

/**
 * 正常重新加载
 */
async function normalReload() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');
        await CleanerManager.normalReload(currentTab);
    }, elements.normalReload, '🔄 页面正在重新加载', '❌ 重新加载失败');
}

/**
 * 硬性重新加载（绕过缓存）
 */
async function hardReloadOnly() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');
        await CleanerManager.hardReloadOnly(currentTab);
    }, elements.hardReloadOnly, '🔄 页面正在硬性重新加载', '❌ 硬性重新加载失败');
}

/**
 * 清空缓存并硬性重新加载（保留登录状态）
 */
async function hardReloadCacheOnly() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');
        await CleanerManager.hardReloadCacheOnly(currentTab);
    }, elements.hardReloadCacheOnly, '🔄 缓存已清空，页面正在重载', '❌ 清空缓存并重载失败');
}

/**
 * 清空所有数据并硬性重新加载（包括登录状态）
 */
async function hardReloadPage() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');
        await CleanerManager.hardReloadPage(currentTab);
    }, elements.hardReload, '🔄 所有数据已清空，页面正在重载', '❌ 清空数据并重载失败');
}

/**
 * 初始化高级设置
 */
async function initializeAdvancedSettings() {
    await loadAdvancedSettings();
    
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
        showStatus('设置已保存', 'success');
    } catch (error) {
        // 保存高级设置失败
        showStatus('保存设置失败', 'error');
    }
}

/**
 * 检查Service Worker状态
 */
async function checkServiceWorkerStatus() {
    try {
        const statusElement = document.getElementById('service-worker-status');
        if (!statusElement) return;
        
        const statusTextElement = statusElement.querySelector('.status-text');
        if (!statusTextElement) return;
        
        // 设置初始状态为检查中
        statusTextElement.textContent = '检查中...';
        
        // 首先触发Service Worker的保活机制
        try {
            // 发送保活请求
            chrome.runtime.sendMessage({ 
                action: 'keepAlive',
                timestamp: Date.now()
            });
            
            // 延迟500毫秒再检查状态，给Service Worker一点时间响应
            setTimeout(() => {
                // 尝试向Service Worker发送ping消息
                chrome.runtime.sendMessage({ 
                    action: 'ping',
                    timestamp: Date.now()
                }, (response) => {
                    const lastError = chrome.runtime.lastError;
                    
                    if (lastError) {
                        // Service Worker 通信错误
                        updateServiceWorkerStatus(statusElement, 'error', 'Service Worker (无效)');
                        
                        // 尝试重新激活Service Worker
                        retryActivateServiceWorker(statusElement);
                    } else if (response && response.success) {
                        // Service Worker 响应正常
                        updateServiceWorkerStatus(statusElement, 'active', 'Service Worker (正常)');
                        
                        // 设置定期检查，确保状态保持更新
                        scheduleStatusCheck();
                    } else {
                        // Service Worker 响应异常
                        updateServiceWorkerStatus(statusElement, 'error', 'Service Worker (异常)');
                        
                        // 尝试重新激活Service Worker
                        retryActivateServiceWorker(statusElement);
                    }
                });
            }, 500);
        } catch (e) {
            // 检查扩展状态失败
            updateServiceWorkerStatus(statusElement, 'error', 'Service Worker (错误)');
        }
    } catch (error) {
        // 检查Service Worker状态失败
        
        const statusElement = document.getElementById('service-worker-status');
        if (!statusElement) return;
        
        updateServiceWorkerStatus(statusElement, 'error', 'Service Worker (错误)');
    }
}

/**
 * 更新Service Worker状态显示
 * @param {HTMLElement} element - 状态元素
 * @param {string} status - 状态类型 (active/error)
 * @param {string} text - 状态文本
 */
function updateServiceWorkerStatus(element, status, text) {
    const statusTextElement = element.querySelector('.status-text');
    if (!statusTextElement) return;
    
    // 清除所有状态类
    element.classList.remove('active', 'error');
    
    // 添加当前状态类
    element.classList.add(status);
    
    // 更新文本
    statusTextElement.textContent = text;
}

/**
 * 尝试重新激活Service Worker
 * @param {HTMLElement} statusElement - 状态元素
 */
function retryActivateServiceWorker(statusElement) {
    // 尝试重新激活Service Worker
    
    // 显示正在重试状态
    updateServiceWorkerStatus(statusElement, 'error', 'Service Worker (重试中...)');
    
    // 发送重新注册请求
    chrome.runtime.sendMessage({ 
        action: 'keepAlive',
        retry: true,
        timestamp: Date.now()
    });
    
    // 2秒后再次检查状态
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
                // Service Worker 重新激活失败
                updateServiceWorkerStatus(statusElement, 'error', 'Service Worker (无效)');
            } else {
                // Service Worker 重新激活成功
                updateServiceWorkerStatus(statusElement, 'active', 'Service Worker (正常)');
                
                // 设置定期检查
                scheduleStatusCheck();
            }
        });
    }, 2000);
}

/**
 * 设置定期检查Service Worker状态
 */
function scheduleStatusCheck() {
    // 每30秒检查一次Service Worker状态
    setTimeout(() => {
        const statusElement = document.getElementById('service-worker-status');
        if (statusElement) {
            checkServiceWorkerStatus();
        }
    }, 30000);
}

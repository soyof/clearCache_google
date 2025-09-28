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
    
    // 设置管理按钮已移除
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    await initializeCurrentTab();
    loadVersionInfo();
    bindEventListeners();
    loadSettings();
    restoreTabState();
    initializeAdvancedSettings();
});

// 加载版本信息
function loadVersionInfo() {
    try {
        const manifest = chrome.runtime.getManifest();
        const versionElement = document.querySelector('.version');
        if (versionElement && manifest.version) {
            versionElement.textContent = `v${manifest.version}`;
        }
    } catch (error) {
        // 静默处理版本信息加载错误
    }
}

// 获取当前标签页信息
async function initializeCurrentTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;
        currentUrl = tab.url;

        // 显示当前网站
        const domain = new URL(currentUrl).hostname;
        elements.currentUrl.textContent = domain || '未知网站';
        elements.currentUrl.title = currentUrl;
    } catch (error) {
        elements.currentUrl.textContent = '获取失败';
    }
}

// 绑定事件监听器
function bindEventListeners() {
    // Tab 切换
    bindTabListeners();

    // 针对当前网站的清理
    elements.normalReload.addEventListener('click', () => normalReload());
    elements.hardReloadOnly.addEventListener('click', () => hardReloadOnly());
    elements.clearCurrentAll.addEventListener('click', () => clearCurrentWebsiteData());
    elements.hardReloadCacheOnly.addEventListener('click', () => hardReloadCacheOnly());
    elements.hardReload.addEventListener('click', () => hardReloadPage());
    elements.clearCurrentCookies.addEventListener('click', () => clearCurrentCookies());
    elements.clearLocalStorage.addEventListener('click', () => clearLocalStorage());
    elements.clearSessionStorage.addEventListener('click', () => clearSessionStorage());
    elements.clearCurrentIndexedDB.addEventListener('click', () => clearCurrentIndexedDB());

    // 针对整个浏览器的清理
    elements.clearAll.addEventListener('click', () => clearAllData());
    elements.clearCache.addEventListener('click', () => clearBrowserCache());
    elements.clearCookies.addEventListener('click', () => clearCookies());
    elements.clearIndexedDB.addEventListener('click', () => clearIndexedDB());
    elements.clearHistory.addEventListener('click', () => clearBrowsingHistory());
    elements.clearDownloads.addEventListener('click', () => clearDownloadHistory());
    elements.clearDownloadsFiles.addEventListener('click', () => clearDownloadFiles());

    // 保存设置
    Object.values(elements).forEach(element => {
        if (element && element.type === 'checkbox') {
            element.addEventListener('change', saveSettings);
        }
    });
}

// 绑定Tab切换监听器
function bindTabListeners() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // 移除所有活动状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // 激活当前Tab
            button.classList.add('active');
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // 保存当前Tab状态
            chrome.storage.local.set({ activeTab: targetTab });
        });
    });
}

// 恢复Tab状态
async function restoreTabState() {
    try {
        const { activeTab } = await chrome.storage.local.get(['activeTab']);
        if (activeTab) {
            const tabButton = document.querySelector(`[data-tab="${activeTab}"]`);
            if (tabButton) {
                tabButton.click();
            }
        }
    } catch (error) {
        // 静默处理Tab状态恢复错误
    }
}

// 加载设置
async function loadSettings() {
    try {
        const settings = await chrome.storage.local.get([
            'clearPasswords',
            'clearFormData',
            'includeProtected'
        ]);

        elements.clearPasswords.checked = settings.clearPasswords !== false;
        elements.clearFormData.checked = settings.clearFormData !== false;
        elements.includeProtected.checked = settings.includeProtected !== false;
    } catch (error) {
        // 静默处理设置加载错误
    }
}

// 保存设置
async function saveSettings() {
    try {
        await chrome.storage.local.set({
            clearPasswords: elements.clearPasswords.checked,
            clearFormData: elements.clearFormData.checked,
            includeProtected: elements.includeProtected.checked
        });
    } catch (error) {
        // 静默处理设置保存错误
    }
}

// 显示状态消息
function showStatus(message, type = 'info', duration = 3000) {
    elements.status.textContent = message;
    elements.status.className = `status-message ${type}`;
    elements.statusContainer.classList.add('show');

    setTimeout(() => {
        elements.statusContainer.classList.remove('show');
    }, duration);
}

// 显示进度条
function showProgress(percent = 0) {
    elements.statusContainer.classList.add('show');
    elements.progress.classList.add('show');
    elements.progressFill.style.width = `${percent}%`;

    if (percent >= 100) {
        setTimeout(() => {
            elements.progress.classList.remove('show');
            // 延迟隐藏容器，让用户看到完成状态
            setTimeout(() => {
                elements.statusContainer.classList.remove('show');
            }, 500);
        }, 1000);
    }
}

// 设置按钮状态
function setButtonState(button, state) {
    button.classList.remove('loading', 'success');

    switch (state) {
        case 'loading':
            button.classList.add('loading');
            button.disabled = true;
            break;
        case 'success':
            button.classList.add('success');
            button.disabled = false;
            setTimeout(() => {
                button.classList.remove('success');
            }, 2000);
            break;
        case 'normal':
        default:
            button.disabled = false;
            break;
    }
}

// 执行清理操作的通用函数
async function executeCleanup(cleanupFunction, button, successMessage, errorMessage) {
    try {
        setButtonState(button, 'loading');
        showProgress(0);

        const result = await cleanupFunction();

        showProgress(100);
        setButtonState(button, 'success');
        showStatus(successMessage, 'success');

        return result;
    } catch (error) {
        setButtonState(button, 'normal');
        showStatus(errorMessage || '操作失败，请重试', 'error');
        throw error;
    }
}

// 正常重新加载
async function normalReload() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');

        // 普通重新加载页面
        await chrome.tabs.reload(currentTab.id);

        // 关闭弹窗
        setTimeout(() => window.close(), 500);

    }, elements.normalReload, '🔄 页面正在重新加载...', '❌ 重新加载失败');
}

// 硬性重新加载（绕过缓存）
async function hardReloadOnly() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');

        // 硬性重新加载页面（绕过缓存）
        await chrome.tabs.reload(currentTab.id, { bypassCache: true });

        // 关闭弹窗
        setTimeout(() => window.close(), 500);

    }, elements.hardReloadOnly, '🔄 页面正在硬性重新加载...', '❌ 硬性重新加载失败');
}

// 清空当前网站的所有数据
async function clearCurrentWebsiteData() {
    await executeCleanup(async () => {
        const promises = [];

        // 清理当前网站的浏览器数据
        promises.push(chrome.browsingData.removeCache({
            since: 0,
            origins: [currentUrl]
        }));

        promises.push(chrome.browsingData.removeCookies({
            since: 0,
            origins: [currentUrl]
        }));

        promises.push(chrome.browsingData.removeLocalStorage({
            since: 0,
            origins: [currentUrl]
        }));

        promises.push(chrome.browsingData.removeIndexedDB({
            since: 0,
            origins: [currentUrl]
        }));

        promises.push(chrome.browsingData.removeWebSQL({
            since: 0,
            origins: [currentUrl]
        }));

        // 清理页面级存储
        if (currentTab) {
            promises.push(chrome.tabs.sendMessage(currentTab.id, {
                action: 'clearPageStorage',
                types: ['localStorage', 'sessionStorage']
            }).catch(() => { })); // 忽略错误，某些页面可能不支持
        }

        await Promise.all(promises);

        // 更新进度
        for (let i = 20; i <= 100; i += 20) {
            showProgress(i);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

    }, elements.clearCurrentAll, '🎉 当前网站缓存已清空！', '❌ 清空当前网站缓存失败');
}

// 一键清空所有缓存
async function clearAllData() {
    await executeCleanup(async () => {
        const promises = [];

        // 清理浏览器数据
        promises.push(chrome.browsingData.removeCache({
            since: 0,
            origins: elements.includeProtected.checked ? undefined : [currentUrl]
        }));

        promises.push(chrome.browsingData.removeCookies({
            since: 0,
            origins: elements.includeProtected.checked ? undefined : [currentUrl]
        }));

        promises.push(chrome.browsingData.removeLocalStorage({
            since: 0,
            origins: elements.includeProtected.checked ? undefined : [currentUrl]
        }));

        promises.push(chrome.browsingData.removeIndexedDB({
            since: 0,
            origins: elements.includeProtected.checked ? undefined : [currentUrl]
        }));

        promises.push(chrome.browsingData.removeWebSQL({
            since: 0,
            origins: elements.includeProtected.checked ? undefined : [currentUrl]
        }));

        // 清理页面级存储
        if (currentTab) {
            promises.push(chrome.tabs.sendMessage(currentTab.id, {
                action: 'clearPageStorage',
                types: ['localStorage', 'sessionStorage']
            }).catch(() => { })); // 忽略错误，某些页面可能不支持
        }

        await Promise.all(promises);

        // 更新进度
        for (let i = 20; i <= 100; i += 20) {
            showProgress(i);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

    }, elements.clearAll, '🎉 所有缓存已清空！', '❌ 清空所有缓存失败');
}

// 清空文件缓存并硬性重新加载（保留登录状态）
async function hardReloadCacheOnly() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');

        // 只清理文件缓存，不清理 Cookies 和用户数据
        await chrome.browsingData.removeCache({
            since: 0,
            origins: [currentUrl]
        });

        // 清理 Service Worker 缓存和 Cache API
        await chrome.tabs.sendMessage(currentTab.id, {
            action: 'clearPageStorage',
            types: ['cacheAPI', 'serviceWorker']
        }).catch(() => { });

        // 硬性重新加载页面（绕过缓存）
        await chrome.tabs.reload(currentTab.id, { bypassCache: true });

        // 关闭弹窗
        setTimeout(() => window.close(), 500);

    }, elements.hardReloadCacheOnly, '🔄 文件缓存已清空，页面正在重载...', '❌ 重新加载失败');
}

// 清空所有数据并硬性重新加载（包括登录状态）
async function hardReloadPage() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');

        // 清理当前页面的所有数据（包括 Cookies）
        await chrome.browsingData.removeCache({
            since: 0,
            origins: [currentUrl]
        });

        await chrome.browsingData.removeCookies({
            since: 0,
            origins: [currentUrl]
        });

        // 清理页面存储
        await chrome.tabs.sendMessage(currentTab.id, {
            action: 'clearPageStorage',
            types: ['localStorage', 'sessionStorage', 'cacheAPI', 'serviceWorker']
        }).catch(() => { });

        // 硬性重新加载页面
        await chrome.tabs.reload(currentTab.id, { bypassCache: true });

        // 关闭弹窗
        setTimeout(() => window.close(), 500);

    }, elements.hardReload, '🔄 所有数据已清空，页面正在重载...', '❌ 重新加载失败');
}

// 清空当前网站 Cookies
async function clearCurrentCookies() {
    await executeCleanup(async () => {
        await chrome.browsingData.removeCookies({
            since: 0,
            origins: [currentUrl]
        });

    }, elements.clearCurrentCookies, '🍪 当前网站 Cookies 已清空', '❌ 清空当前网站 Cookies 失败');
}

// 清空所有网站 Cookies
async function clearCookies() {
    await executeCleanup(async () => {
        const options = {
            since: 0
        };

        if (!elements.includeProtected.checked) {
            options.origins = [currentUrl];
        }

        await chrome.browsingData.removeCookies(options);

    }, elements.clearCookies, '🍪 Cookies 已清空', '❌ 清空 Cookies 失败');
}

// 清空 LocalStorage
async function clearLocalStorage() {
    await executeCleanup(async () => {
        // 通过 browsingData API 清理
        const options = {
            since: 0
        };

        if (!elements.includeProtected.checked) {
            options.origins = [currentUrl];
        }

        await chrome.browsingData.removeLocalStorage(options);

        // 通过内容脚本清理当前页面
        if (currentTab) {
            await chrome.tabs.sendMessage(currentTab.id, {
                action: 'clearPageStorage',
                types: ['localStorage']
            }).catch(() => { });
        }

    }, elements.clearLocalStorage, '💾 LocalStorage 已清空', '❌ 清空 LocalStorage 失败');
}

// 清空 SessionStorage
async function clearSessionStorage() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');

        // SessionStorage 只能通过内容脚本清理
        await chrome.tabs.sendMessage(currentTab.id, {
            action: 'clearPageStorage',
            types: ['sessionStorage']
        });

    }, elements.clearSessionStorage, '📂 SessionStorage 已清空', '❌ 清空 SessionStorage 失败');
}

// 清空当前网站 IndexedDB
async function clearCurrentIndexedDB() {
    await executeCleanup(async () => {
        await chrome.browsingData.removeIndexedDB({
            since: 0,
            origins: [currentUrl]
        });

    }, elements.clearCurrentIndexedDB, '🗄️ 当前网站 IndexedDB 已清空', '❌ 清空当前网站 IndexedDB 失败');
}

// 清空所有网站 IndexedDB
async function clearIndexedDB() {
    await executeCleanup(async () => {
        const options = {
            since: 0
        };

        if (!elements.includeProtected.checked) {
            options.origins = [currentUrl];
        }

        await chrome.browsingData.removeIndexedDB(options);

    }, elements.clearIndexedDB, '🗄️ IndexedDB 已清空', '❌ 清空 IndexedDB 失败');
}

// 清除浏览器缓存
async function clearBrowserCache() {
    await executeCleanup(async () => {
        const options = {
            since: 0
        };

        if (!elements.includeProtected.checked) {
            options.origins = [currentUrl];
        }

        await chrome.browsingData.removeCache(options);

    }, elements.clearCache, '📋 浏览器缓存已清除', '❌ 清除缓存失败');
}

// 清除历史记录
async function clearBrowsingHistory() {
    await executeCleanup(async () => {
        const options = {
            since: 0
        };

        if (!elements.includeProtected.checked) {
            // 只清除当前域名的历史记录
            const domain = new URL(currentUrl).hostname;
            options.originTypes = { unprotectedWeb: true };
        }

        await chrome.browsingData.removeHistory(options);

    }, elements.clearHistory, '📖 历史记录已清除', '❌ 清除历史记录失败');
}

// 清除下载记录
async function clearDownloadHistory() {
    await executeCleanup(async () => {
        await chrome.browsingData.removeDownloads({ since: 0 });

    }, elements.clearDownloads, '⬇️ 下载记录已清除', '❌ 清除下载记录失败');
}

// 清除并删除下载文件
async function clearDownloadFiles() {
    // 显示确认对话框
    const confirmed = confirm('⚠️ 警告：此操作将删除所有下载的文件，且无法恢复。确定要继续吗？');
    if (!confirmed) return;

    await executeCleanup(async () => {
        // 获取所有下载项
        const downloads = await chrome.downloads.search({});

        // 删除文件并清除记录
        const deletePromises = downloads.map(async (download) => {
            try {
                // 删除文件
                if (download.state === 'complete') {
                    await chrome.downloads.removeFile(download.id);
                }
                // 清除下载记录
                await chrome.downloads.erase({ id: download.id });
            } catch (error) {
                // 静默处理删除失败
            }
        });

        await Promise.all(deletePromises);

        // 清除下载历史
        await chrome.browsingData.removeDownloads({ since: 0 });

    }, elements.clearDownloadsFiles, '🗂️ 下载文件已删除', '❌ 删除下载文件失败');
}

// 处理来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'storageCleared') {
        // 页面存储已清理
    }
});

// 调试代码已清理

// 键盘快捷键支持
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case '1':
                event.preventDefault();
                elements.clearCurrentAll.click();
                break;
            case '2':
                event.preventDefault();
                elements.clearAll.click();
                break;
            case 'r':
                if (event.shiftKey) {
                    // Ctrl+Shift+R - 清空文件缓存并重载（保留登录）
                    event.preventDefault();
                    elements.hardReloadCacheOnly.click();
                } else {
                    // Ctrl+R - 清空全部并刷新
                    event.preventDefault();
                    elements.hardReload.click();
                }
                break;
        }
    }
});

// 添加工具提示
function addTooltips() {
    const tooltips = {
        'normal-reload': '普通重新加载页面（F5）',
        'hard-reload-only': '硬性重新加载页面，绕过缓存（Ctrl+F5）',
        'clear-current-all': 'Ctrl+1 - 清空当前网站的所有缓存数据',
        'clear-all': 'Ctrl+2 - 清空所有网站的缓存数据',
        'hard-reload-cache-only': 'Ctrl+Shift+R - 清空缓存并硬性重新加载（保留登录状态）',
        'hard-reload': 'Ctrl+R - 清空所有数据并重载页面（包括登录状态）',
        'clear-current-cookies': '清空当前网站的 Cookie 数据',
        'clear-cookies': '清空所有网站的 Cookie 数据',
        'clear-localstorage': '清空当前网站的本地存储数据',
        'clear-sessionstorage': '清空当前网站的会话存储数据',
        'clear-current-indexeddb': '清空当前网站的 IndexedDB 数据库',
        'clear-indexeddb': '清空所有网站的 IndexedDB 数据库',
        'clear-cache': '清空浏览器缓存文件',
        'clear-history': '清空浏览历史记录',
        'clear-downloads': '清空下载历史记录',
        'clear-downloads-files': '警告：将删除所有下载的文件'
    };

    Object.entries(tooltips).forEach(([id, tooltip]) => {
        const element = document.getElementById(id);
        if (element) {
            element.title = tooltip;
        }
    });
}

// 初始化工具提示
addTooltips();

// 高级设置功能
function initializeAdvancedSettings() {
    // 主题切换
    if (elements.themeRadios) {
        elements.themeRadios.forEach(radio => {
            radio.addEventListener('change', handleThemeChange);
        });
    }
    
    // 设置项监听
    if (elements.enableNotifications) {
        elements.enableNotifications.addEventListener('change', saveAdvancedSettings);
    }
    if (elements.notificationSound) {
        elements.notificationSound.addEventListener('change', saveAdvancedSettings);
    }
    
    // 设置管理按钮已移除
    
    // 加载高级设置
    loadAdvancedSettings();
}

async function handleThemeChange(event) {
    const theme = event.target.value;
    await chrome.storage.local.set({ theme });
    applyTheme(theme);
    
    // 更新选中主题的视觉标识
    updateThemeSelection(theme);
}

// 更新主题选择的视觉标识
function updateThemeSelection(selectedTheme) {
    // 移除所有主题选项的选中样式
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // 为选中的主题选项添加选中样式
    const selectedOption = document.querySelector(`.theme-option input[value="${selectedTheme}"]`);
    if (selectedOption) {
        selectedOption.closest('.theme-option').classList.add('selected');
    }
}

function applyTheme(theme) {
    const container = document.querySelector('.container');
    const body = document.body;
    if (!container) return;
    
    // 移除所有主题类
    container.classList.remove('theme-dark', 'theme-light', 'theme-auto');
    body.classList.remove('theme-dark', 'theme-light', 'theme-auto');
    
    // 添加主题过渡动画
    container.classList.add('theme-transition');
    
    // 处理自动主题 - 根据时间判断使用亮色还是暗色
    let actualTheme = theme;
    if (theme === 'auto') {
        // 获取当前小时
        const currentHour = new Date().getHours();
        // 6:00 - 19:00 使用浅色主题，其他时间使用深色主题
        actualTheme = (currentHour >= 6 && currentHour < 19) ? 'light' : 'dark';
        console.log(`自动主题: 当前时间 ${currentHour}时，应用${actualTheme === 'light' ? '浅色' : '深色'}主题`);
    }
    
    // 应用实际的主题类（对于自动主题，应用计算出的主题）
    container.classList.add(`theme-${actualTheme}`);
    body.classList.add(`theme-${actualTheme}`);
    
    // 移除过渡动画类（避免影响其他动画）
    setTimeout(() => {
        container.classList.remove('theme-transition');
    }, 500);
}

async function loadAdvancedSettings() {
    try {
        const settings = await chrome.storage.local.get([
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
        console.error('加载高级设置失败:', error);
    }
}

async function saveAdvancedSettings() {
    try {
        const settings = {
            enableNotifications: elements.enableNotifications?.checked !== false,
            notificationSound: elements.notificationSound?.checked === true,
            clearPasswords: elements.clearPasswords?.checked !== false,
            clearFormData: elements.clearFormData?.checked !== false,
            includeProtected: elements.includeProtected?.checked !== false
        };
        
        await chrome.storage.local.set(settings);
        showStatus('设置已保存', 'success');
    } catch (error) {
        console.error('保存高级设置失败:', error);
        showStatus('保存设置失败', 'error');
    }
}

// 设置管理功能已移除

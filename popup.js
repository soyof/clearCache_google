// 获取当前标签页信息
let currentTab = null;
let currentUrl = '';

// DOM 元素
const elements = {
    currentUrl: document.getElementById('current-url'),
    status: document.getElementById('status'),
    progress: document.getElementById('progress'),
    progressFill: document.querySelector('.progress-fill'),
    
    // 针对当前网站的按钮
    clearCurrentAll: document.getElementById('clear-current-all'),
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
    includeProtected: document.getElementById('include-protected')
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    await initializeCurrentTab();
    bindEventListeners();
    loadSettings();
    restoreTabState();
});

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
        console.error('获取当前标签页失败:', error);
        elements.currentUrl.textContent = '获取失败';
    }
}

// 绑定事件监听器
function bindEventListeners() {
    // Tab 切换
    bindTabListeners();
    
    // 针对当前网站的清理
    elements.clearCurrentAll.addEventListener('click', () => clearCurrentWebsiteData());
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
        console.error('恢复Tab状态失败:', error);
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
        console.error('加载设置失败:', error);
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
        console.error('保存设置失败:', error);
    }
}

// 显示状态消息
function showStatus(message, type = 'info', duration = 3000) {
    elements.status.textContent = message;
    elements.status.className = `status-message show ${type}`;
    
    setTimeout(() => {
        elements.status.classList.remove('show');
    }, duration);
}

// 显示进度条
function showProgress(percent = 0) {
    elements.progress.classList.add('show');
    elements.progressFill.style.width = `${percent}%`;
    
    if (percent >= 100) {
        setTimeout(() => {
            elements.progress.classList.remove('show');
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
        console.error('清理操作失败:', error);
        setButtonState(button, 'normal');
        showStatus(errorMessage || '操作失败，请重试', 'error');
        throw error;
    }
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
            }).catch(() => {})); // 忽略错误，某些页面可能不支持
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
            }).catch(() => {})); // 忽略错误，某些页面可能不支持
        }
        
        await Promise.all(promises);
        
        // 更新进度
        for (let i = 20; i <= 100; i += 20) {
            showProgress(i);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
    }, elements.clearAll, '🎉 所有缓存已清空！', '❌ 清空所有缓存失败');
}

// 清空缓存并硬性重新加载
async function hardReloadPage() {
    await executeCleanup(async () => {
        if (!currentTab) throw new Error('无法获取当前标签页');
        
        // 先清理当前页面的缓存
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
            types: ['localStorage', 'sessionStorage']
        }).catch(() => {});
        
        // 硬性重新加载页面
        await chrome.tabs.reload(currentTab.id, { bypassCache: true });
        
        // 关闭弹窗
        setTimeout(() => window.close(), 500);
        
    }, elements.hardReload, '🔄 页面正在重新加载...', '❌ 重新加载失败');
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
            }).catch(() => {});
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
                console.warn(`删除下载项 ${download.id} 失败:`, error);
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
        console.log('页面存储已清理:', message.types);
    }
});

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
                event.preventDefault();
                elements.hardReload.click();
                break;
        }
    }
});

// 添加工具提示
function addTooltips() {
    const tooltips = {
        'clear-current-all': 'Ctrl+1 - 清空当前网站的所有缓存数据',
        'clear-all': 'Ctrl+2 - 清空所有网站的缓存数据',
        'hard-reload': 'Ctrl+R - 清空当前网站缓存并强制刷新页面',
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

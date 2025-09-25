// 后台服务工作器
// 清理缓存助手后台脚本已启动

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
    // 插件已安装/更新

    if (details.reason === 'install') {
        // 首次安装时设置默认设置
        chrome.storage.local.set({
            clearPasswords: true,    // 默认保留密码
            clearFormData: true,     // 默认保留表单数据
            includeProtected: false, // 默认不包含受保护数据
            autoCleanOnStartup: false,
            showNotifications: true,
            version: '1.0.0'
        });

        // 创建右键菜单
        createContextMenus();

        // 插件初始化完成
    } else if (details.reason === 'update') {
        // 插件已更新到版本
    }
});

// 创建右键菜单
function createContextMenus() {
    // 清除现有菜单
    chrome.contextMenus.removeAll(() => {
        // 主菜单
        chrome.contextMenus.create({
            id: 'clearCache',
            title: '清理缓存助手',
            contexts: ['page', 'frame']
        });

        // 子菜单
        chrome.contextMenus.create({
            id: 'clearAll',
            parentId: 'clearCache',
            title: '一键清空所有缓存',
            contexts: ['page', 'frame']
        });

        chrome.contextMenus.create({
            id: 'clearCookies',
            parentId: 'clearCache',
            title: '清空 Cookies',
            contexts: ['page', 'frame']
        });

        chrome.contextMenus.create({
            id: 'clearLocalStorage',
            parentId: 'clearCache',
            title: '清空 LocalStorage',
            contexts: ['page', 'frame']
        });

        chrome.contextMenus.create({
            id: 'hardReload',
            parentId: 'clearCache',
            title: '清空缓存并重新加载',
            contexts: ['page', 'frame']
        });

        chrome.contextMenus.create({
            id: 'separator1',
            parentId: 'clearCache',
            type: 'separator',
            contexts: ['page', 'frame']
        });

        chrome.contextMenus.create({
            id: 'openPopup',
            parentId: 'clearCache',
            title: '打开清理面板',
            contexts: ['page', 'frame']
        });
    });
}

// 右键菜单点击处理
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
        switch (info.menuItemId) {
            case 'clearAll':
                await clearAllData(tab);
                break;
            case 'clearCookies':
                await clearCookiesData(tab);
                break;
            case 'clearLocalStorage':
                await clearLocalStorageData(tab);
                break;
            case 'hardReload':
                await hardReloadPage(tab);
                break;
            case 'openPopup':
                // 通过发送消息打开弹窗（这需要用户点击插件图标）
                showNotification('请点击插件图标打开清理面板', 'info');
                break;
        }
    } catch (error) {
        console.error('右键菜单操作失败:', error);
        showNotification('操作失败: ' + error.message, 'error');
    }
});

// 快速清理所有数据
async function clearAllData(tab) {
    try {
        const url = tab.url;

        await Promise.all([
            chrome.browsingData.removeCache({
                since: 0,
                origins: [url]
            }),
            chrome.browsingData.removeCookies({
                since: 0,
                origins: [url]
            }),
            chrome.browsingData.removeLocalStorage({
                since: 0,
                origins: [url]
            }),
            chrome.browsingData.removeIndexedDB({
                since: 0,
                origins: [url]
            })
        ]);

        // 清理页面存储
        await chrome.tabs.sendMessage(tab.id, {
            action: 'clearPageStorage',
            types: ['localStorage', 'sessionStorage']
        }).catch(() => { });

        showNotification('所有缓存已清空', 'success');

    } catch (error) {
        console.error('清理所有数据失败:', error);
        throw error;
    }
}

// 清理 Cookies
async function clearCookiesData(tab) {
    try {
        await chrome.browsingData.removeCookies({
            since: 0,
            origins: [tab.url]
        });

        showNotification('Cookies 已清空', 'success');

    } catch (error) {
        console.error('清理 Cookies 失败:', error);
        throw error;
    }
}

// 清理 LocalStorage
async function clearLocalStorageData(tab) {
    try {
        await chrome.browsingData.removeLocalStorage({
            since: 0,
            origins: [tab.url]
        });

        // 同时清理页面级 LocalStorage
        await chrome.tabs.sendMessage(tab.id, {
            action: 'clearPageStorage',
            types: ['localStorage']
        }).catch(() => { });

        showNotification('LocalStorage 已清空', 'success');

    } catch (error) {
        console.error('清理 LocalStorage 失败:', error);
        throw error;
    }
}

// 硬性重新加载页面
async function hardReloadPage(tab) {
    try {
        // 先清理缓存
        await clearAllData(tab);

        // 重新加载页面
        await chrome.tabs.reload(tab.id, { bypassCache: true });

        showNotification('页面正在重新加载', 'info');

    } catch (error) {
        console.error('硬性重新加载失败:', error);
        throw error;
    }
}

// 显示通知
async function showNotification(message, type = 'info') {
    try {
        const settings = await chrome.storage.local.get(['showNotifications']);
        if (settings.showNotifications === false) return;

        const iconUrl = type === 'error' ? 'icons/icon48.png' : 'icons/icon48.png';

        chrome.notifications.create({
            type: 'basic',
            iconUrl: iconUrl,
            title: '清理缓存助手',
            message: message,
            priority: 1
        });
    } catch (error) {
        console.error('显示通知失败:', error);
    }
}

// 处理来自弹窗和内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 收到消息

    switch (message.action) {
        case 'clearAllFromBackground':
            clearAllData(sender.tab)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // 保持消息通道开放

        case 'showNotification':
            showNotification(message.message, message.type);
            sendResponse({ success: true });
            break;

        case 'getTabInfo':
            chrome.tabs.query({ active: true, currentWindow: true })
                .then(tabs => sendResponse({ tab: tabs[0] }))
                .catch(error => sendResponse({ error: error.message }));
            return true;

        default:
            sendResponse({ error: '未知操作' });
    }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 当页面加载完成时，可以注入内容脚本
    if (changeInfo.status === 'complete' && tab.url) {
        // 页面加载完成
    }
});

// 监听插件图标点击（用于快捷操作）
chrome.action.onClicked.addListener(async (tab) => {
    // 这个事件在没有设置 popup 时才会触发
    // 由于我们设置了 popup，这个事件不会被触发
    // 插件图标被点击
});

// 定期清理功能（可选）
async function scheduleCleanup() {
    const settings = await chrome.storage.local.get(['autoCleanOnStartup']);

    if (settings.autoCleanOnStartup) {
        // 浏览器启动时自动清理
        // 执行定期清理

        try {
            await chrome.browsingData.removeCache({ since: Date.now() - 24 * 60 * 60 * 1000 }); // 清理24小时内的缓存
            // 定期清理完成
        } catch (error) {
            console.error('定期清理失败:', error);
        }
    }
}

// 监听浏览器启动
chrome.runtime.onStartup.addListener(() => {
    // 浏览器启动
    scheduleCleanup();
});

// 错误处理
chrome.runtime.onSuspend.addListener(() => {
    // 后台脚本即将被挂起
});

// 处理插件安装/卸载
chrome.management.onUninstalled.addListener((info) => {
    if (info.id === chrome.runtime.id) {
        // 插件即将被卸载
    }
});


// 后台脚本初始化完成

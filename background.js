// 后台服务工作器

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // 首次安装时设置默认设置
        chrome.storage.local.set({
            clearPasswords: true,    // 默认保留密码
            clearFormData: true,     // 默认保留表单数据
            includeProtected: false, // 默认不包含受保护数据
            autoCleanOnStartup: false,
            showNotifications: true,
            version: '1.2.0'
        });
    }

    // 无论安装还是更新，都重新创建右键菜单
    createContextMenus();
});

// 扩展启动时也创建菜单（确保菜单始终存在）
chrome.runtime.onStartup.addListener(() => {
    createContextMenus();
    // 执行定期清理
    scheduleCleanup();
});

// 创建右键菜单
function createContextMenus() {
    // 清除现有菜单
    chrome.contextMenus.removeAll(() => {
        if (chrome.runtime.lastError) {
            return;
        }

        try {
            // 主菜单
            const mainMenuId = chrome.contextMenus.create({
                id: 'clearCache',
                title: '清理缓存助手',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            }, () => {
                if (chrome.runtime.lastError) {
                    return;
                }
            });

            // 子菜单 - 重载功能放在前面
            chrome.contextMenus.create({
                id: 'normalReload',
                parentId: 'clearCache',
                title: '正常重新加载',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

            chrome.contextMenus.create({
                id: 'hardReloadOnly',
                parentId: 'clearCache',
                title: '硬性重新加载',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

            chrome.contextMenus.create({
                id: 'hardReloadCacheOnly',
                parentId: 'clearCache',
                title: '清空缓存并硬性重新加载',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

            chrome.contextMenus.create({
                id: 'separator1',
                parentId: 'clearCache',
                type: 'separator',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

            chrome.contextMenus.create({
                id: 'clearCurrentWebsiteCache',
                parentId: 'clearCache',
                title: '清空当前网站缓存',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

            chrome.contextMenus.create({
                id: 'clearCookies',
                parentId: 'clearCache',
                title: '清空 Cookies',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

            chrome.contextMenus.create({
                id: 'clearLocalStorage',
                parentId: 'clearCache',
                title: '清空 LocalStorage',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

            chrome.contextMenus.create({
                id: 'clearSessionStorage',
                parentId: 'clearCache',
                title: '清空 SessionStorage',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

            chrome.contextMenus.create({
                id: 'hardReload',
                parentId: 'clearCache',
                title: '全部清空重载',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

            chrome.contextMenus.create({
                id: 'separator2',
                parentId: 'clearCache',
                type: 'separator',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

            chrome.contextMenus.create({
                id: 'openPopup',
                parentId: 'clearCache',
                title: '打开清理面板',
                contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
            });

        } catch (error) {
            // 静默处理错误
        }
    });
}

// 右键菜单点击处理
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
        switch (info.menuItemId) {
            case 'normalReload':
                await normalReload(tab);
                break;
            case 'hardReloadOnly':
                await hardReloadOnly(tab);
                break;
            case 'hardReloadCacheOnly':
                await hardReloadCacheOnly(tab);
                break;
            case 'clearCurrentWebsiteCache':
                await clearCurrentWebsiteData(tab);
                break;
            case 'clearCookies':
                await clearCookiesData(tab);
                break;
            case 'clearLocalStorage':
                await clearLocalStorageData(tab);
                break;
            case 'clearSessionStorage':
                await clearSessionStorageData(tab);
                break;
            case 'hardReload':
                await hardReloadPage(tab);
                break;
            case 'openPopup':
                // 打开扩展选项页面或者新标签页显示扩展弹窗
                try {
                    // 方法1：尝试通过action API打开弹窗（可能不工作，但值得尝试）
                    if (chrome.action && chrome.action.openPopup) {
                        chrome.action.openPopup();
                    } else {
                        // 方法2：在新标签页中打开扩展页面
                        chrome.tabs.create({
                            url: `chrome-extension://${chrome.runtime.id}/popup.html`,
                            active: true
                        });
                    }
                } catch (error) {
                    showNotification('请点击浏览器工具栏中的扩展图标打开清理面板', 'info');
                }
                break;
        }
    } catch (error) {
        showNotification('操作失败: ' + error.message, 'error');
    }
});

// 正常重新加载
async function normalReload(tab) {
    try {
        // 普通重新加载页面
        await chrome.tabs.reload(tab.id);
        showNotification('页面正在重新加载', 'success');
    } catch (error) {
        throw error;
    }
}

// 硬性重新加载（绕过缓存）
async function hardReloadOnly(tab) {
    try {
        // 硬性重新加载页面（绕过缓存）
        await chrome.tabs.reload(tab.id, { bypassCache: true });
        showNotification('页面正在硬性重新加载', 'success');
    } catch (error) {
        throw error;
    }
}

// 清理当前网站数据
async function clearCurrentWebsiteData(tab) {
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

        showNotification('当前网站缓存已清空', 'success');

    } catch (error) {
        throw error;
    }
}

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
        throw error;
    }
}

// 清理 SessionStorage
async function clearSessionStorageData(tab) {
    try {
        // SessionStorage 主要通过页面级清理
        await chrome.tabs.sendMessage(tab.id, {
            action: 'clearPageStorage',
            types: ['sessionStorage']
        }).catch(() => { });

        showNotification('SessionStorage 已清空', 'success');

    } catch (error) {
        throw error;
    }
}

// 清空缓存并硬性重新加载（保留登录状态）
async function hardReloadCacheOnly(tab) {
    try {
        const url = tab.url;

        // 只清理文件缓存，不清理 Cookies 和用户数据
        await chrome.browsingData.removeCache({
            since: 0,
            origins: [url]
        });

        // 清理 Service Worker 缓存和 Cache API
        await chrome.tabs.sendMessage(tab.id, {
            action: 'clearPageStorage',
            types: ['cacheAPI', 'serviceWorker']
        }).catch(() => { });

        // 重新加载页面（绕过缓存）
        await chrome.tabs.reload(tab.id, { bypassCache: true });

        showNotification('缓存已清空，页面正在重载', 'success');

    } catch (error) {
        throw error;
    }
}

// 清空所有数据并硬性重新加载（包括登录状态）
async function hardReloadPage(tab) {
    try {
        // 先清理所有数据
        await clearAllData(tab);

        // 重新加载页面
        await chrome.tabs.reload(tab.id, { bypassCache: true });

        showNotification('所有数据已清空，页面正在重载', 'info');

    } catch (error) {
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
        // 静默处理通知错误
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

        case 'clearCurrentWebsiteFromBackground':
            clearCurrentWebsiteData(sender.tab)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'showNotification':
            showNotification(message.message, message.type);
            sendResponse({ success: true });
            break;

        case 'getTabInfo':
            chrome.tabs.query({ active: true, currentWindow: true })
                .then(tabs => sendResponse({ tab: tabs[0] }))
                .catch(error => sendResponse({ error: error.message }));
            return true;

        case 'storageCleared':
            // 接收来自内容脚本的存储清理通知
            sendResponse({ success: true });
            break;

        case 'createContextMenus':
            // 手动创建右键菜单（调试用）
            try {
                createContextMenus();
                sendResponse({ success: true, message: '右键菜单已重新创建' });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
            break;

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
            // 静默处理定期清理错误
        }
    }
}

// 注意：浏览器启动监听器已在前面定义，这里删除重复的监听器

// 错误处理
chrome.runtime.onSuspend.addListener(() => {
    // 后台脚本即将被挂起
});

// 处理插件安装/卸载（注释掉可能有问题的API）
// chrome.management.onUninstalled.addListener((info) => {
//     if (info.id === chrome.runtime.id) {
//         // 插件即将被卸载
//     }
// });


// 后台脚本加载完成

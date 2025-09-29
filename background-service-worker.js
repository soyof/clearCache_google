/**
 * 后台服务工作器
 * 处理插件的后台任务，如右键菜单、通知等
 * 作为Chrome扩展的Service Worker入口点
 */

// 图标URL
const iconUrl = chrome.runtime.getURL('icons/icon128.png');

// 确保Service Worker正常注册
self.addEventListener('install', (event) => {
  // Service Worker 安装
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Service Worker 激活
  event.waitUntil(clients.claim());
  
  // 创建右键菜单
  createContextMenus();
});

// 创建右键菜单
function createContextMenus() {
  // 清除现有菜单
  chrome.contextMenus.removeAll(() => {
    // 主菜单
    chrome.contextMenus.create({
      id: 'clearCache',
      title: '清理缓存助手',
      contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
    });

    // 子菜单 - 重载功能放在前面
    chrome.contextMenus.create({
      id: 'normalReload',
      parentId: 'clearCache',
      title: '正常重新加载',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'hardReloadOnly',
      parentId: 'clearCache',
      title: '硬性重新加载',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'hardReloadCacheOnly',
      parentId: 'clearCache',
      title: '清空缓存并硬性重新加载',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'separator1',
      parentId: 'clearCache',
      type: 'separator',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'clearCurrentWebsiteCache',
      parentId: 'clearCache',
      title: '清空当前网站缓存',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'clearCookies',
      parentId: 'clearCache',
      title: '清空 Cookies',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'clearLocalStorage',
      parentId: 'clearCache',
      title: '清空 LocalStorage',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'clearSessionStorage',
      parentId: 'clearCache',
      title: '清空 SessionStorage',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'hardReload',
      parentId: 'clearCache',
      title: '全部清空重载',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'separator2',
      parentId: 'clearCache',
      type: 'separator',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'openPopup',
      parentId: 'clearCache',
      title: '打开清理面板',
      contexts: ['page']
    });

    // 右键菜单创建成功
  });
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // 处理右键菜单点击
  
  try {
    switch (info.menuItemId) {
      case 'normalReload':
        // 正常重新加载
        // 执行正常重新加载
        chrome.tabs.reload(tab.id);
        showNotification('页面正在重新加载');
        break;
        
      case 'hardReloadOnly':
        // 硬性重新加载
        // 执行硬性重新加载
        chrome.tabs.reload(tab.id, { bypassCache: true });
        showNotification('页面正在硬性重新加载');
        break;
        
      case 'hardReloadCacheOnly':
        // 清空缓存并硬性重新加载
        // 执行清空缓存并硬性重新加载
        chrome.browsingData.removeCache({
          since: 0,
          origins: [tab.url]
        }).then(() => {
          chrome.tabs.reload(tab.id, { bypassCache: true });
          showNotification('缓存已清空，页面正在重载');
        }).catch(error => {
          // 清理缓存失败
          showNotification('清理失败: ' + error.message, 'error');
        });
        break;
      
    case 'clearCurrentWebsiteCache':
      // 清空当前网站缓存
      // 执行清空当前网站缓存
      clearCurrentWebsiteCache(tab);
      break;
      
    case 'clearCookies':
      // 清空Cookies
      // 执行清空Cookies
      chrome.browsingData.removeCookies({
        since: 0,
        origins: [tab.url]
      }).then(() => {
        showNotification('Cookies 已清空');
      }).catch(error => {
        // 清理Cookies失败
        showNotification('清理失败: ' + error.message, 'error');
      });
      break;
      
    case 'clearLocalStorage':
      // 清空LocalStorage
      // 执行清空LocalStorage
      clearLocalStorage(tab);
      break;
      
    case 'clearSessionStorage':
      // 清空SessionStorage
      // 执行清空SessionStorage
      clearSessionStorage(tab);
      break;
      
    case 'hardReload':
      // 全部清空重载
      // 执行全部清空重载
      clearAllAndReload(tab);
      break;
      
    case 'openPopup':
      // 打开清理面板
      // 执行打开清理面板
      try {
        // 获取用户通知设置
        chrome.storage.local.get(['enableNotifications'], async (settings) => {
          // 方法1：尝试通过模拟点击扩展图标来打开弹窗
          if (settings.enableNotifications !== false) {
            // 只有在用户启用通知时才显示通知
            await showNotification('请点击浏览器工具栏中的扩展图标打开清理面板');
          }
          
          // 方法2：尝试通过编程方式激活扩展图标 (不受通知设置影响)
          if (chrome.action) {
            // 使扩展图标高亮显示，提示用户点击
            chrome.action.setIcon({
              path: {
                "16": "icons/icon16.png",
                "32": "icons/icon32.png",
                "48": "icons/icon48.png",
                "128": "icons/icon128.png"
              }
            });
            
            // 设置徽章提醒用户点击
            chrome.action.setBadgeText({ text: "点击" });
            chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
            
            // 3秒后清除徽章
            setTimeout(() => {
              chrome.action.setBadgeText({ text: "" });
            }, 3000);
          }
        });
      } catch (error) {
        // 打开清理面板失败
      }
      break;
      
    default:
      // 未知的菜单项
      showNotification('未知操作: ' + info.menuItemId);
  }
  } catch (error) {
    // 处理右键菜单点击失败
    showNotification('操作失败: ' + error.message, 'error');
  }
});

// 清空当前网站缓存
function clearCurrentWebsiteCache(tab) {
  // 清理缓存
  chrome.browsingData.removeCache({
    since: 0,
    origins: [tab.url]
  }).then(() => {
    // 清理Cookies
    return chrome.browsingData.removeCookies({
      since: 0,
      origins: [tab.url]
    });
  }).then(() => {
    // 清理IndexedDB
    return chrome.browsingData.removeIndexedDB({
      since: 0,
      origins: [tab.url]
    });
  }).then(() => {
    // 清理LocalStorage
    return clearLocalStorage(tab, false);
  }).then(() => {
    // 清理SessionStorage
    return clearSessionStorage(tab, false);
  }).then(() => {
    // 显示成功通知
    showNotification('当前网站缓存已清空');
  }).catch(error => {
    // 清理当前网站缓存失败
    showNotification('清理失败: ' + error.message, 'error');
  });
}

// 清理LocalStorage
function clearLocalStorage(tab, showNotif = true) {
  return chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      try {
        if (typeof localStorage === 'undefined') {
          return { success: false, error: 'LocalStorage不可用' };
        }
        
        const itemCount = localStorage.length;
        localStorage.clear();
        return { success: true, count: itemCount };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }).then(result => {
    // LocalStorage清理完成
    
    if (showNotif) {
      showNotification('LocalStorage 已清空');
    }
    return result;
  }).catch(error => {
    // 清理LocalStorage失败
    if (showNotif) {
      showNotification('清理LocalStorage失败: ' + error.message, 'error');
    }
    throw error;
  });
}

// 清理SessionStorage
function clearSessionStorage(tab, showNotif = true) {
  return chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      try {
        if (typeof sessionStorage === 'undefined') {
          return { success: false, error: 'SessionStorage不可用' };
        }
        
        const itemCount = sessionStorage.length;
        sessionStorage.clear();
        return { success: true, count: itemCount };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }).then(result => {
    // SessionStorage清理完成
    
    if (showNotif) {
      showNotification('SessionStorage 已清空');
    }
    return result;
  }).catch(error => {
    // 清理SessionStorage失败
    if (showNotif) {
      showNotification('清理SessionStorage失败: ' + error.message, 'error');
    }
    throw error;
  });
}

// 清空所有数据并重新加载
function clearAllAndReload(tab) {
  // 定义清理选项
  const apiOptions = {
    since: 0,
    origins: [tab.url]
  };
  
  // 清理所有数据
  Promise.all([
    // 清理缓存
    chrome.browsingData.removeCache(apiOptions),
    // 清理Cookies
    chrome.browsingData.removeCookies(apiOptions),
    // 清理IndexedDB
    chrome.browsingData.removeIndexedDB(apiOptions)
  ]).then(() => {
    // 清理LocalStorage
    return clearLocalStorage(tab, false);
  }).then(() => {
    // 清理SessionStorage
    return clearSessionStorage(tab, false);
  }).then(() => {
    // 重新加载页面
    return chrome.tabs.reload(tab.id, { bypassCache: true });
  }).then(() => {
    // 显示成功通知
    showNotification('所有数据已清空，页面正在重载');
  }).catch(error => {
    // 全部清空重载失败
    showNotification('清理失败: ' + error.message, 'error');
  });
}

// 显示通知
async function showNotification(message, type = 'basic') {
  try {
    // 获取用户通知设置
    const settings = await chrome.storage.local.get(['enableNotifications', 'notificationSound']);
    
    // 如果用户禁用了通知，则不显示
    if (settings.enableNotifications === false) {
      // 通知已禁用，不显示
      return;
    }
    
    // 创建通知
    chrome.notifications.create({
      type: type,
      iconUrl: iconUrl,
      title: '清理缓存助手',
      message: message,
      priority: 1,
      silent: !settings.notificationSound // 根据用户设置决定是否静音
    });
    
    // 显示通知
  } catch (error) {
    // 显示通知失败
    // 出错时尝试使用默认设置显示通知
    try {
      chrome.notifications.create({
        type: type,
        iconUrl: iconUrl,
        title: '清理缓存助手',
        message: message,
        priority: 1
      });
    } catch (e) {
      // 使用默认设置显示通知也失败
    }
  }
}

// 处理来自弹窗和内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理消息
  
  switch (message.action) {
    case 'ping':
      // 简单的ping测试
      sendResponse({ 
        success: true, 
        message: 'pong',
        timestamp: Date.now()
      });
      break;
      
    case 'checkServiceWorkerStatus':
      // 检查Service Worker状态
      sendResponse({ 
        success: true, 
        message: 'Service Worker 已注册并正常运行'
      });
      break;
      
    case 'keepAlive':
      // 保活请求
      sendResponse({ 
        success: true, 
        message: '保活机制已启动'
      });
      break;
      
    case 'createContextMenus':
      // 创建右键菜单
      createContextMenus();
      sendResponse({ 
        success: true, 
        message: '右键菜单已创建'
      });
      break;
      
    default:
      sendResponse({ 
        success: false, 
        message: '未知操作'
      });
  }
  
  return true; // 保持消息通道开放
});

// 立即创建右键菜单
createContextMenus();

// 服务工作器已加载完成

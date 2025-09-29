/**
 * Service Worker 桥接脚本
 * 用于保持Service Worker活跃并处理消息转发
 * 与background-service-worker.js配合使用
 */

// 保持Service Worker活跃的定时器
let keepAliveInterval;

// 初始化桥接
function initBridge() {
    // 初始化Service Worker桥接
    
    // 启动保活机制
    startKeepAlive();
    
    // 确保右键菜单创建
    ensureContextMenus();
    
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // 确保消息能够被转发
        if (message && message.action) {
            // 收到消息
            
            // 处理特定消息
            if (message.action === 'keepAlive') {
                startKeepAlive();
                sendResponse({ success: true, message: '桥接保活机制已启动' });
                return true;
            }
            
            // 不再转发其他消息，避免干扰Service Worker的消息处理
            if (message.action === 'contextMenuClicked') {
                // 忽略右键菜单点击消息，避免干扰Service Worker
                // 不处理这类消息，避免干扰
                sendResponse({ success: false, message: '桥接脚本不处理右键菜单消息' });
                return true;
            }
            
            // 其他消息不处理
            return false;
        }
    });
}

// 保持Service Worker活跃
function startKeepAlive() {
    // 启动保活机制
    
    // 清除可能存在的旧定时器
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
    
    // 每25秒发送一次保活消息
    keepAliveInterval = setInterval(() => {
        // 发送保活心跳
        
        // 向Service Worker发送保活消息
        chrome.runtime.sendMessage({ 
            action: 'keepAlive',
            source: 'bridge',
            timestamp: Date.now()
        }).catch(error => {
            // 保活消息发送失败
            
            // 如果保活消息失败，尝试重新创建右键菜单
            ensureContextMenus();
        });
        
    }, 25000);
}

// 确保右键菜单创建
function ensureContextMenus() {
    // 确保右键菜单创建
    
    // 向Service Worker发送创建右键菜单的请求
    chrome.runtime.sendMessage({ 
        action: 'createContextMenus',
        source: 'bridge',
        timestamp: Date.now()
    }).then(response => {
        // 右键菜单创建响应
    }).catch(error => {
        // 右键菜单创建请求失败
    });
}

// 初始化桥接
initBridge();

// 导出保活函数，供其他模块使用
window.serviceWorkerBridge = {
    keepAlive: startKeepAlive,
    ensureContextMenus: ensureContextMenus
};

// 页面可见性变化时，确保右键菜单存在
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // 页面变为可见，确保右键菜单存在
        ensureContextMenus();
    }
});

// Service Worker桥接已加载

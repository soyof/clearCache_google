/**
 * 通知工具模块
 * 提供统一的通知显示和管理功能
 */

const iconUrl = chrome.runtime.getURL('icons/icon128.png');

/**
 * 通知管理器
 */
const NotificationManager = {
    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型 (info, success, warning, error)
     * @returns {Promise<void>}
     */
    show: async function(message, type = 'info') {
        try {
            const settings = await chrome.storage.local.get(['enableNotifications', 'notificationSound']);
            if (settings.enableNotifications === false) return;

            const notificationOptions = {
                type: 'basic',
                iconUrl: iconUrl,
                title: '清理缓存助手',
                message: message,
                priority: 1,
                silent: !settings.notificationSound // 根据notificationSound设置决定是否静音
            };

            chrome.notifications.create(notificationOptions);
        } catch (error) {
            // 显示通知失败
        }
    },
    
    /**
     * 显示成功通知
     * @param {string} message - 通知消息
     * @returns {Promise<void>}
     */
    success: async function(message) {
        await this.show(message, 'success');
    },
    
    /**
     * 显示错误通知
     * @param {string} message - 通知消息
     * @returns {Promise<void>}
     */
    error: async function(message) {
        await this.show(message, 'error');
    },
    
    /**
     * 显示警告通知
     * @param {string} message - 通知消息
     * @returns {Promise<void>}
     */
    warning: async function(message) {
        await this.show(message, 'warning');
    },
    
    /**
     * 显示信息通知
     * @param {string} message - 通知消息
     * @returns {Promise<void>}
     */
    info: async function(message) {
        await this.show(message, 'info');
    }
};

export { NotificationManager };

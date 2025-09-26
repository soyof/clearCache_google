// 内容脚本 - 处理页面级别的缓存清理
(function () {
    'use strict';

    // 清理缓存助手内容脚本已加载

    // 存储清理函数
    const StorageCleaner = {
        // 清理 LocalStorage
        clearLocalStorage() {
            try {
                const itemCount = localStorage.length;
                localStorage.clear();
                // 已清理 LocalStorage 项目
                return { success: true, count: itemCount };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        // 清理 SessionStorage
        clearSessionStorage() {
            try {
                const itemCount = sessionStorage.length;
                sessionStorage.clear();
                // 已清理 SessionStorage 项目
                return { success: true, count: itemCount };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        // 清理 IndexedDB
        async clearIndexedDB() {
            try {
                const databases = await indexedDB.databases();
                const deletePromises = databases.map(db => {
                    return new Promise((resolve, reject) => {
                        const deleteRequest = indexedDB.deleteDatabase(db.name);
                        deleteRequest.onsuccess = () => {
                            // 已删除 IndexedDB 数据库
                            resolve(db.name);
                        };
                        deleteRequest.onerror = () => reject(deleteRequest.error);
                        deleteRequest.onblocked = () => {
                            resolve(db.name); // 即使被阻止也算成功
                        };
                    });
                });

                const deletedDatabases = await Promise.all(deletePromises);
                return { success: true, databases: deletedDatabases };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        // 清理 WebSQL（已废弃，但某些老网站可能还在使用）
        clearWebSQL() {
            try {
                if (typeof openDatabase === 'function') {
                    // WebSQL 已被废弃，大多数浏览器不再支持
                    // WebSQL 已被废弃，跳过清理
                    return { success: true, message: 'WebSQL 已被废弃' };
                }
                return { success: true, message: '不支持 WebSQL' };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        // 清理 Cache API
        async clearCacheAPI() {
            try {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    const deletePromises = cacheNames.map(name => caches.delete(name));
                    await Promise.all(deletePromises);
                    // 已清理 Cache API 缓存
                    return { success: true, count: cacheNames.length, names: cacheNames };
                } else {
                    return { success: true, message: '不支持 Cache API' };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        // 清理 Service Worker 缓存
        async clearServiceWorkerCaches() {
            try {
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    const unregisterPromises = registrations.map(registration => {
                        // 注销 Service Worker
                        return registration.unregister();
                    });
                    await Promise.all(unregisterPromises);
                    return { success: true, count: registrations.length };
                } else {
                    return { success: true, message: '不支持 Service Worker' };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        // 清理页面特定的存储
        async clearPageSpecificStorage() {
            const results = {};

            try {
                // 清理所有类型的存储
                results.localStorage = this.clearLocalStorage();
                results.sessionStorage = this.clearSessionStorage();
                results.indexedDB = await this.clearIndexedDB();
                results.webSQL = this.clearWebSQL();
                results.cacheAPI = await this.clearCacheAPI();
                results.serviceWorker = await this.clearServiceWorkerCaches();

                return { success: true, results };
            } catch (error) {
                return { success: false, error: error.message, results };
            }
        },

        // 获取存储使用情况
        async getStorageUsage() {
            const usage = {};

            try {
                // LocalStorage 使用情况
                usage.localStorage = {
                    count: localStorage.length,
                    keys: Object.keys(localStorage)
                };

                // SessionStorage 使用情况
                usage.sessionStorage = {
                    count: sessionStorage.length,
                    keys: Object.keys(sessionStorage)
                };

                // IndexedDB 使用情况
                if ('indexedDB' in window) {
                    const databases = await indexedDB.databases();
                    usage.indexedDB = {
                        count: databases.length,
                        databases: databases.map(db => ({ name: db.name, version: db.version }))
                    };
                }

                // Cache API 使用情况
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    usage.cacheAPI = {
                        count: cacheNames.length,
                        names: cacheNames
                    };
                }

                // Service Worker 使用情况
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    usage.serviceWorker = {
                        count: registrations.length,
                        scopes: registrations.map(reg => reg.scope)
                    };
                }

                return usage;
            } catch (error) {
                return { error: error.message };
            }
        }
    };

    // 监听来自弹窗和后台脚本的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // 内容脚本收到消息

        switch (message.action) {
            case 'clearPageStorage':
                handleClearPageStorage(message, sendResponse);
                return true; // 保持消息通道开放

            case 'getStorageUsage':
                handleGetStorageUsage(sendResponse);
                return true;

            case 'clearSpecificStorage':
                handleClearSpecificStorage(message, sendResponse);
                return true;

            default:
                sendResponse({ error: '未知操作' });
        }
    });

    // 处理清理页面存储请求
    async function handleClearPageStorage(message, sendResponse) {
        try {
            const types = message.types || ['localStorage', 'sessionStorage'];
            const results = {};

            for (const type of types) {
                switch (type) {
                    case 'localStorage':
                        results.localStorage = StorageCleaner.clearLocalStorage();
                        break;
                    case 'sessionStorage':
                        results.sessionStorage = StorageCleaner.clearSessionStorage();
                        break;
                    case 'indexedDB':
                        results.indexedDB = await StorageCleaner.clearIndexedDB();
                        break;
                    case 'cacheAPI':
                        results.cacheAPI = await StorageCleaner.clearCacheAPI();
                        break;
                    case 'serviceWorker':
                        results.serviceWorker = await StorageCleaner.clearServiceWorkerCaches();
                        break;
                    case 'all':
                        const allResults = await StorageCleaner.clearPageSpecificStorage();
                        Object.assign(results, allResults.results);
                        break;
                }
            }

            // 通知后台脚本
            chrome.runtime.sendMessage({
                action: 'storageCleared',
                types: types,
                results: results,
                url: location.href
            });

            sendResponse({ success: true, results });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    // 处理获取存储使用情况请求
    async function handleGetStorageUsage(sendResponse) {
        try {
            const usage = await StorageCleaner.getStorageUsage();
            sendResponse({ success: true, usage });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    // 处理清理特定存储请求
    async function handleClearSpecificStorage(message, sendResponse) {
        try {
            const { storageType, options = {} } = message;
            let result;

            switch (storageType) {
                case 'localStorage':
                    if (options.keys) {
                        // 清理指定的 keys
                        options.keys.forEach(key => localStorage.removeItem(key));
                        result = { success: true, message: `已删除 ${options.keys.length} 个 LocalStorage 项目` };
                    } else {
                        result = StorageCleaner.clearLocalStorage();
                    }
                    break;

                case 'sessionStorage':
                    if (options.keys) {
                        // 清理指定的 keys
                        options.keys.forEach(key => sessionStorage.removeItem(key));
                        result = { success: true, message: `已删除 ${options.keys.length} 个 SessionStorage 项目` };
                    } else {
                        result = StorageCleaner.clearSessionStorage();
                    }
                    break;

                case 'indexedDB':
                    result = await StorageCleaner.clearIndexedDB();
                    break;

                case 'cacheAPI':
                    result = await StorageCleaner.clearCacheAPI();
                    break;

                case 'serviceWorker':
                    result = await StorageCleaner.clearServiceWorkerCaches();
                    break;

                default:
                    result = { success: false, error: '不支持的存储类型' };
            }

            sendResponse(result);
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    // 页面卸载时的清理（可选）
    window.addEventListener('beforeunload', () => {
        // 页面即将卸载
    });

    // 监听存储变化
    window.addEventListener('storage', (event) => {
        // 存储发生变化
    });
});


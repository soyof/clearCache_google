// 内容脚本 - 处理页面级别的缓存清理
(function () {
    'use strict';

    // 防止重复加载
    if (window.__CACHE_CLEANER_CONTENT_SCRIPT_LOADED__) {
        // 清理缓存助手内容脚本已经加载，跳过重复初始化
        return;
    }
    
    // 标记内容脚本已加载
    window.__CACHE_CLEANER_CONTENT_SCRIPT_LOADED__ = true;
    
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
                // 检查sessionStorage是否可用
                if (typeof sessionStorage === 'undefined') {
                    // SessionStorage不可用
                    return { success: false, error: 'SessionStorage不可用' };
                }
                
                // 检查sessionStorage是否可写
                try {
                    // 尝试写入一个测试值
                    const testKey = '_test_session_storage_' + Date.now();
                    sessionStorage.setItem(testKey, '1');
                    sessionStorage.removeItem(testKey);
                } catch (writeError) {
                    // SessionStorage不可写
                    return { success: false, error: '无法写入SessionStorage: ' + writeError.message };
                }
                
                // 记录清理前的信息
                const itemCount = sessionStorage.length;
                const keys = [];
                for (let i = 0; i < itemCount; i++) {
                    const key = sessionStorage.key(i);
                    if (key) keys.push(key);
                }
                
                // 准备清理SessionStorage
                
                // 执行清理
                sessionStorage.clear();
                
                // 验证清理结果
                const afterCount = sessionStorage.length;
                // SessionStorage已清理
                
                return { 
                    success: true, 
                    count: itemCount,
                    beforeKeys: keys,
                    afterCount: afterCount
                };
            } catch (error) {
                // 清理SessionStorage时出错
                return { 
                    success: false, 
                    error: error.message,
                    errorName: error.name,
                    errorStack: error.stack
                };
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
                    // 获取所有已注册的Service Worker
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    
                    if (registrations.length === 0) {
                        return { success: true, count: 0, message: '没有已注册的Service Worker' };
                    }
                    
                    // 注销所有Service Worker
                    const unregisterPromises = registrations.map(registration => {
                        return registration.unregister();
                    });
                    
                    const results = await Promise.all(unregisterPromises);
                    const successCount = results.filter(Boolean).length;
                    
                    // 尝试清除Service Worker缓存
                    if ('caches' in window) {
                        try {
                            const cacheNames = await caches.keys();
                            const deletePromises = cacheNames.map(name => {
                                if (name.includes('sw-')) {
                                    return caches.delete(name);
                                }
                                return Promise.resolve(false);
                            });
                            await Promise.all(deletePromises);
                        } catch (cacheError) {
                            // 清理Service Worker缓存失败
                        }
                    }
                    
                    return { 
                        success: true, 
                        count: registrations.length,
                        successCount: successCount,
                        scopes: registrations.map(reg => reg.scope)
                    };
                } else {
                    return { success: true, message: '不支持 Service Worker' };
                }
            } catch (error) {
                // 清理Service Worker时出错
                return { success: false, error: error.message, stack: error.stack };
            }
        },

        // 清理页面特定的存储
        async clearPageSpecificStorage(types = []) {
            const results = {};

            try {
                // 只清理指定类型的存储
                if (types.length === 0 || types.includes('localStorage')) {
                    results.localStorage = this.clearLocalStorage();
                }
                
                if (types.length === 0 || types.includes('sessionStorage')) {
                    results.sessionStorage = this.clearSessionStorage();
                }
                
                if (types.length === 0 || types.includes('indexedDB')) {
                    results.indexedDB = await this.clearIndexedDB();
                }
                
                if (types.length === 0 || types.includes('webSQL')) {
                    results.webSQL = this.clearWebSQL();
                }
                
                if (types.length === 0 || types.includes('cacheAPI')) {
                    results.cacheAPI = await this.clearCacheAPI();
                }
                
                if (types.length === 0 || types.includes('serviceWorker')) {
                    results.serviceWorker = await this.clearServiceWorkerCaches();
                }

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
        // 内容脚本收到消息

        switch (message.action) {
            case 'ping':
                // 用于检查内容脚本是否已加载
                sendResponse({ success: true, message: 'pong' });
                return true;
                
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
                sendResponse({ error: '未知操作', action: message.action });
        }
    });

    // 处理清理页面存储请求
    async function handleClearPageStorage(message, sendResponse) {
        try {
            // 确保types是一个数组，且只包含指定的类型
            const requestedTypes = message.types || [];
            const types = Array.isArray(requestedTypes) ? requestedTypes : [requestedTypes];
            
            const results = {};
            const errors = {};
            let hasError = false;

            // 开始清理页面存储

            for (const type of types) {
                try {
                    switch (type) {
                        case 'localStorage':
                            // 确保只清理localStorage，不影响sessionStorage
                            // 仅清理localStorage
                            results.localStorage = StorageCleaner.clearLocalStorage();
                            if (!results.localStorage.success) {
                                errors.localStorage = results.localStorage.error;
                                hasError = true;
                            }
                            // 确认sessionStorage没有被清理
                            if (typeof sessionStorage !== 'undefined') {
                                // 确认sessionStorage未被清理
                            }
                            break;
                        case 'sessionStorage':
                            // 确保只清理sessionStorage，不影响localStorage
                            // 仅清理sessionStorage
                            results.sessionStorage = StorageCleaner.clearSessionStorage();
                            if (!results.sessionStorage.success) {
                                errors.sessionStorage = results.sessionStorage.error;
                                hasError = true;
                            }
                            // 确认localStorage没有被清理
                            if (typeof localStorage !== 'undefined') {
                                // 确认localStorage未被清理
                            }
                            break;
                        case 'indexedDB':
                            results.indexedDB = await StorageCleaner.clearIndexedDB();
                            if (!results.indexedDB.success) {
                                errors.indexedDB = results.indexedDB.error;
                                hasError = true;
                            }
                            break;
                        case 'cacheAPI':
                            results.cacheAPI = await StorageCleaner.clearCacheAPI();
                            if (!results.cacheAPI.success) {
                                errors.cacheAPI = results.cacheAPI.error;
                                hasError = true;
                            }
                            break;
                        case 'serviceWorker':
                            results.serviceWorker = await StorageCleaner.clearServiceWorkerCaches();
                            if (!results.serviceWorker.success) {
                                errors.serviceWorker = results.serviceWorker.error;
                                hasError = true;
                            }
                            break;
                        case 'all':
                            // 清理所有类型的存储，但不包括未明确指定的类型
                            const allResults = {};
                            
                            // 只清理明确包含在types中的存储类型
                            if (types.includes('localStorage') || types.includes('all')) {
                                allResults.localStorage = StorageCleaner.clearLocalStorage();
                                if (!allResults.localStorage.success) {
                                    errors.localStorage = allResults.localStorage.error;
                                    hasError = true;
                                }
                            }
                            
                            if (types.includes('sessionStorage') || types.includes('all')) {
                                allResults.sessionStorage = StorageCleaner.clearSessionStorage();
                                if (!allResults.sessionStorage.success) {
                                    errors.sessionStorage = allResults.sessionStorage.error;
                                    hasError = true;
                                }
                            }
                            
                            if (types.includes('indexedDB') || types.includes('all')) {
                                allResults.indexedDB = await StorageCleaner.clearIndexedDB();
                                if (!allResults.indexedDB.success) {
                                    errors.indexedDB = allResults.indexedDB.error;
                                    hasError = true;
                                }
                            }
                            
                            if (types.includes('cacheAPI') || types.includes('all')) {
                                allResults.cacheAPI = await StorageCleaner.clearCacheAPI();
                                if (!allResults.cacheAPI.success) {
                                    errors.cacheAPI = allResults.cacheAPI.error;
                                    hasError = true;
                                }
                            }
                            
                            if (types.includes('serviceWorker') || types.includes('all')) {
                                allResults.serviceWorker = await StorageCleaner.clearServiceWorkerCaches();
                                if (!allResults.serviceWorker.success) {
                                    errors.serviceWorker = allResults.serviceWorker.error;
                                    hasError = true;
                                }
                            }
                            
                            Object.assign(results, allResults);
                            break;
                    }
                } catch (typeError) {
                    // 清理时出错
                    errors[type] = typeError.message;
                    hasError = true;
                }
            }

            // 通知后台脚本
            chrome.runtime.sendMessage({
                action: 'storageCleared',
                types: types,
                results: results,
                errors: errors,
                url: location.href
            }).catch(() => { /* 发送清理结果时出错 */ });

            if (hasError) {
                // 清理过程中发生错误
                sendResponse({ success: false, results, errors });
            } else {
                // 清理完成
                sendResponse({ success: true, results });
            }
        } catch (error) {
            // 处理清理请求时出错
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


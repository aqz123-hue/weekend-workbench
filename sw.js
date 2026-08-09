/**
 * 周末工作台 · Service Worker (自毁版)
 *
 * 此版本只做一件事：清除旧 SW 留下的所有缓存，然后注销自身。
 * 旧 SW 检测到此文件变化后会安装这个新版本，
 * 新版本在 activate 时清除缓存并立即注销。
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // 清除所有缓存（旧版本的 wwb-v3 等）
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      // 注销自身
      return self.registration.unregister();
    })
  );
  // 立即接管所有页面
  self.clients.claim();
});

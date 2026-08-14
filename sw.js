/**
 * 周末工作台 · 一次性清理 Service Worker
 *
 * 用途：彻底清除手机上残留的旧版 Service Worker 及其缓存。
 *
 * 背景：之前为了根除「版本回退」直接删除了 sw.js，但已安装在手机上的
 * 旧 SW 不会因此消失，反而会一直吐旧缓存、并在更新检查时因 sw.js 404
 * 而继续存活，导致新版永远加载不出来。
 *
 * 本文件被旧页面触发更新后，会：
 *   1. 接管控制权（skipWaiting + clients.claim）
 *   2. 删除所有旧缓存桶（wwb-v3/v4/v5/v7、wwb-data-* 等，一律清空）
 *   3. 注销自身，彻底移除 Service Worker
 *   4. 刷新当前页面，加载最新版本
 *
 * 之后不拦截任何请求（纯网络透传），应用完全不再依赖 Service Worker。
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 立即接管当前所有客户端
      await self.clients.claim();

      // 删除所有缓存桶，不留任何旧版本
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // 注销自身，彻底移除 Service Worker
      await self.registration.unregister();

      // 刷新所有已打开的页面，加载最新版本
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        try {
          client.navigate(client.url);
        } catch (e) {
          /* 忽略单个客户端刷新失败 */
        }
      });
    })()
  );
});

// 不拦截任何请求：走默认网络透传，绝不缓存

/**
 * 周末工作台 · 一次性清理 Service Worker（自毁版）
 *
 * 为什么需要它：之前直接删除了 sw.js，但手机里已安装的旧 SW 不会消失——
 * 它每次更新检查拿到 404，判定「无更新」就永久存活，继续吐旧缓存，
 * 导致新版永远加载不出来。
 *
 * 本文件被旧 SW 触发更新后，会：
 *   1. 接管控制权（skipWaiting + clients.claim）
 *   2. 删除所有旧缓存桶（一律清空）
 *   3. 注销自身，彻底移除 Service Worker
 *   4. 刷新页面，加载最新版本
 *
 * 之后应用纯网络加载，不再使用 Service Worker。
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

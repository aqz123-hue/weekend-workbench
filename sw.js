/**
 * 周末工作台 · Service Worker
 *
 * 核心作用：让 iOS 将本应用识别为「已安装的 PWA」，
 * 从而获得持久存储资格，避免 7 天数据清除策略。
 *
 * 策略：不在 install 阶段预缓存 HTML，防止旧版本被钉死。
 *       所有页面请求走网络优先 + no-cache 强制 revalidate。
 *       网络成功后才缓存，作为离线回退。
 */

const CACHE_NAME = 'wwb-v7';
const DATA_CACHE = 'wwb-data-v4';

// 安装：只缓存 manifest，不缓存 HTML（避免旧版本被预缓存钉死）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['./manifest.json']);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== DATA_CACHE).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// 网络优先 + no-cache 强制 revalidate，离线回退到缓存
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isNav = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request, isNav ? { cache: 'no-cache' } : {})
      .then((response) => {
        // 网络成功 → 缓存最新版本，作为下次离线回退
        if (isNav || event.request.url.endsWith('.html')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // 网络失败 → 使用缓存（离线场景）
        return caches.match(event.request);
      })
  );
});

// 监听主线程消息：将数据镜像到 Cache API
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'BACKUP_TO_CACHE') {
    const payload = event.data.payload;
    caches.open(DATA_CACHE).then((cache) => {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const response = new Response(blob);
      cache.put('/_data_backup', response);
    });
  }
});

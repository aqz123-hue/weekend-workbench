/**
 * 周末工作台 · Service Worker
 *
 * 核心作用：让 iOS 将本应用识别为「已安装的 PWA」，
 * 从而获得持久存储资格，避免 7 天数据清除策略。
 *
 * 额外功能：
 * - 离线时用 Cache API 提供基础页面骨架
 * - 监听消息通道，允许主线程将数据镜像到 Cache API（比 localStorage 更持久）
 */

const CACHE_NAME = 'wwb-v5'; // 每次发版更新版本号，触发自动刷新
const DATA_CACHE = 'wwb-data-v4';

// 安装：预缓存页面本身
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['./index.html', './manifest.json']);
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

// 网络优先，离线回退到缓存
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 缓存成功的 HTML 响应
        if (event.request.destination === 'document' || event.request.url.endsWith('.html')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
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

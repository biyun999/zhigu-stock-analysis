// 智股分析 Service Worker - PWA离线缓存 v3.5
const CACHE_NAME = 'zhigu-v3.5';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './echarts.min.js',
  './manifest.json'
];

// API缓存TTL（毫秒）
const API_TTL = {
  'qt.gtimg.cn': 15 * 1000,        // 行情15秒
  'push2.eastmoney.com': 30 * 1000, // 东财数据30秒
  'push2his.eastmoney.com': 60 * 1000, // K线60秒
  '82.push2.eastmoney.com': 30 * 1000,
  'web.ifzq.gtimg.cn': 60 * 1000,   // K线60秒
  'searchapi.eastmoney.com': 120 * 1000, // 搜索2分钟
  'np-anotice-stock.eastmoney.com': 120 * 1000, // 新闻2分钟
  'smartbox.gtimg.cn': 120 * 1000
};

// 安装时缓存所有静态资源（含本地化ECharts）
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 判断是否为API请求
function isAPI(url) {
  return url.includes('gtimg.cn') || url.includes('eastmoney.com') || url.includes('push2');
}

// 获取API的TTL
function getTTL(url) {
  for (const domain in API_TTL) {
    if (url.includes(domain)) return API_TTL[domain];
  }
  return 60 * 1000; // 默认60秒
}

// stale-while-revalidate策略：
// 1. 有缓存且未过期 → 立即返回缓存，同时后台更新
// 2. 有缓存但已过期 → 返回缓存（标注stale），同时后台更新
// 3. 无缓存 → 走网络，成功后缓存
// 4. 网络失败且无缓存 → 返回离线提示
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // 只处理GET请求
  if (event.request.method !== 'GET') return;
  
  // 静态资源：cache-first（ECharts/HTML/CSS/JS）
  if (!isAPI(url) && (url.includes(self.location.origin) || url.startsWith('http'))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          // 后台更新
          fetch(event.request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // 离线fallback
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }
  
  // API请求：stale-while-revalidate
  if (isAPI(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cachedResponse = await cache.match(event.request);
        const now = Date.now();
        const ttl = getTTL(url);
        
        // 后台更新函数
        const fetchAndCache = async () => {
          try {
            const response = await fetch(event.request);
            if (response.ok) {
              // 存储时附带时间戳
              const cloned = response.clone();
              const headers = new Headers(cloned.headers);
              headers.append('x-sw-cache-time', now.toString());
              headers.append('x-sw-cache-ttl', ttl.toString());
              const cachedWithTime = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
              });
              cache.put(event.request, cachedWithTime);
            }
            return response;
          } catch (e) {
            return null;
          }
        };
        
        if (cachedResponse) {
          const cacheTime = parseInt(cachedResponse.headers.get('x-sw-cache-time') || '0');
          const age = now - cacheTime;
          const isStale = age > ttl;
          
          // 后台静默更新（不阻塞响应）
          fetchAndCache();
          
          // 返回缓存数据（即使过期也返回，总比没有好）
          if (isStale) {
            // 在响应头标注数据已过期，前端可据此提示
            const headers = new Headers(cachedResponse.headers);
            headers.append('x-sw-stale', 'true');
            headers.append('x-sw-cache-age', age.toString());
            return new Response(cachedResponse.body, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: headers
            });
          }
          return cachedResponse;
        }
        
        // 无缓存，走网络
        const networkResponse = await fetchAndCache();
        if (networkResponse) return networkResponse;
        
        // 完全离线且无缓存
        return new Response(JSON.stringify({
          rc: 0,
          offline: true,
          message: '当前网络不可用，且无本地缓存数据'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});

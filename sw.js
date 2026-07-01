const CACHE_NAME = 'toeic-quiz-v3'; // Đổi tên cache để làm mới

// Các file cốt lõi của dự án (sửa lại đường dẫn data/)
const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './data/read_1_new.json',
  './data/read_2_new.json',
  './data/listen_1_new.json',
  './data/listen_2_new.json'
];

// 1. Khi cài đặt: Lưu trước các file gốc
self.addEventListener('install', event => {
  self.skipWaiting(); // Ép Service Worker mới kích hoạt ngay
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// 2. Khi khởi động: Xóa các cache cũ (nếu có update)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Khi truy cập mạng: Bắt mọi request để lưu Offline động (Dynamic Caching)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Trả về file offline nếu có sẵn
      if (cachedResponse) {
        // Cập nhật ngầm file mới từ mạng vào cache (để lần sau có bản mới nhất)
        fetch(event.request).then(networkResponse => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {}); // Bỏ qua lỗi nếu đang mất mạng
        
        return cachedResponse;
      }

      // Nếu chưa có trong cache (như các file CSS, FontAwesome, Confetti)
      // Tải từ mạng -> Trả về giao diện -> Đồng thời Lưu luôn vào cache cho lần sau
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        console.log("Bạn đang Offline và file này chưa được lưu!");
      });
    })
  );
});
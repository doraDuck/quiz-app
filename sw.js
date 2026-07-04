const CACHE_NAME = "toeic-quiz-v8"; // Đổi tên cache để làm mới

// Các file cốt lõi của dự án (sửa lại đường dẫn data/)
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./data/read_1_new.json",
  "./data/read_2_new.json",
  "./data/listen_1_new.json",
  "./data/listen_2_new.json",
];

// 1. Khi cài đặt: Lưu trước các file gốc
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Ép Service Worker mới kích hoạt ngay
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }),
  );
});

// 2. Khi khởi động: Xóa các cache cũ (nếu có update)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
});

// 3. Khi truy cập mạng: Bắt mọi request (bao gồm ảnh) để lưu Offline
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Chỉ xử lý các request GET
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Nếu có sẵn trong cache, trả về ngay lập tức
      if (cachedResponse) {
        return cachedResponse;
      }

      // Nếu chưa có, tải từ mạng về
      return fetch(event.request)
        .then((networkResponse) => {
          // Kiểm tra nếu là file ảnh hoặc file dữ liệu hợp lệ
          if (
            !networkResponse ||
            (networkResponse.status !== 200 && networkResponse.status !== 0)
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Lưu vào cache cho các lần truy cập sau
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Nếu mất mạng hoàn toàn và file chưa được cache, bạn có thể trả về 1 ảnh placeholder ở đây
          return null;
        });
    }),
  );
});

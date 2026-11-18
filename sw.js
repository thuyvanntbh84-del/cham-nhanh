/* CHẤM NHANH – service worker: cho phép mở app khi không có mạng.
   Đổi số PHIEN_BAN mỗi lần sửa app để điện thoại tải bản mới. */
var PHIEN_BAN = "cham-nhanh-v1";
var CAN_LUU = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(PHIEN_BAN).then(function (kho) {
      return Promise.all(CAN_LUU.map(function (u) {
        return kho.add(new Request(u, { cache: "reload" })).catch(function () { /* thiếu 1 file thì bỏ qua */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ten) {
      return Promise.all(ten.map(function (t) {
        return t === PHIEN_BAN ? null : caches.delete(t);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Trang chính: ưu tiên bản mới trên mạng, mất mạng thì lấy bản đã lưu
  if (req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") >= 0) {
    e.respondWith(
      fetch(req).then(function (res) {
        var ban_sao = res.clone();
        caches.open(PHIEN_BAN).then(function (kho) { kho.put("./index.html", ban_sao); });
        return res;
      }).catch(function () {
        return caches.match("./index.html").then(function (r) { return r || caches.match("./"); });
      })
    );
    return;
  }

  // Ảnh, manifest…: lấy bản đã lưu trước cho nhanh
  e.respondWith(
    caches.match(req).then(function (r) {
      return r || fetch(req).then(function (res) {
        var ban_sao = res.clone();
        caches.open(PHIEN_BAN).then(function (kho) { kho.put(req, ban_sao); });
        return res;
      });
    })
  );
});

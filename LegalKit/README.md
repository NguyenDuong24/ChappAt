# Hướng dẫn đưa trang Pháp lý lên mạng (Deployment)

Tôi đã tạo cho bạn một bộ mã nguồn hoàn chỉnh cho trang Pháp lý (Terms & Privacy) mang phong cách Premium. Để trang web này chạy thật sự trên mạng, bạn có 2 cách đơn giản nhất:

## Cách 1: Sử dụng Firebase Hosting (Khuyên dùng)
Vì bạn đã sử dụng Firebase cho ứng dụng, việc dùng chung Hosting là tốt nhất.

1. Mở terminal tại thư mục gốc của dự án.
2. Chạy lệnh: `firebase init hosting`
3. Khi được hỏi thư mục chứa file public, bạn nhập: `legal-web`
4. Chạy lệnh deploy: `firebase deploy --only hosting`
5. Sau khi xong, Firebase sẽ cung cấp cho bạn một đường link (ví dụ: `dating-app-1bb49.web.app`).

## Cách 2: Sử dụng Vercel (Cực nhanh và miễn phí)
1. Tải thư mục `legal-web` lên GitHub.
2. Truy cập [vercel.com](https://vercel.com) và kết nối với repo đó.
3. Nhấn Deploy là xong! Bạn sẽ có link dạng `chappat-legal.vercel.app`.

---
Sau khi có link, bạn chỉ cần cập nhật link này vào ứng dụng để khi người dùng nhấn vào sẽ mở trình duyệt xem được ngay.

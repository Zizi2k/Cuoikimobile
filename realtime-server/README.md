# Socket.IO server

Node.js 22+, Socket.IO 4. `npm ci`, `npm test`, `npm start`.

Biến môi trường bắt buộc: `QLPT_API_SECRET` và `QLPT_REALTIME_SECRET`, mỗi giá trị tối thiểu 32 bytes, khác nhau, giống phía PHP. `QLPT_API_URL` trỏ API PHP, `HOST` mặc định 0.0.0.0, `PORT` mặc định 3001.

Handshake xác minh token với PHP `/api/session`. Client dùng `auth: { token }`. Server tự gán room `user_<id>` và role. Không nhận user_id do client khai để phân quyền.

Hai command nghiệp vụ có ACK: `incident:create`, `incident:updateStatus`; chúng gọi API PHP bằng token phiên thật. PHP lưu dữ liệu và phát webhook có internal secret tới `/api/emit`; client nhận `incident:created`, `incident:status:changed`, `notification:created` theo room. Timeout ACK không đảm bảo thao tác chưa ghi dữ liệu, cần kiểm tra danh sách trước khi gửi lại.

Xem [hướng dẫn đầy đủ](../docs/11_HOAN_THIEN_TIEU_CHI.md) để cấu hình PHP, chạy integration và demo nhiều thiết bị.

# Khôi phục giao diện mobile cũ

Khôi phục từ giao diện trước commit hoàn thiện: màn đăng nhập chọn khách thuê/chủ trọ, nhận diện QUẢN LÝ NHÀ TRỌ, header xanh đen, thanh điều hướng phía trên, nền xám nhạt, nút xanh dương, thẻ thống kê phòng 2 cột, thẻ phòng/người thuê và bảng chi phí hóa đơn. Các màn hình bổ sung dùng chung màu sắc và typography.

Giữ React Navigation, Context, repository/ViewModel, xác thực, CRUD, xử lý lỗi, push và Socket.IO. Chọn vai trò ở đăng nhập chỉ đổi giao diện nhập liệu; server quyết định quyền theo tài khoản. Thông báo truy cập bằng nút trên header. Không khôi phục đăng nhập mẫu bằng mật khẩu dùng chung.

Cập nhật nhánh `feat/complete-mobile-rubric`, giữ app.json/app.config.js/.env và google-services.json đã thiết lập trên máy. Đây là thay đổi JavaScript/giao diện, không thêm native dependency; development build đã cài có thể tải UI mới từ Metro bằng `npx expo start --dev-client --clear`.

Kiểm chứng: TypeScript, lint, 28 unit test; export web và smoke test đăng nhập/thêm phòng/notification mở đúng hóa đơn/restore phiên/tenant room và menu theo vai trò. Chưa kiểm tra trực tiếp trên điện thoại thật trong môi trường này.

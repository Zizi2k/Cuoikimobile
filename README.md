# QuanLyPhongTro — Hệ thống quản lý nhà trọ

## Bản hoàn thiện bài cuối kỳ

Ứng dụng mobile dùng React Navigation + Context + MVVM; backend PHP/MySQL cung cấp REST CRUD; Node.js/Socket.IO cung cấp hai sự kiện nghiệp vụ hai chiều. Push dùng Expo Push Service trong development build.

**Hướng dẫn chính:** [Cài đặt, đối chiếu tiêu chí, kiến trúc và kịch bản demo](docs/11_HOAN_THIEN_TIEU_CHI.md). Android Expo Go không hỗ trợ remote push; dùng development build để nghiệm thu Phần A. Các hướng dẫn Router/Expo Go cũ chỉ mang tính lịch sử, không thay thế tài liệu này.

PHP thuần + PDO + MySQL/MariaDB, giao diện Bootstrap 5, hỗ trợ trình duyệt máy tính và điện thoại.

## 1. Yêu cầu
- WAMP64 với PHP 8.2+ (bật `pdo_mysql`, `fileinfo`, `mbstring`).
- MySQL/MariaDB đang chạy.
- Trình duyệt hiện đại. Giao diện dùng CDN Bootstrap/Bootstrap Icons/Chart.js nên khi ngoại tuyến các thư viện CDN có thể không tải.

## 2. Cài đặt trên WAMP64
1. Giải nén thư mục `QuanLyPhongTro` vào `C:\\wamp64\\www\\QuanLyPhongTro`.
2. Mở WAMP, chờ biểu tượng xanh lá.
3. Mở `http://localhost/phpmyadmin/`.
4. Chọn tab **Import**, chọn `QuanLyPhongTro/database/database.sql`, nhấn **Import**.
   **Cảnh báo:** SQL này có lệnh `DROP TABLE`; chỉ import vào database thử nghiệm mới hoặc sao lưu trước. Không chạy trên database đang có dữ liệu cần giữ.
5. Mở `config/database.php`. Mặc định WAMP thường dùng host `127.0.0.1`, port `3306`, database `quanlyphongtro`, user `root`, password rỗng. Nếu máy bạn đặt mật khẩu khác, cập nhật cấu hình hoặc đặt biến môi trường `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`.
6. Trên Command Prompt/Terminal, chạy:
   ```bat
   cd C:\\wamp64\\www\\QuanLyPhongTro
   php scripts/create_admin.php admin TenMatKhauRatManh_2026!
   ```
   Thay bằng tên đăng nhập và mật khẩu riêng có ít nhất 12 ký tự. Không dùng ví dụ mật khẩu này ngoài môi trường thử nghiệm.
7. Mở `http://localhost/QuanLyPhongTro/public/` và đăng nhập bằng tài khoản vừa tạo.

Nếu lệnh `php` không nhận diện được, dùng đường dẫn PHP CLI của WAMP, ví dụ `C:\\wamp64\\bin\\php\\php8.x.x\\php.exe`, đúng phiên bản đang cài.

## 3. Cấu trúc
- `app/Controllers`: xử lý yêu cầu.
- `app/Models`: truy vấn dữ liệu.
- `app/Views`: giao diện PHP.
- `app/Core`: router, controller và model cơ sở.
- `app/Helpers`: PDO, helper hiển thị, session, CSRF, upload.
- `config`: cấu hình ứng dụng và database.
- `routes/web.php`: khai báo URL.
- `database/database.sql`: cấu trúc và dữ liệu khởi tạo.
- `public/assets`: CSS/JavaScript.
- `public/uploads`: ảnh phòng, avatar và tệp yêu cầu bảo trì.
- `storage/logs`: nhật ký lỗi.
- `scripts/create_admin.php`: tạo/đặt lại tài khoản admin an toàn qua CLI.

## 4. Truy cập từ điện thoại cùng Wi-Fi
1. Trên Windows chạy `ipconfig`, tìm IPv4 của card Wi-Fi (ví dụ `192.168.1.10`).
2. Cho phép Apache qua Windows Firewall trên mạng Private. Không tắt toàn bộ Firewall.
3. Đảm bảo Apache lắng nghe trên mạng LAN (không chỉ `127.0.0.1`) và thiết bị cùng mạng Wi-Fi.
4. Trên điện thoại truy cập `http://IP-MAY-TINH/QuanLyPhongTro/public/`. Không dùng `localhost` trên điện thoại.
5. Nếu không truy cập được, kiểm tra IP, mạng khách Wi-Fi/client isolation, cổng Apache (80 hoặc cổng tùy chỉnh), Firewall và cấu hình `Require local` của Apache. Chỉ mở quyền truy cập LAN khi hiểu rõ rủi ro.

## 5. Triển khai hosting
1. Chọn hosting hỗ trợ phiên bản PHP phù hợp, MySQL, PDO MySQL và HTTPS.
2. Tạo database/user trong bảng điều khiển hosting; cấp quyền user trên đúng database.
3. Import SQL vào database mới. Nếu hosting chặn `CREATE DATABASE` hoặc `USE`, xóa hai lệnh đầu tương ứng khỏi bản SQL sau khi đã chọn đúng database trong phpMyAdmin.
4. Cập nhật cấu hình DB bằng biến môi trường nếu hosting hỗ trợ; nếu không, cập nhật `config/database.php` và không chia sẻ mã nguồn có thông tin bí mật.
5. Khuyến nghị cấu hình document root trỏ vào thư mục `public`. Nếu hosting không cho đổi document root, cấu hình rewrite để chỉ public được truy cập; không để `app`, `config`, `database`, `scripts`, `storage` tải trực tiếp.
6. Bật HTTPS, đặt `APP_ENV=production`, quyền ghi tối thiểu cần thiết cho `public/uploads` và `storage/logs`. Không mở cổng MySQL ra Internet.
7. Tạo admin bằng CLI trên hosting nếu được hỗ trợ. Nếu hosting không có CLI, cần dùng công cụ quản trị an toàn từ hosting rồi xóa ngay sau khi tạo tài khoản; không để script tạo admin công khai.

## 6. Lỗi thường gặp
- **Không kết nối được DB:** kiểm tra MySQL đang chạy, host/port/database/user/password và quyền database.
- **Trang trắng / HTTP 500:** xem Apache/PHP error log và `storage/logs`; chỉ bật `APP_ENV=development` tạm thời trong môi trường local.
- **404 hoặc URL con không chạy:** bật `mod_rewrite`, cho phép `AllowOverride All`; kiểm tra `.htaccess`. Có thể thử query route nếu hosting không hỗ trợ rewrite.
- **Sai phiên bản PHP:** kiểm tra `php -v` và phiên bản PHP Apache đang dùng trong WAMP; bật extension `pdo_mysql` và `fileinfo`.
- **Không tải được ảnh:** kiểm tra quyền ghi thư mục `public/uploads/rooms`, giới hạn `upload_max_filesize`/`post_max_size`, và giới hạn loại ảnh trong ứng dụng.
- **Không truy cập từ điện thoại:** dùng IPv4 máy tính, không dùng `localhost`; kiểm tra Firewall và cổng Apache.
- **Biểu đồ/CDN không hiện khi offline:** giao diện hiện tham chiếu thư viện CDN; cần tải thư viện về `public/assets` nếu phải chạy hoàn toàn ngoại tuyến.

## 7. Kiểm thử sau cài đặt
- Đăng nhập admin và người thuê; kiểm tra khóa tài khoản.
- Thử CRUD khu trọ/phòng/người thuê/hợp đồng.
- Tạo chỉ số điện nước, hóa đơn và ghi nhận thanh toán một phần/nhiều lần.
- Kiểm tra hóa đơn trùng kỳ, thanh toán vượt công nợ, hợp đồng trùng phòng.
- Kiểm tra phân quyền bằng tài khoản tenant và thử đổi ID trên URL.
- Kiểm tra upload ảnh không chấp nhận file PHP.
- Kiểm tra giao diện ở chiều rộng điện thoại.
- Kiểm tra báo cáo so với dữ liệu SQL.

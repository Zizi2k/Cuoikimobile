# Rà soát và merge giao diện cũ

Ngày 27/10/2026. Đã kiểm tra trực tiếp nhánh main của Zizi2k/Cuoikimobile: commit eb5b8dd là bản hoàn thiện chức năng; giao diện cũ ở commit 0307e52 trên nhánh feat/complete-mobile-rubric, chưa có trong main. Không thấy commit mới hơn chứa cấu hình EAS từ máy người dùng ở thời điểm kiểm tra. Repository TNhi0305/QuanLyPhongTro vẫn dừng ở d3747df, là repo khác.

## Các điểm đã sửa trước khi merge

- Đưa giao diện cũ trở lại main: màn đăng nhập, header xanh đen, top tabs, thẻ thống kê, danh sách phòng và hóa đơn. Giữ ViewModel/repository, Context, REST, push và Socket.IO.
- Chuyển android.usesCleartextTraffic từ vị trí không được Expo schema chấp nhận sang plugin expo-build-properties, cài dependency tương thích SDK 58 và cập nhật lockfile.
- app.config.js kế thừa config từ app.json thay vì dựng lại cấu hình từ đầu; ưu tiên GOOGLE_SERVICES_JSON qua biến môi trường và hỗ trợ tệp google-services.json cục bộ khi có sẵn.
- Đặt slug duy2k00, owner duy2k00s-team và EAS projectId 5401955e-10fe-42c5-8585-9e65f81dfe43 theo thông tin người dùng cung cấp. Các thông tin này là định danh công khai, không phải credentials.
- Chỉ định cli.appVersionSource=remote để loại cảnh báo EAS; không thay khóa ký/FCM đã có trên EAS.

## Kiểm chứng

- expo-doctor: 20/20.
- TypeScript, ESLint, 28 unit test mobile: pass.
- 5 test bảo mật Socket.IO: pass.
- 5 smoke check web với REST stub: đăng nhập, thêm phòng, mở đúng hóa đơn từ lịch sử thông báo, restore phiên, màn khách thuê và menu theo vai trò.
- Expo config introspection chạy thành công; cấu hình Android cho phép cleartext để dùng backend LAN.

Không coi các kiểm tra này là bằng chứng APNs/FCM nhận thành công trên điện thoại thật. Backend PHP/MySQL chưa được triển khai từ môi trường này. Kết quả tích hợp nghiệp vụ trước đây xem docs/11_HOAN_THIEN_TIEU_CHI.md.

## Cảnh báo chưa xử lý bằng thay đổi lớn

npm audit báo 3 high trong chuỗi expo -> @expo/cli -> zod (GHSA-mrhx-c7xc-m3w5, xử lý bộ sưu tập quá lớn có thể cạn bộ nhớ). Expo CLI yêu cầu Zod ^3.25.76 trong dependency hiện tại; không ép Zod sang major 4 hoặc hạ SDK chỉ để làm sạch audit. npm đề xuất Expo 54 thay cho 58, vì vậy không dùng npm audit fix --force. Cần theo dõi bản vá tương thích Expo SDK 58.

## Lấy bản merge về máy

Trong repository đã thêm remote cuoiki, fetch rồi merge nhánh main tương ứng, tránh dùng origin của repository TNhi0305 khi muốn lấy mã Zizi2k. Giữ nguyên file Firebase và .env của máy. Nếu có thay đổi cục bộ trong app.json/app.config.js/package.json/package-lock.json/eas.json, sao lưu hoặc stash các file đó trước khi merge; đối chiếu lại sau merge, không restore toàn bộ app.json cũ.

Chạy npm ci, npx expo-doctor, npx expo start --dev-client --clear. Development build đã có expo-build-properties và các thư viện native khớp có thể dùng Metro ngay; chỉ build lại khi native dependencies/config thực tế khác bản đã cài.

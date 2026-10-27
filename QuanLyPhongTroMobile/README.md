# QuanLyPhongTro Mobile

React Native / Expo SDK 58, React Navigation, Context, MVVM, REST, Expo Push Service, Socket.IO.

Hướng dẫn chính: [Hoàn thiện tiêu chí, cấu hình, kiến trúc và demo](../docs/11_HOAN_THIEN_TIEU_CHI.md).

```sh
npm ci
npm run verify
npx expo start --dev-client --clear
```

Cấu hình `.env` từ `.env.example`. Remote push Android cần development build trên thiết bị thật. Entry là `index.ts`, không dùng Expo Router. Chạy Node server ở thư mục `realtime-server`, không chạy Expo ở đó.

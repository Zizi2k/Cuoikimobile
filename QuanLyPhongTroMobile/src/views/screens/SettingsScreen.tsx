import React, { useState } from "react";
import { useSession } from "../../context/AuthContext";
import {
  Page,
  Card,
  Title,
  Info,
  Field,
  Button,
  State,
} from "../components/ui";
export default function SettingsScreen() {
  const session = useSession();
  const [base, setBase] = useState(session.apiBase);
  return (
    <Page>
      <Title>Tài khoản và kết nối</Title>
      <Card>
        <Info>{session.user?.fullname}</Info>
        <Info>
          {session.user?.username} · {session.user?.role}
        </Info>
        <Info>
          {session.user?.phone} · {session.user?.email}
        </Info>
        <Info>Socket.IO: {session.socketStatus}</Info>
      </Card>
      <Card>
        <Title>Thông báo thiết bị</Title>
        <Info>{session.pushStatus || "Đang kiểm tra đăng ký thông báo…"}</Info>
        <Button
          title="Xin quyền / đăng ký lại push"
          onPress={() => {
            void session.retryPush();
          }}
        />
        <Info>
          Push thật cần development build, EAS projectId, credentials FCM/APNs
          và thiết bị thật. Không sử dụng token giả.
        </Info>
      </Card>
      <Card>
        <Field label="URL API" value={base} onChangeText={setBase} />
        <Info>
          Đổi máy chủ sẽ đăng xuất để không gửi token sang máy chủ mới.
        </Info>
        <Button
          title="Lưu máy chủ và kiểm tra"
          disabled={session.busy}
          onPress={() => {
            void session.configure(base);
          }}
        />
        <State error={session.error} loading={session.busy} />
      </Card>
      <Button
        title="Đăng xuất"
        danger
        onPress={() => {
          void session.logout();
        }}
      />
    </Page>
  );
}

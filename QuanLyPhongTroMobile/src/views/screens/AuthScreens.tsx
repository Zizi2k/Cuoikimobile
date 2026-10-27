import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootParams } from "../../navigation/types";
import { useSession } from "../../context/AuthContext";
import { Page, Field, Button, Info, State } from "../components/ui";
import { legacy as s } from "../components/legacyStyles";
function AuthForm({
  mode,
  navigate,
}: {
  mode: "login" | "register";
  navigate: () => void;
}) {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [base, setBase] = useState(session.apiBase);
  const [show, setShow] = useState(false);
  const [server, setServer] = useState(false);
  const [role, setRole] = useState<"tenant" | "admin">("tenant");
  const submit = () => {
    void session.submit(mode, { username, password, fullname, phone });
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F8FAFC", paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đổi địa chỉ máy chủ"
        style={[
          s.serverStatusBar,
          session.connection ? s.serverStatusOk : s.serverStatusPending,
        ]}
        onPress={() => setServer(true)}
      >
        <View style={s.serverStatusDot} />
        <Text style={s.serverStatusText} numberOfLines={1}>
          {session.connection || "🟡 Cấu hình kết nối máy chủ WAMP"}
        </Text>
        <Text style={s.serverChangeBtn}>Đổi IP</Text>
      </Pressable>
      <Page>
        <View style={s.brandHeader}>
          <View style={s.logoBadge}>
            <Text style={s.logoIcon}>🏠</Text>
          </View>
          <Text style={s.brandTitle}>QUẢN LÝ NHÀ TRỌ</Text>
          <Text style={s.brandSub}>
            Hệ Thống Realtime &amp; Push Notification
          </Text>
        </View>
        <View style={s.loginCard}>
          {mode === "login" && (
            <View style={s.roleTabs}>
              {(["tenant", "admin"] as const).map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: role === item }}
                  style={[s.roleTab, role === item && s.roleTabActive]}
                  onPress={() => setRole(item)}
                >
                  <Text
                    style={[
                      s.roleTabText,
                      role === item && s.roleTabTextActive,
                    ]}
                  >
                    {item === "tenant" ? "👤 Khách thuê" : "🛡️ Chủ trọ / Admin"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={s.loginCardHeading}>
            {mode === "register"
              ? "Đăng ký khách thuê"
              : role === "tenant"
                ? "Khách thuê đăng nhập"
                : "Chủ trọ / Quản lý đăng nhập"}
          </Text>
          <Text style={s.loginCardMuted}>
            {mode === "register"
              ? "Tạo tài khoản để kết nối với chủ trọ."
              : role === "tenant"
                ? "Đăng nhập để xem phòng, hóa đơn và nhận thông báo realtime."
                : "Đăng nhập để quản lý phòng, phát hành hóa đơn và xử lý sự cố."}
          </Text>
          {mode === "register" ? (
            <>
              <Field
                label="Họ tên"
                value={fullname}
                onChangeText={setFullname}
              />
              <Field
                label="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
              />
            </>
          ) : (
            <>
              <Text style={s.fieldLabel}>
                {role === "tenant"
                  ? "Số điện thoại hoặc tài khoản"
                  : "Tên tài khoản quản trị"}
              </Text>
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>
                  {role === "tenant" ? "📱" : "👤"}
                </Text>
                <TextInput
                  accessibilityLabel="Tài khoản / điện thoại / email"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={
                    role === "tenant"
                      ? "Nhập số điện thoại hoặc tài khoản"
                      : "Nhập tài khoản quản trị"
                  }
                  style={s.textInput}
                />
              </View>
            </>
          )}
          <Text style={s.fieldLabel}>Mật khẩu</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>🔒</Text>
            <TextInput
              accessibilityLabel="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!show}
              placeholder="Nhập mật khẩu..."
              autoCapitalize="none"
              style={s.textInput}
              onSubmitEditing={submit}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onPress={() => setShow(!show)}
              style={s.eyeBtn}
            >
              <Text style={s.eyeBtnText}>{show ? "👁️" : "🙈"}</Text>
            </Pressable>
          </View>
          <State error={session.error} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              mode === "login" ? "Đăng nhập" : "Tạo tài khoản"
            }
            style={[s.primaryBtn, session.busy && s.disabledBtn]}
            disabled={session.busy}
            onPress={submit}
          >
            {session.busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryBtnText}>
                {mode === "login" ? "ĐĂNG NHẬP" : "TẠO TÀI KHOẢN"}
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={{ alignItems: "center", marginTop: 16 }}
            onPress={navigate}
          >
            <Text style={{ color: "#2563EB", fontWeight: "600", fontSize: 13 }}>
              {mode === "login"
                ? "Chưa có tài khoản? Bấm vào đây để đăng ký"
                : "Quay về đăng nhập"}
            </Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void session.restore();
          }}
          style={{ alignItems: "center", padding: 10 }}
        >
          <Text style={s.cardMuted}>Thử khôi phục phiên đã lưu</Text>
        </Pressable>
      </Page>
      <Modal
        visible={server}
        transparent
        animationType="fade"
        onRequestClose={() => setServer(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Kết nối máy chủ WAMP</Text>
            <Text style={s.modalSub}>
              Nhập địa chỉ API của máy tính đang chạy backend.
            </Text>
            <Field label="URL API" value={base} onChangeText={setBase} />
            <Info>Ví dụ: http://IP/QuanLyPhongTro/api/</Info>
            <State error={session.error} loading={session.busy} />
            <Info>{session.connection}</Info>
            <Button
              title="Lưu địa chỉ và kiểm tra"
              disabled={session.busy}
              onPress={() => {
                void session.configure(base);
              }}
            />
            <Button title="Đóng" onPress={() => setServer(false)} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
export function LoginScreen({
  navigation,
}: NativeStackScreenProps<RootParams, "Login">) {
  return (
    <AuthForm mode="login" navigate={() => navigation.navigate("Register")} />
  );
}
export function RegisterScreen({
  navigation,
}: NativeStackScreenProps<RootParams, "Register">) {
  return <AuthForm mode="register" navigate={() => navigation.goBack()} />;
}

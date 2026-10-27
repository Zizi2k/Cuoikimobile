import React, { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootParams } from "../../navigation/types";
import { useSession } from "../../context/AuthContext";
import {
  Page,
  Card,
  Title,
  Field,
  Button,
  Info,
  State,
} from "../components/ui";
function AuthForm({
  mode,
  navigate,
}: {
  mode: "login" | "register";
  navigate: () => void;
}) {
  const session = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [base, setBase] = useState(session.apiBase);
  const [show, setShow] = useState(false);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page>
        <Title>PHÒNG TRỌ</Title>
        <Info>Quản lý rõ ràng. Kết nối chủ trọ và người thuê.</Info>
        <Card>
          <Title>{mode === "login" ? "Đăng nhập" : "Đăng ký người thuê"}</Title>
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
            <Field
              label="Tài khoản / điện thoại / email"
              value={username}
              onChangeText={setUsername}
            />
          )}
          <Field
            label="Mật khẩu"
            secure={!show}
            value={password}
            onChangeText={setPassword}
          />
          <Button
            title={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onPress={() => setShow(!show)}
          />
          <State loading={session.busy} error={session.error} />
          <Button
            title={mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
            disabled={session.busy}
            onPress={() => {
              void session.submit(mode, {
                username,
                password,
                fullname,
                phone,
              });
            }}
          />
          <Button
            title={
              mode === "login"
                ? "Chưa có tài khoản? Đăng ký"
                : "Quay về đăng nhập"
            }
            onPress={navigate}
          />
          <Info>
            Hồ sơ người thuê có sẵn cần chủ trọ xác minh và cấp tài khoản.
          </Info>
        </Card>
        <Card>
          <Title>Kết nối máy chủ</Title>
          <Field label="URL API" value={base} onChangeText={setBase} />
          <Info>Ví dụ: http://IP:8080/QuanLyPhongTro/api/</Info>
          <Button
            title="Lưu địa chỉ và kiểm tra"
            disabled={session.busy}
            onPress={() => {
              void session.configure(base);
            }}
          />
          <Info>{session.connection}</Info>
          <Button
            title="Thử khôi phục phiên"
            onPress={() => {
              void session.restore();
            }}
          />
        </Card>
      </Page>
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

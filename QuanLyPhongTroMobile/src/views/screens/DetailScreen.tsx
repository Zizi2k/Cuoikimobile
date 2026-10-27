import React, { useState } from "react";
import { Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootParams } from "../../navigation/types";
import { useDetailModel } from "../../viewmodels/useScreenModels";
import { useSession } from "../../context/AuthContext";
import {
  Page,
  Card,
  Title,
  Info,
  Button,
  Field,
  State,
  money,
  labels,
} from "../components/ui";
export function InvoiceDetailScreen({
  route,
}: NativeStackScreenProps<RootParams, "InvoiceDetail">) {
  const vm = useDetailModel("invoice", route.params.id);
  const session = useSession();
  const [amount, setAmount] = useState("");
  const d = vm.data;
  return (
    <Page>
      <Title>Hóa đơn #{route.params.id}</Title>
      <State
        loading={vm.loading}
        error={vm.error}
        retry={() => {
          void vm.load();
        }}
      />
      {d && (
        <>
          <Card>
            <Title>{d.invoice_code}</Title>
            <Info>
              Kỳ {d.billing_month} · Hạn {d.due_date}
            </Info>
            <Info>{labels[d.status]}</Info>
            <Info>Tổng: {money(d.total_amount)}</Info>
            <Info>Đã thu: {money(d.paid_amount)}</Info>
            <Info>Còn nợ: {money(d.remaining_amount)}</Info>
            {(d.details || []).map((line: any, i: number) => (
              <Info key={i}>
                {line.item_name}: {line.quantity} {line.unit} ×{" "}
                {money(line.unit_price)} = {money(line.amount)}
              </Info>
            ))}
          </Card>
          {d.vietqr_url && (
            <Card>
              <Info>
                Đối chiếu ngân hàng và chủ tài khoản trước khi chuyển khoản.
                Quét QR không tự xác nhận đã thanh toán.
              </Info>
              <Image
                source={{ uri: d.vietqr_url }}
                style={{ height: 310, width: "100%" }}
                resizeMode="contain"
              />
            </Card>
          )}
          {session.user?.role === "admin" && Number(d.remaining_amount) > 0 && (
            <Card>
              <Field
                label="Số tiền thực nhận"
                numeric
                value={amount}
                onChangeText={setAmount}
              />
              <Button
                title="Xác nhận đã thu và thông báo khách"
                disabled={vm.busy}
                onPress={() => {
                  void vm.pay(amount);
                }}
              />
            </Card>
          )}
          <Button
            title="Nhắc tôi kiểm tra hóa đơn sau 60 giây"
            disabled={vm.busy}
            onPress={() => {
              void vm.remind();
            }}
          />
          <Info>{vm.message}</Info>
        </>
      )}
    </Page>
  );
}
export function IncidentDetailScreen({
  route,
}: NativeStackScreenProps<RootParams, "IncidentDetail">) {
  const vm = useDetailModel("incident", route.params.id);
  const d = vm.data;
  return (
    <Page>
      <Title>Sự cố #{route.params.id}</Title>
      <State
        loading={vm.loading}
        error={vm.error}
        retry={() => {
          void vm.load();
        }}
      />
      {d && (
        <Card>
          <Title>{d.title}</Title>
          <Info>{d.description}</Info>
          <Info>
            {labels[d.status]} · {d.created_at}
          </Info>
          <Info>Phản hồi: {d.admin_notes || "Chưa có"}</Info>
          <Info>Chi phí: {money(d.cost)}</Info>
        </Card>
      )}
    </Page>
  );
}

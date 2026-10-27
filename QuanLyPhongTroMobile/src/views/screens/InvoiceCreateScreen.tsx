import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootParams } from "../../navigation/types";
import {
  useInvoicesModel,
  useResourceModel,
} from "../../viewmodels/useScreenModels";
import {
  Page,
  Card,
  Title,
  Info,
  Field,
  Button,
  State,
  Choices,
} from "../components/ui";
export default function InvoiceCreateScreen({
  navigation,
}: NativeStackScreenProps<RootParams, "InvoiceCreate">) {
  const vm = useInvoicesModel();
  const contracts = useResourceModel("contracts");
  const [values, setValues] = useState<Record<string, string>>(() => ({
    billing_month: new Date().toISOString().slice(0, 7),
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    electricity_usage: "0",
    electricity_rate: "3500",
    water_usage: "0",
    water_rate: "20000",
    service_amount: "140000",
    other_fees: "0",
    discount: "0",
  }));
  const fields = [
    ["billing_month", "Kỳ YYYY-MM"],
    ["due_date", "Hạn YYYY-MM-DD"],
    ["electricity_usage", "Điện tiêu thụ kWh"],
    ["electricity_rate", "Đơn giá điện"],
    ["water_usage", "Nước tiêu thụ m³"],
    ["water_rate", "Đơn giá nước"],
    ["service_amount", "Dịch vụ"],
    ["other_fees", "Phụ thu"],
    ["discount", "Giảm trừ"],
  ];
  return (
    <Page>
      <Title>Lập hóa đơn</Title>
      <State loading={contracts.loading} error={contracts.error} />
      <Info>Chọn hợp đồng đang hoạt động (mã · phòng · người thuê):</Info>
      <Choices
        values={contracts.items
          .filter((c) => c.status === "active")
          .map((c) => String(c.id))}
        value={values.contract_id || ""}
        onChange={(id) => setValues({ ...values, contract_id: id })}
      />
      {contracts.items
        .filter((c) => c.status === "active")
        .map((c) => (
          <Info key={c.id}>
            {c.id}: {c.contract_code} · phòng #{c.room_id} · khách #
            {c.tenant_id}
          </Info>
        ))}
      <Card>
        {fields.map(([key, label]) => (
          <Field
            key={key}
            label={label}
            numeric={!["billing_month", "due_date"].includes(key)}
            value={values[key] || ""}
            onChangeText={(v) => setValues({ ...values, [key]: v })}
          />
        ))}
      </Card>
      <State loading={vm.actionLoading} error={vm.error} />
      <Button
        title="Tạo hóa đơn và thông báo khách thuê"
        disabled={vm.actionLoading}
        onPress={() => {
          void vm.createInvoice(values).then((r) => {
            if (r.success && r.invoice_id)
              navigation.replace("InvoiceDetail", { id: Number(r.invoice_id) });
          });
        }}
      />
    </Page>
  );
}

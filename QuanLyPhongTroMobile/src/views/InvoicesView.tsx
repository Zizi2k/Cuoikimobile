import React from "react";
import { FlatList, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootParams } from "../navigation/types";
import { useSession } from "../context/AuthContext";
import { useInvoicesModel } from "../viewmodels/useScreenModels";
import {
  Card,
  Title,
  Info,
  Button,
  State,
  ui,
  money,
  labels,
} from "./components/ui";
export default function InvoicesView() {
  const vm = useInvoicesModel();
  const session = useSession();
  const navigation = useNavigation<NativeStackNavigationProp<RootParams>>();
  return (
    <View style={ui.shell}>
      <FlatList
        contentContainerStyle={ui.list}
        data={vm.invoices}
        keyExtractor={(i) => String(i.id)}
        refreshing={vm.refreshing}
        onRefresh={() => {
          void vm.refresh();
        }}
        ListHeaderComponent={
          <>
            <Title>Hóa đơn</Title>
            <Info>Còn nợ: {money(vm.summary.totalRemaining)}</Info>
            {session.user?.role === "admin" && (
              <Button
                title="Lập hóa đơn"
                onPress={() => navigation.navigate("InvoiceCreate")}
              />
            )}
            <State
              loading={vm.loading}
              error={vm.error}
              retry={() => {
                void vm.loadInvoices();
              }}
            />
          </>
        }
        ListEmptyComponent={<State empty={!vm.error} />}
        renderItem={({ item }) => (
          <Card>
            <Title>{item.invoice_code}</Title>
            <Info>
              {item.tenant_name || "Hóa đơn của bạn"} · {item.billing_month}
            </Info>
            <Info>
              {labels[item.status]} · Nợ {money(item.remaining_amount)}
            </Info>
            <Button
              title="Xem chi tiết"
              onPress={() =>
                navigation.navigate("InvoiceDetail", { id: Number(item.id) })
              }
            />
          </Card>
        )}
      />
    </View>
  );
}

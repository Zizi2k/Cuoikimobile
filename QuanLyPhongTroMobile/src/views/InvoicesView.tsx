import React from "react";
import { FlatList, View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootParams } from "../navigation/types";
import { useSession } from "../context/AuthContext";
import { useInvoicesModel } from "../viewmodels/useScreenModels";
import { InvoiceStatusFilter } from "../viewmodels/useInvoicesViewModel";
import { Button, State, Choices, ui, money, labels } from "./components/ui";
import { legacy as s, invoiceStyles as old } from "./components/legacyStyles";
export default function InvoicesView() {
  const vm = useInvoicesModel();
  const session = useSession();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  return (
    <View style={ui.shell}>
      <FlatList
        contentContainerStyle={ui.list}
        data={vm.filteredInvoices}
        keyExtractor={(item) => String(item.id)}
        refreshing={vm.refreshing}
        onRefresh={() => {
          void vm.refresh();
        }}
        ListHeaderComponent={
          <>
            <View style={old.summaryContainer}>
              {[
                {
                  value: money(vm.summary.totalRevenue),
                  label: "Đã thu",
                  color: "#16A34A",
                },
                {
                  value: money(vm.summary.totalRemaining),
                  label: "Chưa thu",
                  color: "#DC2626",
                },
                {
                  value: vm.summary.unpaidCount,
                  label: "Chưa nộp",
                  color: "#EA580C",
                },
              ].map((stat) => (
                <View key={stat.label} style={old.summaryBox}>
                  <Text style={[old.summaryVal, { color: stat.color }]}>
                    {stat.value}
                  </Text>
                  <Text style={old.summaryLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
            <Choices
              values={["all", "unpaid", "partially_paid", "paid"]}
              value={vm.statusFilter}
              onChange={(v) => vm.setStatusFilter(v as InvoiceStatusFilter)}
            />
            {session.user?.role === "admin" && (
              <Button
                title="Lập hóa đơn"
                onPress={() => nav.navigate("InvoiceCreate")}
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
        ListEmptyComponent={<State empty={!vm.error} loading={vm.loading} />}
        renderItem={({ item }) => (
          <View style={s.premiumCard}>
            <View style={s.roomHeadRow}>
              <Text style={s.invoiceCode}>{item.invoice_code}</Text>
              <View
                style={[
                  s.badge,
                  item.status === "paid" ? s.badgeGreen : s.badgeOrange,
                ]}
              >
                <Text style={s.badgeText}>{labels[item.status]}</Text>
              </View>
            </View>
            <Text style={s.billingMonth}>
              Kỳ {item.billing_month} ·{" "}
              {item.room_number || item.tenant_name || "Hóa đơn của bạn"}
            </Text>
            <View style={s.divider} />
            {[
              ["Tiền phòng", item.room_price],
              ["Tiền điện", item.electricity_amount],
              ["Tiền nước", item.water_amount],
              ["Dịch vụ", item.service_amount],
              ["Tổng cộng", item.total_amount],
              ["Đã thanh toán", item.paid_amount],
              ["Còn phải nộp", item.remaining_amount],
            ].map(([label, value]) => (
              <View key={String(label)} style={s.feeRow}>
                <Text style={s.feeLabel}>{label}</Text>
                <Text
                  style={label === "Còn phải nộp" ? s.totalHighlight : s.feeVal}
                >
                  {money(value)}
                </Text>
              </View>
            ))}
            <Text style={s.dueDateStamp}>
              Hạn thanh toán: {item.due_date || "Chưa cập nhật"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem chi tiết"
              onPress={() =>
                nav.navigate("InvoiceDetail", { id: Number(item.id) })
              }
              style={s.primaryBtn}
            >
              <Text style={s.primaryBtnText}>XEM CHI TIẾT / THANH TOÁN</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

import React from "react";
import { FlatList, Switch, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootParams } from "../navigation/types";
import { notificationTarget } from "../navigation/notificationRouting";
import { NotificationPreferences } from "../models/types";
import { useNotificationsModel } from "../viewmodels/useScreenModels";
import { Card, Title, Info, Button, State, Choices, ui } from "./components/ui";
export default function NotificationsView() {
  const vm = useNotificationsModel();
  const navigation = useNavigation<NativeStackNavigationProp<RootParams>>();
  return (
    <View style={ui.shell}>
      <FlatList
        contentContainerStyle={ui.list}
        data={vm.filteredNotifications}
        keyExtractor={(i) => String(i.id)}
        refreshing={vm.refreshing}
        onRefresh={() => {
          void vm.refresh();
        }}
        ListHeaderComponent={
          <>
            <Title>Thông báo · {vm.unreadCount} chưa đọc</Title>
            <Choices
              values={["all", "unread"]}
              value={vm.filter}
              onChange={(v) => vm.setFilter(v as "all" | "unread")}
            />
            <Button
              title="Đánh dấu tất cả đã đọc"
              onPress={() => {
                void vm.markAllAsRead();
              }}
            />
            <Card>
              <Info>Nhận push theo loại (lịch sử vẫn được giữ):</Info>
              {(
                [
                  "invoice",
                  "payment",
                  "maintenance",
                  "reminder",
                ] as (keyof NotificationPreferences)[]
              ).map((category) => (
                <View key={category} style={ui.row}>
                  <Switch
                    value={!!Number(vm.preferences[category])}
                    onValueChange={(value) => {
                      void vm.updatePreference(category, value);
                    }}
                  />
                  <Info>
                    {
                      {
                        invoice: "Hóa đơn mới",
                        payment: "Thanh toán",
                        maintenance: "Sự cố",
                        reminder: "Nhắc hạn",
                      }[category]
                    }
                  </Info>
                </View>
              ))}
            </Card>
            <Button
              title="Lên lịch nhắc sau 60 giây"
              onPress={() => {
                void vm.remind();
              }}
            />
            <Info>{vm.reminderMessage}</Info>
            <State
              loading={vm.loading}
              error={vm.error}
              retry={() => {
                void vm.loadNotifications();
              }}
            />
          </>
        }
        ListEmptyComponent={<State empty={!vm.error} />}
        renderItem={({ item }) => (
          <Card>
            <Title>
              {item.is_read ? "" : "● "}
              {item.title}
            </Title>
            <Info>{item.content}</Info>
            <Info>
              {item.created_at} · {item.is_read ? "Đã đọc" : "Chưa đọc"}
            </Info>
            <Button
              title="Mở nội dung liên quan"
              onPress={() => {
                void vm.markAsRead(item).then((ok) => {
                  if (!ok) return;
                  const target = notificationTarget({
                    ...item.data,
                    reference_type: item.reference_type,
                    reference_id: item.reference_id,
                  });
                  if (target)
                    navigation.navigate(target.screen, { id: target.id });
                });
              }}
            />
          </Card>
        )}
      />
    </View>
  );
}

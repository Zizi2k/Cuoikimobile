import React from "react";
import { View, Text, Pressable, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../../context/AuthContext";
import { TabParams } from "../../navigation/types";
import { legacy as s } from "./legacyStyles";
export function LegacyHeader({
  current,
  open,
}: {
  current: string;
  open: (screen: keyof TabParams) => void;
}) {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const admin = session.user?.role === "admin";
  const tabs: { name: keyof TabParams; label: string; icon: string }[] = [
    { name: "Home", label: "Tổng quan", icon: "🏠" },
    { name: "Invoices", label: "Hóa đơn", icon: "🧾" },
    {
      name: "Incidents",
      label: admin ? "Xử lý sự cố" : "Báo sự cố",
      icon: "🛠️",
    },
    ...(admin
      ? [{ name: "Rooms" as const, label: "Phòng trọ", icon: "🚪" }]
      : []),
    { name: "Settings", label: "Tiện ích", icon: "⚙️" },
  ];
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: "#0F172A" }}>
      <StatusBar barStyle="light-content" />
      <View style={s.appHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={s.appHeaderSmall}>
              {admin ? "QUẢN TRỊ VIÊN" : "KHÁCH THUÊ"}
            </Text>
            <View
              style={[
                s.socketBadge,
                session.socketStatus === "connected"
                  ? s.socketOk
                  : session.socketStatus === "connecting" ||
                      session.socketStatus === "reconnecting"
                    ? s.socketConnecting
                    : s.socketErr,
              ]}
            >
              <Text style={s.socketText}>
                {session.socketStatus === "connected"
                  ? "🟢 Realtime"
                  : session.socketStatus === "connecting" ||
                      session.socketStatus === "reconnecting"
                    ? "🟡 Đang kết nối..."
                    : "🔴 Mất kết nối"}
              </Text>
            </View>
          </View>
          <Text style={s.appHeaderTitle} numberOfLines={1}>
            Xin chào,{" "}
            {session.user?.fullname || session.user?.username || "Bạn"}
          </Text>
        </View>
        <View style={{ gap: 6, marginLeft: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lịch sử thông báo"
            onPress={() => open("Notifications")}
            style={s.logoutBtn}
          >
            <Text style={s.logoutBtnText}>🔔 Thông báo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void session.logout();
            }}
            style={s.logoutBtn}
          >
            <Text style={s.logoutBtnText}>Đăng xuất</Text>
          </Pressable>
        </View>
      </View>
      <View accessibilityRole="tablist" style={s.topTabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: current === tab.name }}
            onPress={() => open(tab.name)}
            style={[s.topTabItem, current === tab.name && s.topTabItemActive]}
          >
            <Text style={s.topTabIcon}>{tab.icon}</Text>
            <Text
              style={[s.topTabText, current === tab.name && s.topTabTextActive]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

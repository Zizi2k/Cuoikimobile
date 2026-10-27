import React from "react";
import { Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootParams } from "../../navigation/types";
import { useSession } from "../../context/AuthContext";
import { useHomeModel } from "../../viewmodels/useScreenModels";
import { resources, ResourceName } from "../../models/management";
import { Page, Info, Button, State, money, labels } from "../components/ui";
import { legacy as s } from "../components/legacyStyles";
export default function HomeScreen() {
  const vm = useHomeModel();
  const session = useSession();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const d = vm.data;
  const admin = session.user?.role === "admin";
  return (
    <Page>
      <View style={admin ? s.welcomeHeroAdmin : s.welcomeHero}>
        <Text style={s.heroGreeting}>
          {admin ? "Bảng điều khiển quản trị" : "Phòng của bạn"}
        </Text>
        <Text style={s.heroDesc}>
          {admin
            ? "Theo dõi tình trạng phòng trọ, hóa đơn và sự cố kỹ thuật trong thời gian thực."
            : "Xem hợp đồng, tra cứu hóa đơn và gửi yêu cầu sửa chữa tức thì."}
        </Text>
      </View>
      <State
        loading={vm.loading}
        error={vm.error}
        retry={() => {
          void vm.load();
        }}
      />
      {d && (
        <>
          {admin ? (
            <>
              <Text style={s.blockTitle}>📊 Tình trạng phòng trọ</Text>
              <View style={s.statGrid}>
                {[
                  {
                    value: d.stats?.rooms?.total || 0,
                    label: "Tổng số phòng",
                    color: "#3B82F6",
                  },
                  {
                    value: d.stats?.rooms?.rented || 0,
                    label: "Đang cho thuê",
                    color: "#10B981",
                  },
                  {
                    value:
                      d.stats?.rooms?.empty ??
                      Math.max(
                        0,
                        (d.stats?.rooms?.total || 0) -
                          (d.stats?.rooms?.rented || 0),
                      ),
                    label: "Phòng còn trống",
                    color: "#F59E0B",
                  },
                  {
                    value: d.stats?.pending_maintenance_count || 0,
                    label: "Sự cố chờ xử lý",
                    color: "#EF4444",
                  },
                ].map((stat) => (
                  <View
                    key={stat.label}
                    style={[s.statCard, { borderLeftColor: stat.color }]}
                  >
                    <Text style={[s.statVal, { color: stat.color }]}>
                      {stat.value}
                    </Text>
                    <Text style={s.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
              <View style={s.premiumCard}>
                <Text style={s.blockTitle}>Danh mục quản lý</Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {(Object.keys(resources) as ResourceName[]).map(
                    (resource) => (
                      <Pressable
                        key={resource}
                        accessibilityRole="button"
                        style={[
                          s.presetBtn,
                          { padding: 12, minWidth: "46%", flexGrow: 1 },
                        ]}
                        onPress={() => nav.navigate("Resource", { resource })}
                      >
                        <Text style={s.presetText}>
                          {resources[resource].title} →
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
              <Text style={s.blockTitle}>🛠️ Sự cố cần tiếp nhận gần đây</Text>
              {(d.maintenance || []).map((item: any) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  style={s.itemRowCard}
                  onPress={() =>
                    nav.navigate("IncidentDetail", { id: Number(item.id) })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemRowTitle}>
                      [{item.room_number || item.room_code || "Phòng"}]{" "}
                      {item.title}
                    </Text>
                    <Text style={s.itemRowMuted}>
                      Người báo: {item.tenant_name}
                    </Text>
                    <Text style={s.itemRowSub}>{item.description}</Text>
                  </View>
                  <View style={[s.badge, s.badgeOrange]}>
                    <Text style={s.badgeText}>
                      {labels[item.status] || item.status}
                    </Text>
                  </View>
                </Pressable>
              ))}
              {!d.maintenance?.length && <Info>Chưa có sự cố cần xử lý.</Info>}
            </>
          ) : (
            <>
              <Text style={s.blockTitle}>🏠 Thông tin phòng ở</Text>
              <View style={s.premiumCard}>
                {d.room ? (
                  <>
                    <View style={s.roomHeadRow}>
                      <Text style={s.roomHeaderName}>
                        {d.room.room_number || d.room.room_code}
                      </Text>
                      <View style={s.activeTag}>
                        <Text style={s.activeTagText}>Đang thuê</Text>
                      </View>
                    </View>
                    <Text style={s.cardMuted}>
                      {d.room.area_name} · {d.room.area_size} m²
                    </Text>
                    <Text style={s.cardAddress}>📍 {d.room.address}</Text>
                    <View style={s.divider} />
                    <View style={s.priceRow}>
                      <Text style={s.priceLabel}>Giá thuê:</Text>
                      <Text style={s.priceHighlight}>
                        {money(d.room.price || d.room.rent_price)}
                        <Text style={s.priceUnit}> / tháng</Text>
                      </Text>
                    </View>
                    <Text style={s.cardMuted}>
                      Hợp đồng {d.room.contract_code} · {d.room.start_date} —{" "}
                      {d.room.end_date}
                    </Text>
                  </>
                ) : (
                  <Info>Chưa có hợp đồng thuê phòng nào đang kích hoạt.</Info>
                )}
              </View>
            </>
          )}
          <Text style={s.blockTitle}>🧾 Hóa đơn gần đây</Text>
          {(d.invoices || []).map((item: any) => (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              style={s.itemRowCard}
              onPress={() =>
                nav.navigate("InvoiceDetail", { id: Number(item.id) })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={s.itemRowTitle}>
                  {item.invoice_code} · Kỳ {item.billing_month}
                </Text>
                <Text style={s.itemRowMuted}>
                  Tổng: {money(item.total_amount)}
                </Text>
                <Text style={s.itemRowSub}>
                  Còn nợ:{" "}
                  <Text style={s.boldDanger}>
                    {money(item.remaining_amount)}
                  </Text>
                </Text>
              </View>
              <View
                style={[
                  s.badge,
                  item.status === "paid" ? s.badgeGreen : s.badgeOrange,
                ]}
              >
                <Text style={s.badgeText}>
                  {labels[item.status] || item.status}
                </Text>
              </View>
            </Pressable>
          ))}
          {!d.invoices?.length && <Info>Chưa có hóa đơn.</Info>}
        </>
      )}
      <Button
        title="Cập nhật tổng quan"
        onPress={() => {
          void vm.load();
        }}
      />
    </Page>
  );
}

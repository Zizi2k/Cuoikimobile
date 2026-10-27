import React, { useState } from "react";
import { Alert, FlatList, Modal, View, Text } from "react-native";
import { useRoomsModel } from "../viewmodels/useScreenModels";
import { Room } from "../models/types";
import {
  Page,
  Title,
  Info,
  Field,
  Button,
  State,
  Choices,
  ui,
  money,
  labels,
} from "./components/ui";
import { roomStyles as old } from "./components/legacyStyles";
export default function RoomsView() {
  const vm = useRoomsModel();
  const [editing, setEditing] = useState<Room | null | undefined>(undefined);
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");
  const [size, setSize] = useState("");
  const [status, setStatus] = useState("empty");
  function open(room: Room | null) {
    setEditing(room);
    setNumber(room?.room_number || "");
    setCode(room?.room_code || "");
    setPrice(String(room?.price ?? ""));
    setArea(String(room?.area_id ?? 1));
    setSize(String(room?.area_size ?? 20));
    setStatus(room?.status || "empty");
  }
  async function save() {
    const data = {
      room_number: number,
      room_code: code,
      price: Number(price),
      area_id: Number(area),
      area_size: Number(size),
      status: status as Room["status"],
    };
    const result = editing
      ? await vm.editRoom(editing.id, data)
      : await vm.addRoom(data);
    if (result.success) setEditing(undefined);
  }
  return (
    <View style={ui.shell}>
      <FlatList
        contentContainerStyle={ui.list}
        data={vm.filteredRooms}
        keyExtractor={(item) => String(item.id)}
        refreshing={vm.refreshing}
        onRefresh={() => {
          void vm.refresh();
        }}
        ListHeaderComponent={
          <>
            <View style={old.statsRow}>
              {[
                { value: vm.stats.total, label: "Tổng số", color: "#0F172A" },
                {
                  value: vm.stats.rented,
                  label: "Đang thuê",
                  color: "#16A34A",
                },
                { value: vm.stats.empty, label: "Còn trống", color: "#2563EB" },
                {
                  value: vm.stats.maintenance,
                  label: "Bảo trì",
                  color: "#EA580C",
                },
              ].map((stat) => (
                <View key={stat.label} style={old.statBox}>
                  <Text style={[old.statVal, { color: stat.color }]}>
                    {stat.value}
                  </Text>
                  <Text style={old.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
            <Button title="Thêm phòng" onPress={() => open(null)} />
            <Choices
              values={["all", "empty", "rented", "maintenance"]}
              value={vm.statusFilter}
              onChange={(v) => vm.setStatusFilter(v as any)}
            />
            <State
              loading={vm.loading}
              error={vm.error}
              retry={() => {
                void vm.loadRooms();
              }}
            />
          </>
        }
        ListEmptyComponent={<State empty={!vm.error} loading={false} />}
        renderItem={({ item }) => (
          <View style={old.roomCard}>
            <View style={old.roomHeaderRow}>
              <Text style={old.roomCode}>
                🚪 {item.room_number || item.room_code}
              </Text>
              <View
                style={[
                  old.badge,
                  item.status === "rented"
                    ? old.badgeGreen
                    : item.status === "empty"
                      ? old.badgeBlue
                      : old.badgeOrange,
                ]}
              >
                <Text style={old.badgeText}>{labels[item.status]}</Text>
              </View>
            </View>
            <Text style={old.cardMuted}>
              {item.area_name || `Khu #${item.area_id}`} · {item.area_size} m² ·{" "}
              {item.room_code}
            </Text>
            <Text style={old.priceHighlight}>
              {money(item.price)} <Text style={old.priceUnit}>/ tháng</Text>
            </Text>
            <View style={old.divider} />
            {item.current_tenant_name ? (
              <View style={old.tenantInfoBox}>
                <Text style={old.tenantName}>
                  👤 Khách thuê: {item.current_tenant_name}
                </Text>
                <Text style={old.tenantPhone}>{item.current_tenant_phone}</Text>
              </View>
            ) : (
              <Text style={old.emptyTenantNote}>
                Chưa có người thuê (Sẵn sàng nhận phòng)
              </Text>
            )}
            <Button title="Sửa phòng" onPress={() => open(item)} />
            <Button
              title="Xóa phòng"
              danger
              disabled={vm.actionLoading}
              onPress={() =>
                Alert.alert("Xóa phòng?", item.room_number, [
                  { text: "Hủy" },
                  {
                    text: "Xóa",
                    style: "destructive",
                    onPress: () => {
                      void vm.removeRoom(item.id);
                    },
                  },
                ])
              }
            />
          </View>
        )}
      />
      <Modal
        visible={editing !== undefined}
        animationType="slide"
        onRequestClose={() => setEditing(undefined)}
      >
        <Page>
          <Title>{editing ? "Sửa phòng" : "Thêm phòng"}</Title>
          <Field
            label="Tên / số phòng"
            value={number}
            onChangeText={setNumber}
          />
          <Field
            label="Mã phòng (duy nhất)"
            value={code}
            onChangeText={setCode}
          />
          <Field
            label="ID khu trọ"
            numeric
            value={area}
            onChangeText={setArea}
          />
          <Field
            label="Giá thuê"
            numeric
            value={price}
            onChangeText={setPrice}
          />
          <Field
            label="Diện tích m²"
            numeric
            value={size}
            onChangeText={setSize}
          />
          <Choices
            values={["empty", "maintenance"]}
            value={status}
            onChange={setStatus}
          />
          <Info>
            Phòng đang thuê được quản lý theo hợp đồng; không đổi trạng thái tùy
            ý.
          </Info>
          <State loading={vm.actionLoading} error={vm.error} />
          <Button
            title="Lưu"
            disabled={vm.actionLoading}
            onPress={() => {
              void save();
            }}
          />
          <Button title="Đóng" onPress={() => setEditing(undefined)} />
        </Page>
      </Modal>
    </View>
  );
}

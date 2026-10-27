import React, { useState } from "react";
import { Alert, FlatList, Modal, View } from "react-native";
import { useRoomsModel } from "../viewmodels/useScreenModels";
import { Room } from "../models/types";
import {
  Page,
  Card,
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
            <Title>Phòng trọ ({vm.stats.total})</Title>
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
          <Card>
            <Title>{item.room_number}</Title>
            <Info>
              ID {item.id} · Khu {item.area_id} · {labels[item.status]} ·{" "}
              {item.area_size} m²
            </Info>
            <Info>
              {money(item.price)}/tháng ·{" "}
              {item.current_tenant_name || "Chưa có khách thuê"}
            </Info>
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
          </Card>
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

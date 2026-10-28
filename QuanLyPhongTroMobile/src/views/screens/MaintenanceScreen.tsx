import React, { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, Switch, View } from "react-native";
import { MaintenanceRequest } from "../../models/types";
import { useMaintenanceModel } from "../../viewmodels/useScreenModels";
import { useSession } from "../../context/AuthContext";
import {
  Page,
  Card,
  Title,
  Info,
  Button,
  Field,
  State,
  Choices,
  ui,
  labels,
} from "../components/ui";
export default function MaintenanceScreen() {
  const vm = useMaintenanceModel();
  const session = useSession();
  const admin = session.user?.role === "admin";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [editing, setEditing] = useState<MaintenanceRequest | null>(null);
  const [status, setStatus] = useState("in_progress");
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("0");

  useEffect(() => {
    if (!editing) return;
    setStatus(editing.status || "in_progress");
    setNotes(editing.admin_notes || "");
    setCost(String(editing.cost ?? 0));
  }, [editing]);

  const openEditor = (item: MaintenanceRequest) => {
    if (!admin) return;
    vm.error = "";
    vm.message = "";
    setEditing(item);
  };

  return (
    <View style={ui.shell}>
      <FlatList
        contentContainerStyle={ui.list}
        data={vm.items}
        keyExtractor={(i) => String(i.id)}
        refreshing={vm.loading}
        onRefresh={() => {
          void vm.load();
        }}
        ListHeaderComponent={
          <>
            <Title>{admin ? "Xử lý sự cố" : "Báo sự cố"}</Title>
            <Info>
              Realtime: {session.socketStatus}. Hai chiều qua Socket.IO khi bật.
            </Info>
            <View style={ui.row}>
              <Switch
                value={vm.realtime}
                onValueChange={(v) => vm.setRealtime(v)}
              />
              <Info>
                {vm.realtime ? "Socket.IO" : "REST dự phòng (không tự gửi lại)"}
              </Info>
            </View>
            {!admin && (
              <Card>
                <Field label="Tiêu đề" value={title} onChangeText={setTitle} />
                <Field
                  label="Mô tả"
                  value={description}
                  onChangeText={setDescription}
                />
                <Choices
                  values={["low", "medium", "high", "urgent"]}
                  value={priority}
                  onChange={setPriority}
                />
                <Button
                  title="Gửi yêu cầu sửa chữa"
                  disabled={vm.busy}
                  onPress={() => {
                    void vm
                      .send({ title, description, priority })
                      .then((ok) => {
                        if (ok) {
                          setTitle("");
                          setDescription("");
                        }
                      });
                  }}
                />
              </Card>
            )}
            <Info>{vm.message}</Info>
            <State
              loading={vm.loading}
              error={vm.error}
              retry={() => {
                void vm.load();
              }}
            />
          </>
        }
        ListEmptyComponent={<State empty={!vm.error} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => openEditor(item)} disabled={!admin}>
            <Card>
              <Title>{item.title}</Title>
              <Info>
                {item.room_number || item.room_code} · {item.tenant_name}
              </Info>
              <Info>
                {labels[item.status]} · {item.description}
              </Info>
              <Info>{item.admin_notes}</Info>
            </Card>
          </Pressable>
        )}
      />
      <Modal
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <Page>
          <Title>Cập nhật sự cố</Title>
          <Choices
            values={["pending", "in_progress", "completed", "rejected"]}
            value={status}
            onChange={setStatus}
          />
          <Field label="Phản hồi" value={notes} onChangeText={setNotes} />
          <Field label="Chi phí" numeric value={cost} onChangeText={setCost} />
          <State loading={vm.busy} error={vm.error} />
          <Button
            title="Lưu và thông báo người thuê"
            disabled={vm.busy}
            onPress={() => {
              if (editing)
                void vm
                  .update(editing.id, { status, admin_notes: notes, cost })
                  .then((ok) => {
                    if (ok) setEditing(null);
                  });
            }}
          />
          {admin && (
            <Button
              title="Xóa sự cố"
              danger
              disabled={vm.busy}
              onPress={() => {
                if (editing)
                  void vm.remove(editing.id).then((ok) => {
                    if (ok) setEditing(null);
                  });
              }}
            />
          )}
          <Button title="Đóng" onPress={() => setEditing(null)} />
        </Page>
      </Modal>
    </View>
  );
}

import React, { useState } from "react";
import { Alert, FlatList, Modal, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootParams } from "../../navigation/types";
import { resources } from "../../models/management";
import { useResourceModel } from "../../viewmodels/useScreenModels";
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
export default function ResourceScreen({
  route,
}: NativeStackScreenProps<RootParams, "Resource">) {
  const resource = route.params.resource;
  const vm = useResourceModel(resource);
  const definition = resources[resource];
  const [editing, setEditing] = useState<number | null | undefined>(undefined);
  const [values, setValues] = useState<Record<string, string>>({});
  function open(item: Record<string, any> | null) {
    setEditing(item ? Number(item.id) : null);
    setValues(
      Object.fromEntries(
        definition.fields.map((f) => [
          f.key,
          String(item?.[f.key] ?? f.default ?? ""),
        ]),
      ),
    );
  }
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
            <Title>{definition.title}</Title>
            <Button title="Thêm mới" onPress={() => open(null)} />
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
          <Card>
            <Title>
              #{item.id} ·{" "}
              {item.name ||
                item.fullname ||
                item.contract_code ||
                item.title ||
                item.billing_month}
            </Title>
            {definition.fields.map((f) => (
              <Info key={f.key}>
                {f.label}:{" "}
                {labels[String(item[f.key])] || String(item[f.key] ?? "—")}
              </Info>
            ))}
            <Button title="Sửa" onPress={() => open(item)} />
            <Button
              title="Xóa"
              danger
              disabled={vm.busy}
              onPress={() =>
                Alert.alert(
                  "Xóa bản ghi?",
                  "Dữ liệu đang được sử dụng có thể không xóa được.",
                  [
                    { text: "Hủy" },
                    {
                      text: "Xóa",
                      style: "destructive",
                      onPress: () => {
                        void vm.remove(Number(item.id));
                      },
                    },
                  ],
                )
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
          <Title>
            {editing ? "Sửa" : "Thêm"} {definition.title}
          </Title>
          {definition.fields.map((f) =>
            f.choices ? (
              <View key={f.key}>
                <Info>{f.label}</Info>
                <Choices
                  values={f.choices}
                  value={values[f.key] || ""}
                  onChange={(v) => setValues({ ...values, [f.key]: v })}
                />
              </View>
            ) : (
              <Field
                key={f.key}
                label={f.label + (f.required ? " *" : "")}
                numeric={f.numeric}
                value={values[f.key] || ""}
                onChangeText={(v) => setValues({ ...values, [f.key]: v })}
              />
            ),
          )}
          <State loading={vm.busy} error={vm.error} />
          <Button
            title="Lưu"
            disabled={vm.busy}
            onPress={() => {
              void vm.save(editing ?? null, values).then((ok) => {
                if (ok) setEditing(undefined);
              });
            }}
          />
          <Button title="Đóng" onPress={() => setEditing(undefined)} />
        </Page>
      </Modal>
    </View>
  );
}

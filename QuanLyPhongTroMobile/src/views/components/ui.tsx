import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
export const money = (value: unknown) =>
  Number(value || 0).toLocaleString("vi-VN") + " đ";
export const labels: Record<string, string> = {
  all: "Tất cả",
  low: "Thấp",
  medium: "Bình thường",
  high: "Cao",
  urgent: "Khẩn cấp 🚨",
  empty: "Còn trống",
  rented: "Đang thuê",
  maintenance: "Bảo trì",
  pending: "Chờ xử lý",
  in_progress: "Đang xử lý",
  completed: "Hoàn thành",
  rejected: "Từ chối",
  unpaid: "Chưa thu",
  partially_paid: "Thu một phần",
  paid: "Đã thu đủ",
  overdue: "Quá hạn",
  active: "Hiệu lực",
  expired: "Hết hạn",
  terminated: "Đã kết thúc",
};
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      {children}
    </ScrollView>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={ui.card}>{children}</View>;
}
export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={ui.title}>{children}</Text>;
}
export function Info({ children }: { children: React.ReactNode }) {
  return <Text style={ui.info}>{children}</Text>;
}
export function Button({
  title,
  onPress,
  disabled = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[ui.button, danger && ui.danger, disabled && { opacity: 0.45 }]}
    >
      <Text style={ui.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  secure = false,
  numeric = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secure?: boolean;
  numeric?: boolean;
}) {
  return (
    <View style={ui.field}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize="none"
        keyboardType={numeric ? "decimal-pad" : "default"}
        style={ui.input}
      />
    </View>
  );
}
export function State({
  loading,
  error,
  empty = false,
  retry,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  retry?: () => void;
}) {
  return (
    <View>
      {loading && <ActivityIndicator size="large" color="#2563EB" />}
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {empty && !loading && !error && <Info>Chưa có dữ liệu.</Info>}
      {!!error && retry && <Button title="Thử tải lại" onPress={retry} />}
    </View>
  );
}
export function Choices({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={ui.row}>
      {values.map((item) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          style={[ui.chip, value === item && ui.chipSelected]}
        >
          <Text style={{ color: value === item ? "#fff" : "#334155" }}>
            {labels[item] || item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export const ui = StyleSheet.create({
  page: {
    padding: 16,
    paddingBottom: 45,
    gap: 12,
    backgroundColor: "#F8FAFC",
    flexGrow: 1,
  },
  card: {
    padding: 17,
    borderRadius: 14,
    backgroundColor: "#fff",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 8 },
  info: { fontSize: 14, lineHeight: 22, color: "#64748B" },
  label: { fontSize: 14, color: "#334155", marginBottom: 5, fontWeight: "600" },
  field: { marginVertical: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    color: "#0F172A",
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 4,
  },
  buttonText: { fontWeight: "700", color: "#fff", fontSize: 14 },
  danger: { backgroundColor: "#b23a3a" },
  error: {
    color: "#ac2424",
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { padding: 10, borderRadius: 8, backgroundColor: "#F1F5F9" },
  chipSelected: { backgroundColor: "#2563EB" },
  itemTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  list: { padding: 16, gap: 12, paddingBottom: 36 },
  modal: { flex: 1, backgroundColor: "#F8FAFC" },
  shell: { flex: 1, backgroundColor: "#F8FAFC" },
});

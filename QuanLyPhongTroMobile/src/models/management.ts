export type ResourceName =
  "areas" | "tenants" | "contracts" | "services" | "meters" | "expenses";
export interface Field {
  key: string;
  label: string;
  required?: boolean;
  choices?: string[];
  numeric?: boolean;
  default?: string;
}
export const resources: Record<
  ResourceName,
  { title: string; fields: Field[] }
> = {
  areas: {
    title: "Khu trọ",
    fields: [
      { key: "area_code", label: "Mã khu", required: true },
      { key: "name", label: "Tên khu", required: true },
      { key: "address", label: "Địa chỉ", required: true },
      { key: "contact_phone", label: "Điện thoại" },
    ],
  },
  tenants: {
    title: "Người thuê",
    fields: [
      { key: "fullname", label: "Họ tên", required: true },
      { key: "phone", label: "Số điện thoại", required: true },
      { key: "email", label: "Email" },
      { key: "id_card", label: "CCCD" },
      { key: "address", label: "Địa chỉ" },
      { key: "notes", label: "Ghi chú" },
    ],
  },
  contracts: {
    title: "Hợp đồng",
    fields: [
      { key: "contract_code", label: "Mã hợp đồng", required: true },
      {
        key: "room_id",
        label: "ID phòng (xem danh sách phòng)",
        required: true,
        numeric: true,
      },
      {
        key: "tenant_id",
        label: "ID người thuê (xem mục Người thuê)",
        required: true,
        numeric: true,
      },
      { key: "start_date", label: "Ngày bắt đầu YYYY-MM-DD", required: true },
      { key: "end_date", label: "Ngày kết thúc YYYY-MM-DD", required: true },
      { key: "rent_price", label: "Tiền thuê", required: true, numeric: true },
      { key: "deposit_amount", label: "Tiền cọc", numeric: true, default: "0" },
      {
        key: "payment_cycle",
        label: "Chu kỳ tháng",
        numeric: true,
        default: "1",
      },
      {
        key: "status",
        label: "Trạng thái",
        choices: ["active", "expired", "terminated"],
        default: "active",
      },
      { key: "terms", label: "Điều khoản" },
    ],
  },
  services: {
    title: "Dịch vụ",
    fields: [
      { key: "service_code", label: "Mã dịch vụ", required: true },
      { key: "name", label: "Tên dịch vụ", required: true },
      { key: "unit", label: "Đơn vị", required: true },
      { key: "price", label: "Đơn giá", required: true, numeric: true },
      {
        key: "type",
        label: "Loại",
        choices: ["fixed", "meter"],
        default: "fixed",
      },
      {
        key: "is_active",
        label: "Đang áp dụng",
        choices: ["1", "0"],
        default: "1",
      },
    ],
  },
  meters: {
    title: "Điện nước",
    fields: [
      { key: "room_id", label: "ID phòng", required: true, numeric: true },
      { key: "billing_month", label: "Kỳ YYYY-MM", required: true },
      {
        key: "electricity_old",
        label: "Điện cũ",
        required: true,
        numeric: true,
      },
      {
        key: "electricity_new",
        label: "Điện mới",
        required: true,
        numeric: true,
      },
      { key: "water_old", label: "Nước cũ", required: true, numeric: true },
      { key: "water_new", label: "Nước mới", required: true, numeric: true },
      { key: "recorded_date", label: "Ngày ghi YYYY-MM-DD", required: true },
    ],
  },
  expenses: {
    title: "Chi phí",
    fields: [
      { key: "expense_code", label: "Mã phiếu", required: true },
      { key: "title", label: "Nội dung", required: true },
      { key: "category", label: "Loại chi phí", required: true },
      { key: "amount", label: "Số tiền", required: true, numeric: true },
      { key: "expense_date", label: "Ngày chi YYYY-MM-DD", required: true },
      { key: "recipient", label: "Người nhận" },
    ],
  },
};

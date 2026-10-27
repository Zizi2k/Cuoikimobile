/**
 * Domain Models & Types for QuanLyPhongTro Mobile (MVVM Architecture)
 */

export interface User {
  id: number;
  username: string;
  fullname: string;
  email?: string;
  phone?: string;
  role: "admin" | "tenant";
  status: number;
  tenant_id?: number | null;
}

export interface Room {
  id: number;
  room_code: string;
  room_number: string;
  area_id?: number;
  area_name?: string;
  area_size: number;
  price: number;
  deposit?: number;
  max_occupants?: number;
  status: "empty" | "rented" | "maintenance";
  description?: string;
  current_tenant_name?: string;
  current_tenant_phone?: string;
  contract_id?: number;
  contract_code?: string;
  start_date?: string;
  end_date?: string;
}

export interface Invoice {
  id: number;
  invoice_code: string;
  billing_month: string;
  room_id?: number;
  room_number?: string;
  room_code?: string;
  tenant_id?: number;
  tenant_name?: string;
  tenant_phone?: string;
  room_price: number;
  electricity_amount: number;
  water_amount: number;
  service_amount: number;
  other_fees: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: "unpaid" | "partially_paid" | "paid" | "overdue";
  notes?: string;
  vietqr_url?: string | null;
  created_at?: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  type?: string;
  is_read: number;
  reference_type?: string;
  reference_id?: number;
  data_payload?: string;
  data?: Record<string, any>;
  created_at?: string;
}

export interface MaintenanceRequest {
  id: number;
  room_id?: number;
  room_number?: string;
  room_code?: string;
  tenant_id?: number;
  tenant_name?: string;
  tenant_phone?: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "rejected";
  admin_notes?: string;
  cost?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  unread_count?: number;
  total?: number;
  [key: string]: any;
}

export interface NotificationPreferences {
  invoice: boolean;
  payment: boolean;
  maintenance: boolean;
  reminder: boolean;
}

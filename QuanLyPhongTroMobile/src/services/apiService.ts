import AsyncStorage from "@react-native-async-storage/async-storage";
import { emitEvent } from "./events";
export const DEFAULT_API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://192.168.100.36:8080/QuanLyPhongTro/api/";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function normalizeApiBase(value: string): string {
  const clean = value.trim();
  const url = new URL(clean);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error("Địa chỉ API phải là URL http/https hợp lệ.");
  return clean.endsWith("?route=") ? clean : clean.replace(/\/+$/, "") + "/";
}
export async function getSavedApiBase(): Promise<string> {
  return (await AsyncStorage.getItem("@qlpt_api_base")) || DEFAULT_API_BASE;
}
export async function setSavedApiBase(value: string): Promise<void> {
  await AsyncStorage.setItem("@qlpt_api_base", normalizeApiBase(value));
}
export function getRealtimeUrlFromApiBase(base: string): string {
  if (process.env.EXPO_PUBLIC_REALTIME_URL)
    return process.env.EXPO_PUBLIC_REALTIME_URL;
  const url = new URL(base);
  url.port = "3001";
  return url.origin;
}
export async function apiClient<T = any>(
  endpoint: string,
  method = "GET",
  body?: unknown,
  overrideToken?: string,
): Promise<T> {
  const base = await getSavedApiBase();
  const token = overrideToken ?? (await AsyncStorage.getItem("@qlpt_token"));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(base + endpoint.replace(/^\//, ""), {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      if (
        response.status === 401 &&
        token &&
        !["login", "register"].includes(endpoint)
      )
        emitEvent("unauthorized");
      throw new ApiError(
        data?.message ||
          `HTTP ${response.status}: máy chủ trả dữ liệu không hợp lệ.`,
        response.status,
      );
    }
    if (!data)
      throw new Error(
        "Máy chủ không trả JSON. Kiểm tra URL API và cấu hình PHP.",
      );
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "Máy chủ phản hồi quá hạn. Hãy kiểm tra mạng và thử tải lại.",
      );
    throw new Error(
      error instanceof Error ? error.message : "Không kết nối được máy chủ.",
    );
  } finally {
    clearTimeout(timer);
  }
}

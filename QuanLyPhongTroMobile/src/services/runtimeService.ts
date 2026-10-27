import { registerForPushNotificationsAsync } from "./notificationService";
import { connectSocket, disconnectSocket } from "./socketService";
import { apiClient, getRealtimeUrlFromApiBase } from "./apiService";
let push: { device: string; owner: string } | null = null;
let generation = 0;
let ownerToken = "";
export async function registerDevice(): Promise<string> {
  const run = generation,
    owner = ownerToken;
  if (!owner) return "Vui lòng đăng nhập trước.";
  try {
    const device = await registerForPushNotificationsAsync();
    if (run !== generation) return "";
    if (!device)
      return "Thông báo thiết bị chưa bật. Dùng development build + thiết bị thật; API/realtime vẫn hoạt động.";
    await apiClient("push-token", "POST", { token: device }, owner);
    if (run !== generation) {
      await apiClient(
        "push-token/remove",
        "POST",
        { token: device },
        owner,
      ).catch(() => {});
      return "";
    }
    push = { device, owner };
    return "Đã đăng ký push token thật với server.";
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Đăng ký thông báo thất bại.";
  }
}
export function startRuntime(base: string, token: string): () => void {
  generation++;
  ownerToken = token;
  connectSocket(getRealtimeUrlFromApiBase(base), token);
  return () => {
    generation++;
    ownerToken = "";
    disconnectSocket();
  };
}
export async function unregisterDevice(): Promise<void> {
  generation++;
  ownerToken = "";
  const saved = push;
  push = null;
  disconnectSocket();
  if (saved)
    await apiClient(
      "push-token/remove",
      "POST",
      { token: saved.device },
      saved.owner,
    );
}

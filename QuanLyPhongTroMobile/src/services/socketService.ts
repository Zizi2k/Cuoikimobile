import { io, Socket } from "socket.io-client";
import { emitEvent } from "./events";
export type SocketStatus = "connected" | "connecting" | "disconnected";
let socket: Socket | null = null;
let status: SocketStatus = "disconnected";
const listeners = new Set<(value: SocketStatus) => void>();
function update(value: SocketStatus) {
  status = value;
  listeners.forEach((fn) => fn(value));
  emitEvent("socket");
}
export function connectSocket(url: string, token: string): Socket {
  disconnectSocket();
  update("connecting");
  const current = io(url, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 12000,
  });
  socket = current;
  current.on("connect", () => {
    update("connected");
    emitEvent("data");
  });
  current.on("disconnect", () => update("disconnected"));
  current.on("connect_error", () => update("disconnected"));
  current.io.on("reconnect_attempt", () => update("connecting"));
  current.on("incident:created", () => emitEvent("data"));
  current.on("incident:status:changed", () => emitEvent("data"));
  current.on("notification:created", () => emitEvent("data"));
  return current;
}
export function getSocket(): Socket | null {
  return socket;
}
export function getSocketStatus(): SocketStatus {
  return status;
}
export function onSocketStatusChange(
  fn: (value: SocketStatus) => void,
): () => void {
  listeners.add(fn);
  fn(status);
  return () => {
    listeners.delete(fn);
  };
}
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  update("disconnected");
}
export async function socketCommand<T>(
  event: string,
  body: unknown,
): Promise<T> {
  const current = socket;
  if (!current?.connected)
    throw new Error(
      "Realtime chưa kết nối. Vui lòng đợi kết nối lại hoặc chọn chế độ REST.",
    );
  return new Promise((resolve, reject) =>
    current
      .timeout(15000)
      .emit(event, body, (error: Error | null, response: any) => {
        if (error)
          reject(new Error("Không nhận được xác nhận từ hệ thống realtime."));
        else if (!response?.success)
          reject(
            new Error(response?.message || "Không thực hiện được thao tác."),
          );
        else resolve(response as T);
      }),
  );
}

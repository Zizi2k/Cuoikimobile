import { createNavigationContainerRef } from "@react-navigation/native";
import { RootParams } from "./types";
import { notificationTarget } from "../models/notificationTarget";
import { NotificationPayload } from "../services/notificationService";
export { notificationTarget } from "../models/notificationTarget";
export const navigationRef = createNavigationContainerRef<RootParams>();
let pending: NotificationPayload | null = null;
let last = "";
export function queueNotification(data: NotificationPayload): void {
  pending = data;
  flushNotification();
}
export function clearPendingNotification(): void {
  pending = null;
  last = "";
}
export function flushNotification(): void {
  if (
    !pending ||
    !navigationRef.isReady() ||
    !navigationRef.getRootState()?.routeNames.includes("Main")
  )
    return;
  const key = pending.notification_id ? String(pending.notification_id) : "";
  const data = pending;
  pending = null;
  if (key && key === last) return;
  last = key;
  const target = notificationTarget(data);
  if (target) navigationRef.navigate(target.screen, { id: target.id });
  else navigationRef.navigate("Main", { screen: "Notifications" });
}

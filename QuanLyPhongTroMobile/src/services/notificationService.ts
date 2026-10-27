import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import type { NotificationPayload } from "../models/NotificationPayload";
export type { NotificationPayload } from "../models/NotificationPayload";
type Module = typeof import("expo-notifications");
let loaded: Promise<Module | null> | null = null;
export function requiresNotificationDevelopmentBuild(): boolean {
  return Platform.OS !== "web" && isRunningInExpoGo();
}
async function load(): Promise<Module | null> {
  // Do not evaluate missing native modules while importing a route (Expo Go / old client).
  if (Platform.OS === "web" || requiresNotificationDevelopmentBuild())
    return null;
  loaded ??= import("expo-notifications")
    .then((native) => {
      native.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      return native;
    })
    .catch(() => null);
  return loaded;
}
async function permissions(native: Module): Promise<boolean> {
  if (Platform.OS === "android")
    await native.setNotificationChannelAsync("default", {
      name: "Phòng trọ",
      importance: native.AndroidImportance.HIGH,
      sound: "default",
    });
  const existing = await native.getPermissionsAsync();
  return (
    existing.status === "granted" ||
    (await native.requestPermissionsAsync()).status === "granted"
  );
}
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  const native = await load();
  if (!native || !Device.isDevice) return null;
  if (!(await permissions(native))) return null;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId)
    throw new Error("Cần cấu hình EAS projectId để đăng ký push thật.");
  return (await native.getExpoPushTokenAsync({ projectId })).data;
}
export async function scheduleLocalReminder(params: {
  title: string;
  body: string;
  seconds?: number;
  data?: NotificationPayload;
}): Promise<string | null> {
  const native = await load();
  if (!native || !(await permissions(native))) return null;
  return native.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      sound: "default",
    },
    trigger: {
      type: native.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, params.seconds ?? 60),
      repeats: false,
      channelId: "default",
    },
  });
}
export async function cancelScheduledReminder(id: string): Promise<void> {
  await (await load())?.cancelScheduledNotificationAsync(id);
}
export async function subscribeToNotificationEvents(
  received: (data: NotificationPayload) => void,
  tapped: (data: NotificationPayload) => void,
): Promise<() => void> {
  const native = await load();
  if (!native) return () => {};
  const a = native.addNotificationReceivedListener((n) =>
    received((n.request.content.data ?? {}) as NotificationPayload),
  );
  const b = native.addNotificationResponseReceivedListener((r) =>
    tapped((r.notification.request.content.data ?? {}) as NotificationPayload),
  );
  const c = native.addPushTokenListener(() => {
    /* The lifecycle service re-registers on foreground. */
  });
  return () => {
    a.remove();
    b.remove();
    c.remove();
  };
}
export async function checkInitialNotification(): Promise<NotificationPayload | null> {
  const native = await load();
  if (!native) return null;
  const response = await native.getLastNotificationResponseAsync();
  if (!response) return null;
  const data = response.notification.request.content.data;
  await native.clearLastNotificationResponseAsync();
  return (data ?? {}) as NotificationPayload;
}

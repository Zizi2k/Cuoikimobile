import { NotificationItem, NotificationPreferences } from "../models/types";

export interface INotificationRepository {
  getNotifications(): Promise<{
    items: NotificationItem[];
    unreadCount: number;
  }>;
  getUnreadCount(): Promise<number>;
  markAsRead(id: number): Promise<boolean>;
  markAllAsRead(): Promise<boolean>;
  getPreferences(): Promise<NotificationPreferences>;
  savePreference(category: string, isEnabled: boolean): Promise<boolean>;
  savePushToken(
    token: string,
    deviceType?: string,
    deviceId?: string,
  ): Promise<boolean>;
  removePushToken(token: string): Promise<boolean>;
}

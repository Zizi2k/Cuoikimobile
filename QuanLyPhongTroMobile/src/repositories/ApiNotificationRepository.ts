import { INotificationRepository } from "./INotificationRepository";
import {
  NotificationItem,
  NotificationPreferences,
  ApiResponse,
} from "../models/types";
import { apiClient } from "../services/apiService";

export class ApiNotificationRepository implements INotificationRepository {
  async getNotifications(): Promise<{
    items: NotificationItem[];
    unreadCount: number;
  }> {
    const res = await apiClient<ApiResponse<NotificationItem[]>>(
      "notifications",
      "GET",
    );
    return {
      items: res.data || [],
      unreadCount: res.unread_count || 0,
    };
  }

  async getUnreadCount(): Promise<number> {
    try {
      const res = await apiClient<ApiResponse>(
        "notifications/unread-count",
        "GET",
      );
      return res.unread_count || 0;
    } catch {
      return 0;
    }
  }

  async markAsRead(id: number): Promise<boolean> {
    try {
      await apiClient<ApiResponse>(`notifications/read/${id}`, "POST");
      return true;
    } catch {
      return false;
    }
  }

  async markAllAsRead(): Promise<boolean> {
    try {
      await apiClient<ApiResponse>("notifications/read-all", "POST");
      return true;
    } catch {
      return false;
    }
  }

  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const res = await apiClient<
        ApiResponse<{ preferences: NotificationPreferences }>
      >("notifications/preferences", "GET");
      return (
        res.preferences || {
          invoice: true,
          payment: true,
          maintenance: true,
          reminder: true,
        }
      );
    } catch {
      return {
        invoice: true,
        payment: true,
        maintenance: true,
        reminder: true,
      };
    }
  }

  async savePreference(category: string, isEnabled: boolean): Promise<boolean> {
    try {
      await apiClient<ApiResponse>("notifications/preferences", "POST", {
        category,
        is_enabled: isEnabled ? 1 : 0,
      });
      return true;
    } catch {
      return false;
    }
  }

  async savePushToken(
    token: string,
    deviceType = "mobile",
    deviceId?: string,
  ): Promise<boolean> {
    try {
      await apiClient<ApiResponse>("push-token", "POST", {
        token,
        device_type: deviceType,
        device_id: deviceId,
      });
      return true;
    } catch {
      return false;
    }
  }

  async removePushToken(token: string): Promise<boolean> {
    try {
      await apiClient<ApiResponse>("push-token/remove", "POST", { token });
      return true;
    } catch {
      return false;
    }
  }
}

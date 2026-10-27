import { INotificationRepository } from "./INotificationRepository";
import { NotificationItem, NotificationPreferences } from "../models/types";

export class MockNotificationRepository implements INotificationRepository {
  public notifications: NotificationItem[] = [
    {
      id: 1,
      title: "Hóa đơn tháng mới",
      content: "Bạn có hóa đơn tiền phòng kỳ 2026-10 với số tiền 3.090.000 đ",
      type: "payment",
      is_read: 0,
      reference_type: "invoice",
      reference_id: 1,
      created_at: "2026-10-23 10:00:00",
    },
    {
      id: 2,
      title: "Bảo trì hệ thống nước",
      content:
        "Ban quản lý sẽ tạm ngắt nước từ 13h-15h chiều nay để bảo dưỡng định kỳ.",
      type: "general",
      is_read: 1,
      created_at: "2026-10-22 09:30:00",
    },
  ];

  public preferences: NotificationPreferences = {
    invoice: true,
    payment: true,
    maintenance: true,
    reminder: true,
  };

  public registeredTokens: string[] = [];
  public shouldFail = false;
  public errorMessage = "Lỗi máy chủ thông báo giả lập";

  async getNotifications(): Promise<{
    items: NotificationItem[];
    unreadCount: number;
  }> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    const unread = this.notifications.filter((n) => n.is_read === 0).length;
    return { items: [...this.notifications], unreadCount: unread };
  }

  async getUnreadCount(): Promise<number> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    return this.notifications.filter((n) => n.is_read === 0).length;
  }

  async markAsRead(id: number): Promise<boolean> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.is_read = 1;
      return true;
    }
    return false;
  }

  async markAllAsRead(): Promise<boolean> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    this.notifications.forEach((n) => {
      n.is_read = 1;
    });
    return true;
  }

  async getPreferences(): Promise<NotificationPreferences> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    return { ...this.preferences };
  }

  async savePreference(category: string, isEnabled: boolean): Promise<boolean> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    if (category in this.preferences) {
      (this.preferences as any)[category] = isEnabled;
      return true;
    }
    return false;
  }

  async savePushToken(token: string): Promise<boolean> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    if (!this.registeredTokens.includes(token)) {
      this.registeredTokens.push(token);
    }
    return true;
  }

  async removePushToken(token: string): Promise<boolean> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    this.registeredTokens = this.registeredTokens.filter((t) => t !== token);
    return true;
  }
}

import { useState, useEffect } from "react";
import { NotificationItem, NotificationPreferences } from "../models/types";
import { INotificationRepository } from "../repositories/INotificationRepository";
import { ApiNotificationRepository } from "../repositories/ApiNotificationRepository";

const defaultRepo = new ApiNotificationRepository();

export type NotificationFilter = "all" | "unread";

export interface UseNotificationsViewModelOptions {
  repository?: INotificationRepository;
  autoLoad?: boolean;
}

/**
 * ViewModel Class for Notifications (MVVM Pattern)
 */
export class NotificationsViewModel {
  public repo: INotificationRepository;
  public notifications: NotificationItem[] = [];
  public unreadCount: number = 0;
  public loading: boolean = false;
  public refreshing: boolean = false;
  public error: string | null = null;
  public filter: NotificationFilter = "all";
  public preferences: NotificationPreferences = {
    invoice: true,
    payment: true,
    maintenance: true,
    reminder: true,
  };
  public reminderMessage = "";
  private listeners: Set<() => void> = new Set();

  constructor(
    repo?: INotificationRepository,
    private schedule?: () => Promise<string | null>,
  ) {
    this.repo = repo || defaultRepo;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  get filteredNotifications(): NotificationItem[] {
    if (this.filter === "unread") {
      return this.notifications.filter((n) => n.is_read === 0);
    }
    return this.notifications;
  }

  get isEmpty(): boolean {
    return this.notifications.length === 0 && !this.loading;
  }

  public async loadNotifications(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.notify();
    try {
      const data = await this.repo.getNotifications();
      this.notifications = data.items;
      this.unreadCount = data.unreadCount;
    } catch (err: any) {
      this.error = err.message || "Không thể tải lịch sử thông báo";
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  public async refresh(): Promise<void> {
    this.refreshing = true;
    this.error = null;
    this.notify();
    try {
      const data = await this.repo.getNotifications();
      this.notifications = data.items;
      this.unreadCount = data.unreadCount;
    } catch (err: any) {
      this.error = err.message || "Lỗi khi làm mới thông báo";
    } finally {
      this.refreshing = false;
      this.notify();
    }
  }

  public async loadPreferences(): Promise<void> {
    try {
      this.preferences = await this.repo.getPreferences();
      this.notify();
    } catch {}
  }

  public setFilter(f: NotificationFilter): void {
    this.filter = f;
    this.notify();
  }

  public async markAsRead(item: NotificationItem): Promise<boolean> {
    if (item.is_read === 1) return true;

    // Optimistic update
    this.notifications = this.notifications.map((n) =>
      n.id === item.id ? { ...n, is_read: 1 } : n,
    );
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    this.notify();

    try {
      if (!(await this.repo.markAsRead(item.id)))
        throw new Error("Không thể đánh dấu đã đọc.");
      return true;
    } catch (err: any) {
      // Rollback on failure
      this.notifications = this.notifications.map((n) =>
        n.id === item.id ? { ...n, is_read: 0 } : n,
      );
      this.unreadCount += 1;
      this.error = err.message || "Không thể đánh dấu thông báo đã đọc";
      this.notify();
      return false;
    }
  }

  public async markAllAsRead(): Promise<boolean> {
    const previous = [...this.notifications];
    const previousUnread = this.unreadCount;

    // Optimistic update
    this.notifications = this.notifications.map((n) => ({ ...n, is_read: 1 }));
    this.unreadCount = 0;
    this.notify();

    try {
      if (!(await this.repo.markAllAsRead()))
        throw new Error("Không lưu được trạng thái đọc.");
      return true;
    } catch (err: any) {
      // Rollback
      this.notifications = previous;
      this.unreadCount = previousUnread;
      this.error = err.message || "Không thể đánh dấu tất cả thông báo";
      this.notify();
      return false;
    }
  }

  public async updatePreference(
    category: keyof NotificationPreferences,
    isEnabled: boolean,
  ): Promise<boolean> {
    this.preferences = { ...this.preferences, [category]: isEnabled };
    this.notify();
    try {
      if (!(await this.repo.savePreference(category, isEnabled)))
        throw new Error("Không lưu được tùy chọn.");
      return true;
    } catch {
      this.preferences = { ...this.preferences, [category]: !isEnabled };
      this.notify();
      return false;
    }
  }

  public async remind(): Promise<void> {
    this.reminderMessage = "";
    this.error = null;
    try {
      const id = await this.schedule?.();
      this.reminderMessage = id
        ? "Đã lên lịch thông báo sau 60 giây."
        : "Chức năng này cần development build có quyền thông báo.";
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : "Không lên lịch được thông báo.";
    }
    this.notify();
  }

  public async registerToken(
    token: string,
    deviceType = "mobile",
    deviceId?: string,
  ): Promise<void> {
    try {
      await this.repo.savePushToken(token, deviceType, deviceId);
    } catch (e) {
      console.warn("Failed to save push token via repository:", e);
    }
  }

  public async unregisterToken(token: string): Promise<void> {
    try {
      await this.repo.removePushToken(token);
    } catch (e) {
      console.warn("Failed to remove push token via repository:", e);
    }
  }
}

/**
 * Custom hook wrapping NotificationsViewModel for React Native components.
 */
export function useNotificationsViewModel(
  options?: UseNotificationsViewModelOptions,
) {
  const [vm] = useState(() => new NotificationsViewModel(options?.repository));
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = vm.subscribe(() => setTick((t) => t + 1));
    if (options?.autoLoad ?? true) {
      vm.loadNotifications();
      vm.loadPreferences();
    }
    return unsub;
  }, [vm, options?.autoLoad]);

  return {
    notifications: vm.notifications,
    filteredNotifications: vm.filteredNotifications,
    unreadCount: vm.unreadCount,
    loading: vm.loading,
    refreshing: vm.refreshing,
    error: vm.error,
    filter: vm.filter,
    setFilter: (f: NotificationFilter) => vm.setFilter(f),
    preferences: vm.preferences,
    isEmpty: vm.isEmpty,
    loadNotifications: () => vm.loadNotifications(),
    refresh: () => vm.refresh(),
    markAsRead: (item: NotificationItem) => vm.markAsRead(item),
    markAllAsRead: () => vm.markAllAsRead(),
    updatePreference: (cat: keyof NotificationPreferences, enabled: boolean) =>
      vm.updatePreference(cat, enabled),
    registerToken: (token: string, type?: string, devId?: string) =>
      vm.registerToken(token, type, devId),
    unregisterToken: (token: string) => vm.unregisterToken(token),
  };
}

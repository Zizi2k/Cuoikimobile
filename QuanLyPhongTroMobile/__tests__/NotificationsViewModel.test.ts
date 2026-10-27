import { NotificationsViewModel } from "../src/viewmodels/useNotificationsViewModel";
import { MockNotificationRepository } from "../src/repositories/MockNotificationRepository";

describe("NotificationsViewModel (MVVM Pattern)", () => {
  let mockRepo: MockNotificationRepository;
  let vm: NotificationsViewModel;

  beforeEach(() => {
    mockRepo = new MockNotificationRepository();
    vm = new NotificationsViewModel(mockRepo);
  });

  it("Test Case 1: Tải danh sách thông báo và kiểm tra số thông báo chưa đọc", async () => {
    await vm.loadNotifications();

    expect(vm.loading).toBe(false);
    expect(vm.error).toBeNull();
    expect(vm.notifications).toHaveLength(2);
    expect(vm.unreadCount).toBe(1);
    expect(vm.notifications[0].title).toBe("Hóa đơn tháng mới");
  });

  it("Test Case 2: Đánh dấu 1 thông báo là đã đọc (markAsRead) cập nhật unreadCount", async () => {
    await vm.loadNotifications();
    expect(vm.unreadCount).toBe(1);

    const target = vm.notifications[0]; // is_read = 0
    expect(target.is_read).toBe(0);

    const ok = await vm.markAsRead(target);
    expect(ok).toBe(true);
    expect(vm.notifications[0].is_read).toBe(1);
    expect(vm.unreadCount).toBe(0);
  });

  it("Test Case 3: Đánh dấu tất cả thông báo là đã đọc (markAllAsRead)", async () => {
    await vm.loadNotifications();
    expect(vm.unreadCount).toBe(1);

    const ok = await vm.markAllAsRead();
    expect(ok).toBe(true);
    expect(vm.unreadCount).toBe(0);
    expect(vm.notifications.every((n) => n.is_read === 1)).toBe(true);
  });

  it("Test Case 4: Lọc thông báo chưa đọc (filter = unread)", async () => {
    await vm.loadNotifications();

    vm.setFilter("unread");
    expect(vm.filteredNotifications).toHaveLength(1);
    expect(vm.filteredNotifications[0].id).toBe(1);

    vm.setFilter("all");
    expect(vm.filteredNotifications).toHaveLength(2);
  });

  it("Test Case 5: Tùy chọn thông báo (Notification Preferences) bật/tắt", async () => {
    await vm.loadPreferences();
    expect(vm.preferences.invoice).toBe(true);

    const ok = await vm.updatePreference("invoice", false);
    expect(ok).toBe(true);
    expect(vm.preferences.invoice).toBe(false);
  });
});

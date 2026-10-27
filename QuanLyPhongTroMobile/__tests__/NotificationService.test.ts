const factory = jest.fn();
function service(expoGo: boolean, native?: Record<string, unknown>) {
  jest.resetModules();
  jest.doMock("expo", () => ({ isRunningInExpoGo: () => expoGo }));
  jest.doMock("expo-constants", () => ({
    __esModule: true,
    default: { expoConfig: { extra: { eas: { projectId: "test-project" } } } },
  }));
  jest.doMock("expo-device", () => ({ isDevice: true }));
  jest.doMock("react-native", () => ({ Platform: { OS: "android" } }));
  jest.doMock("expo-notifications", () => factory());
  factory.mockImplementation(() => {
    if (native) return native;
    throw new Error("ExpoTopicSubscriptionModule missing");
  });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../src/services/notificationService") as typeof import("../src/services/notificationService");
}
beforeEach(() => factory.mockReset());
test("Expo Go never evaluates missing native notifications", async () => {
  const vm = service(true);
  expect(await vm.registerForPushNotificationsAsync()).toBeNull();
  await vm.subscribeToNotificationEvents(jest.fn(), jest.fn());
  expect(factory).not.toHaveBeenCalled();
});
test("old development client missing native modules does not crash routes", async () => {
  const vm = service(false);
  expect(await vm.registerForPushNotificationsAsync()).toBeNull();
  expect(
    await vm.scheduleLocalReminder({ title: "Test", body: "Test" }),
  ).toBeNull();
});
test("real token requested with projectId", async () => {
  const request = jest
    .fn()
    .mockResolvedValue({ data: "ExponentPushToken[device]" });
  const vm = service(false, {
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    AndroidImportance: { HIGH: 4 },
    getPermissionsAsync: async () => ({ status: "granted" }),
    getExpoPushTokenAsync: request,
  });
  expect(await vm.registerForPushNotificationsAsync()).toBe(
    "ExponentPushToken[device]",
  );
  expect(request).toHaveBeenCalledWith({ projectId: "test-project" });
});
test("cold-start consumes exact payload", async () => {
  const clear = jest.fn(),
    data = { reference_type: "invoice", reference_id: 9 };
  const vm = service(false, {
    setNotificationHandler: jest.fn(),
    getLastNotificationResponseAsync: async () => ({
      notification: { request: { content: { data } } },
    }),
    clearLastNotificationResponseAsync: clear,
  });
  expect(await vm.checkInitialNotification()).toEqual(data);
  expect(clear).toHaveBeenCalledTimes(1);
});
test("local reminder payload and native subscriptions clean up", async () => {
  const schedule = jest.fn().mockResolvedValue("local-1"),
    remove = jest.fn();
  const vm = service(false, {
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    AndroidImportance: { HIGH: 4 },
    getPermissionsAsync: async () => ({ status: "granted" }),
    SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
    scheduleNotificationAsync: schedule,
    addNotificationReceivedListener: () => ({ remove }),
    addNotificationResponseReceivedListener: () => ({ remove }),
    addPushTokenListener: () => ({ remove }),
  });
  expect(
    await vm.scheduleLocalReminder({
      title: "Invoice",
      body: "Pay",
      seconds: 60,
      data: { reference_type: "invoice", reference_id: 5 },
    }),
  ).toBe("local-1");
  expect(schedule.mock.calls[0][0].content.data.reference_id).toBe(5);
  const stop = await vm.subscribeToNotificationEvents(jest.fn(), jest.fn());
  stop();
  expect(remove).toHaveBeenCalledTimes(3);
});

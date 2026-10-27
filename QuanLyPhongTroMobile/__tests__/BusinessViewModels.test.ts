import { MaintenanceViewModel } from "../src/viewmodels/MaintenanceViewModel";
import { ResourceViewModel } from "../src/viewmodels/ResourceViewModel";
import { DetailViewModel } from "../src/viewmodels/DetailViewModel";
import { HomeViewModel } from "../src/viewmodels/HomeViewModel";
import { notificationTarget } from "../src/models/notificationTarget";
test("incident validation prevents empty requests, then uses selected realtime transport", async () => {
  const repo = {
    list: jest.fn().mockResolvedValue([]),
    find: jest.fn(),
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const vm = new MaintenanceViewModel(repo);
  expect(
    await vm.send({ title: "", description: "", priority: "medium" }),
  ).toBe(false);
  expect(repo.create).not.toHaveBeenCalled();
  expect(
    await vm.send({
      title: "Leak",
      description: "Bathroom pipe",
      priority: "high",
    }),
  ).toBe(true);
  expect(repo.create.mock.calls[0][1]).toBe(true);
  vm.setRealtime(false);
  await vm.update(3, { status: "completed", cost: 50 });
  expect(repo.update.mock.calls[0][2]).toBe(false);
});
test("incident errors stop loading and retain an actionable error", async () => {
  const vm = new MaintenanceViewModel({
    list: async () => {
      throw new Error("Offline");
    },
    find: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  });
  await vm.load();
  expect(vm.loading).toBe(false);
  expect(vm.error).toBe("Offline");
});
test("resource validation and CRUD use the same repository interface", async () => {
  const repo = {
    list: jest.fn().mockResolvedValue([{ id: 1, name: "Area" }]),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const vm = new ResourceViewModel("areas", repo);
  expect(await vm.save(null, { name: "Area" })).toBe(false);
  expect(repo.save).not.toHaveBeenCalled();
  expect(
    await vm.save(null, { name: "Area", area_code: "A1", address: "Dong Nai" }),
  ).toBe(true);
  expect(vm.items).toHaveLength(1);
  expect(await vm.remove(1)).toBe(true);
  expect(repo.remove).toHaveBeenCalledWith("areas", 1);
});
test("invoice detail validates payment and schedules an invoice-specific reminder", async () => {
  const repo = {
    find: jest.fn().mockResolvedValue({ id: 7, remaining_amount: 100 }),
    pay: jest.fn(),
    remind: jest.fn().mockResolvedValue("local-id"),
  };
  const vm = new DetailViewModel(7, repo);
  await vm.load();
  expect(await vm.pay("NaN")).toBe(false);
  expect(await vm.pay("101")).toBe(false);
  expect(repo.pay).not.toHaveBeenCalled();
  expect(await vm.pay("50")).toBe(true);
  expect(repo.pay).toHaveBeenCalledWith(7, 50);
  expect(await vm.remind()).toBe(true);
  expect(repo.remind).toHaveBeenCalledWith(7);
});
test("dashboard handles loading, errors and empty data", async () => {
  const vm = new HomeViewModel({
    dashboard: async () => {
      throw new Error("Network");
    },
  });
  await vm.load();
  expect(vm.loading).toBe(false);
  expect(vm.error).toBe("Network");
  expect(vm.data).toBeNull();
});
test("push payload routes to the exact record and rejects invalid identifiers", () => {
  expect(
    notificationTarget({ reference_type: "invoice", reference_id: "27" }),
  ).toEqual({ screen: "InvoiceDetail", id: 27 });
  expect(notificationTarget({ request_id: 4 })).toEqual({
    screen: "IncidentDetail",
    id: 4,
  });
  expect(
    notificationTarget({ reference_type: "invoice", reference_id: "bad" }),
  ).toBeNull();
});

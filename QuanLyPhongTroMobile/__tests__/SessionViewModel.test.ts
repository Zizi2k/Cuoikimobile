import { SessionViewModel } from "../src/viewmodels/SessionViewModel";
import { MockAuthRepository } from "../src/repositories/MockAuthRepository";
const settings = () => ({
  getBase: jest.fn().mockResolvedValue("http://localhost/api/"),
  saveBase: jest.fn().mockResolvedValue(undefined),
  health: jest.fn().mockResolvedValue(undefined),
});
test("login persists the session and a new VM restores it automatically", async () => {
  const repo = new MockAuthRepository();
  const vm = new SessionViewModel(repo, settings());
  expect(
    await vm.submit("login", { username: "admin", password: "private" }),
  ).toBe(true);
  expect(repo.savedToken).toBeTruthy();
  const restored = new SessionViewModel(repo, settings());
  await restored.restore();
  expect(restored.user?.role).toBe("admin");
  expect(restored.token).toBe(vm.token);
  expect(restored.restoring).toBe(false);
});
test("invalid saved session clears token and does not auto login", async () => {
  const repo = new MockAuthRepository();
  repo.savedToken = "expired";
  repo.savedUser = repo.mockUsers[0];
  const vm = new SessionViewModel(repo, settings());
  await vm.restore();
  expect(vm.token).toBeNull();
  expect(repo.savedToken).toBeNull();
});
test("network failure during restore preserves stored session for retry", async () => {
  const repo = new MockAuthRepository();
  repo.savedToken = "mock_token_1";
  repo.savedUser = repo.mockUsers[0];
  repo.verifySession = jest
    .fn()
    .mockRejectedValue(new Error("Network offline"));
  const vm = new SessionViewModel(repo, settings());
  await vm.restore();
  expect(repo.savedToken).toBeTruthy();
  expect(vm.error).toContain("offline");
  expect(vm.restoring).toBe(false);
});
test("logout unregisters device and clears both global and persisted state", async () => {
  const repo = new MockAuthRepository();
  const cleanup = jest.fn().mockResolvedValue(undefined);
  const vm = new SessionViewModel(repo, settings(), cleanup);
  await vm.submit("login", { username: "admin", password: "private" });
  await vm.logout();
  expect(cleanup).toHaveBeenCalled();
  expect(vm.user).toBeNull();
  expect(repo.savedToken).toBeNull();
});
test("validation failure does not call backend", async () => {
  const repo = new MockAuthRepository();
  const login = jest.spyOn(repo, "login");
  const vm = new SessionViewModel(repo, settings());
  expect(await vm.submit("login", { username: "", password: "" })).toBe(false);
  expect(login).not.toHaveBeenCalled();
});

import { User } from "../models/types";
import { IAuthRepository } from "../repositories/IAuthRepository";
import { ISettingsRepository } from "../repositories/ISettingsRepository";
import { ObservableModel } from "./ObservableModel";
export class SessionViewModel extends ObservableModel {
  private loggingOut = false;
  token: string | null = null;
  user: User | null = null;
  socketStatus = "disconnected";
  pushStatus = "";
  setSocketStatus(value: string): void {
    this.socketStatus = value;
    this.changed();
  }
  setPushStatus(value: string): void {
    this.pushStatus = value;
    this.changed();
  }
  restoring = true;
  busy = false;
  error = "";
  apiBase = "";
  connection = "";
  constructor(
    private auth: IAuthRepository,
    private settings: ISettingsRepository,
    private beforeLogout: () => Promise<void> = async () => {},
    private registerDevice: () => Promise<string> = async () =>
      "Chưa cấu hình thông báo.",
  ) {
    super();
  }
  async restore(): Promise<void> {
    this.restoring = true;
    this.error = "";
    this.changed();
    try {
      this.apiBase = await this.settings.getBase();
      const saved = await this.auth.getSavedSession();
      if (saved.token && saved.user) {
        if (await this.auth.verifySession(saved.token)) {
          this.token = saved.token;
          this.user = saved.user;
        } else {
          await this.auth.clearSession();
          this.token = null;
          this.user = null;
        }
      }
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : "Không khôi phục được phiên. Kiểm tra mạng rồi thử lại.";
    } finally {
      this.restoring = false;
      this.changed();
    }
  }
  async submit(
    mode: "login" | "register",
    values: {
      username: string;
      password: string;
      fullname?: string;
      phone?: string;
    },
  ): Promise<boolean> {
    if (this.busy) return false;
    if (
      !values.password.trim() ||
      (mode === "login"
        ? !values.username.trim()
        : !values.fullname?.trim() || !values.phone?.trim())
    ) {
      this.error = "Vui lòng nhập đầy đủ thông tin.";
      this.changed();
      return false;
    }
    this.busy = true;
    this.error = "";
    this.changed();
    try {
      const result =
        mode === "login"
          ? await this.auth.login(values.username.trim(), values.password)
          : await this.auth.register(
              values.fullname!.trim(),
              values.phone!.trim(),
              values.password,
            );
      this.token = result.token;
      this.user = result.user;
      return true;
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : "Không xác thực được tài khoản.";
      return false;
    } finally {
      this.busy = false;
      this.changed();
    }
  }
  async configure(base: string): Promise<void> {
    this.busy = true;
    this.error = "";
    this.connection = "";
    this.changed();
    try {
      if (this.token) await this.logout();
      await this.settings.saveBase(base);
      this.apiBase = await this.settings.getBase();
      await this.settings.health();
      this.connection = "API và database đang hoạt động.";
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Không kết nối được API.";
    } finally {
      this.busy = false;
      this.changed();
    }
  }
  async retryPush(): Promise<void> {
    this.pushStatus = await this.registerDevice();
    this.changed();
  }
  async logout(): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    try {
      await this.beforeLogout();
    } catch {
      /* Local logout must still complete if network is down. */
    }
    try {
      await this.auth.clearSession();
    } finally {
      this.token = null;
      this.user = null;
      this.error = "";
      this.loggingOut = false;
      this.changed();
    }
  }
}

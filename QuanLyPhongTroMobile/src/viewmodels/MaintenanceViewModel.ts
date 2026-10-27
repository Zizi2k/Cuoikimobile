import { ObservableModel } from "./ObservableModel";
import { IMaintenanceRepository } from "../repositories/IMaintenanceRepository";
import { MaintenanceRequest } from "../models/types";
export class MaintenanceViewModel extends ObservableModel {
  items: MaintenanceRequest[] = [];
  loading = false;
  busy = false;
  error = "";
  message = "";
  realtime = true;
  constructor(private repository: IMaintenanceRepository) {
    super();
  }
  setRealtime(value: boolean) {
    this.realtime = value;
    this.changed();
  }
  async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    this.changed();
    try {
      this.items = await this.repository.list();
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Không tải được sự cố.";
    } finally {
      this.loading = false;
      this.changed();
    }
  }
  async send(data: {
    title: string;
    description: string;
    priority: string;
  }): Promise<boolean> {
    if (!data.title.trim() || !data.description.trim()) {
      this.error = "Nhập tiêu đề và mô tả.";
      this.changed();
      return false;
    }
    return this.action(() => this.repository.create(data, this.realtime));
  }
  async update(id: number, data: Record<string, unknown>): Promise<boolean> {
    if (
      !["pending", "in_progress", "completed", "rejected"].includes(
        String(data.status),
      ) ||
      !Number.isFinite(Number(data.cost ?? 0)) ||
      Number(data.cost ?? 0) < 0
    ) {
      this.error = "Trạng thái hoặc chi phí không hợp lệ.";
      this.changed();
      return false;
    }
    return this.action(() => this.repository.update(id, data, this.realtime));
  }
  private async action(work: () => Promise<void>): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    this.error = "";
    this.message = "";
    this.changed();
    try {
      await work();
      await this.load();
      this.message = "Đã lưu. Người nhận được cập nhật tự động.";
      return true;
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Không lưu được dữ liệu.";
      return false;
    } finally {
      this.busy = false;
      this.changed();
    }
  }
}

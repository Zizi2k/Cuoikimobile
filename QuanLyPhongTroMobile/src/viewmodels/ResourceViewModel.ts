import { ObservableModel } from "./ObservableModel";
import { ResourceName, resources } from "../models/management";
import { IManagementRepository } from "../repositories/IManagementRepository";
export class ResourceViewModel extends ObservableModel {
  items: Record<string, any>[] = [];
  loading = false;
  busy = false;
  error = "";
  constructor(
    public resource: ResourceName,
    private repository: IManagementRepository,
  ) {
    super();
  }
  async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    this.changed();
    try {
      this.items = await this.repository.list(this.resource);
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Không tải được danh sách.";
    } finally {
      this.loading = false;
      this.changed();
    }
  }
  async save(
    id: number | null,
    values: Record<string, string>,
  ): Promise<boolean> {
    const data: Record<string, unknown> = {};
    for (const field of resources[this.resource].fields) {
      const value = values[field.key] ?? field.default ?? "";
      if (field.required && !value.trim()) {
        this.error = "Vui lòng nhập " + field.label;
        this.changed();
        return false;
      }
      if (
        field.numeric &&
        value &&
        (!Number.isFinite(Number(value)) || Number(value) < 0)
      ) {
        this.error = field.label + " phải là số không âm.";
        this.changed();
        return false;
      }
      if (value !== "") data[field.key] = field.numeric ? Number(value) : value;
    }
    return this.action(() => this.repository.save(this.resource, id, data));
  }
  async remove(id: number): Promise<boolean> {
    return this.action(() => this.repository.remove(this.resource, id));
  }
  private async action(work: () => Promise<void>): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    this.error = "";
    this.changed();
    try {
      await work();
      await this.load();
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Không lưu được dữ liệu.";
      return false;
    } finally {
      this.busy = false;
      this.changed();
    }
  }
}

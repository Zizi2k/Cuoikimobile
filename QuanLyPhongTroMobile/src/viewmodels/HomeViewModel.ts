import { ObservableModel } from "./ObservableModel";
import { IHomeRepository } from "../repositories/IHomeRepository";
export class HomeViewModel extends ObservableModel {
  data: Record<string, any> | null = null;
  loading = false;
  error = "";
  constructor(private repository: IHomeRepository) {
    super();
  }
  async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    this.changed();
    try {
      this.data = await this.repository.dashboard();
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Không tải được tổng quan.";
    } finally {
      this.loading = false;
      this.changed();
    }
  }
}

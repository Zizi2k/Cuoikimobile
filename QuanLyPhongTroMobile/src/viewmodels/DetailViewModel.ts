import { ObservableModel } from "./ObservableModel";
export interface IDetailRepository {
  find(id: number): Promise<Record<string, any>>;
  pay?(id: number, amount: number): Promise<void>;
  remind?(id: number): Promise<string | null>;
}
export class DetailViewModel extends ObservableModel {
  data: Record<string, any> | null = null;
  loading = false;
  busy = false;
  error = "";
  message = "";
  constructor(
    public id: number,
    private repository: IDetailRepository,
  ) {
    super();
  }
  async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    this.changed();
    try {
      this.data = await this.repository.find(this.id);
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Không tải được chi tiết.";
    } finally {
      this.loading = false;
      this.changed();
    }
  }
  async pay(value: string): Promise<boolean> {
    const amount = Number(value);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > Number(this.data?.remaining_amount)
    ) {
      this.error = "Số tiền phải lớn hơn 0 và không vượt số nợ.";
      this.changed();
      return false;
    }
    return this.action(async () => {
      if (!this.repository.pay) throw new Error("Không hỗ trợ thanh toán.");
      await this.repository.pay(this.id, amount);
      await this.load();
      this.message = "Đã ghi nhận thanh toán.";
    });
  }
  async remind(): Promise<boolean> {
    return this.action(async () => {
      const id = await this.repository.remind?.(this.id);
      if (!id) throw new Error("Cần development build có quyền thông báo.");
      this.message = "Đã lên lịch nhắc sau 60 giây.";
    });
  }
  private async action(fn: () => Promise<void>): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    this.error = "";
    this.changed();
    try {
      await fn();
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Thao tác thất bại.";
      return false;
    } finally {
      this.busy = false;
      this.changed();
    }
  }
}

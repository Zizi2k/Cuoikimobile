import { InvoicesViewModel } from "../src/viewmodels/useInvoicesViewModel";
import { MockInvoiceRepository } from "../src/repositories/MockInvoiceRepository";

describe("InvoicesViewModel (MVVM Pattern)", () => {
  let mockRepo: MockInvoiceRepository;
  let vm: InvoicesViewModel;

  beforeEach(() => {
    mockRepo = new MockInvoiceRepository();
    vm = new InvoicesViewModel(mockRepo);
  });

  it("Test Case 1: Tải danh sách hóa đơn thành công và tính tổng thanh toán", async () => {
    await vm.loadInvoices();

    expect(vm.loading).toBe(false);
    expect(vm.error).toBeNull();
    expect(vm.invoices).toHaveLength(2);
    expect(vm.summary.totalCount).toBe(2);
    expect(vm.summary.unpaidCount).toBe(1);
    expect(vm.summary.totalRevenue).toBe(3050000);
    expect(vm.summary.totalRemaining).toBe(3090000);
  });

  it("Test Case 2: Ghi nhận thanh toán hóa đơn và tự động cập nhật trạng thái đã thanh toán", async () => {
    await vm.loadInvoices();

    // Hóa đơn 1 đang có remaining_amount = 3090000, status = unpaid
    const targetInvoice = vm.invoices.find((i) => i.id === 1);
    expect(targetInvoice?.status).toBe("unpaid");

    const payRes = await vm.payInvoice(1, 3090000, "bank_transfer", "MB123456");
    expect(payRes.success).toBe(true);

    const updatedInvoice = vm.invoices.find((i) => i.id === 1);
    expect(updatedInvoice?.status).toBe("paid");
    expect(updatedInvoice?.remaining_amount).toBe(0);
    expect(updatedInvoice?.paid_amount).toBe(3090000);
    expect(vm.summary.unpaidCount).toBe(0);
  });

  it("Test Case 3: Xử lý lỗi khi lập hóa đơn thiếu thông tin bắt buộc", async () => {
    await vm.loadInvoices();

    // Thiếu contract_id và room_id
    const failRes = await vm.createInvoice({ billing_month: "2026-11" });
    expect(failRes.success).toBe(false);
    expect(failRes.message).toContain("chọn phòng/hợp đồng");

    // Thiếu billing_month
    const failRes2 = await vm.createInvoice({ contract_id: 1, room_id: 1 });
    expect(failRes2.success).toBe(false);
    expect(failRes2.message).toContain("kỳ thanh toán");
  });
});

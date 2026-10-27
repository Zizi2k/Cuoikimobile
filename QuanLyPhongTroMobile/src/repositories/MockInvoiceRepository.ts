import { IInvoiceRepository } from "./IInvoiceRepository";
import { Invoice } from "../models/types";

export class MockInvoiceRepository implements IInvoiceRepository {
  public invoices: Invoice[] = [
    {
      id: 1,
      invoice_code: "HDN-202610-001",
      billing_month: "2026-10",
      room_number: "Phòng 101",
      tenant_name: "Nguyễn Văn An",
      room_price: 2500000,
      electricity_amount: 350000,
      water_amount: 100000,
      service_amount: 140000,
      other_fees: 0,
      discount: 0,
      total_amount: 3090000,
      paid_amount: 0,
      remaining_amount: 3090000,
      due_date: "2026-10-30",
      status: "unpaid",
    },
    {
      id: 2,
      invoice_code: "HDN-202609-001",
      billing_month: "2026-09",
      room_number: "Phòng 101",
      tenant_name: "Nguyễn Văn An",
      room_price: 2500000,
      electricity_amount: 320000,
      water_amount: 90000,
      service_amount: 140000,
      other_fees: 0,
      discount: 0,
      total_amount: 3050000,
      paid_amount: 3050000,
      remaining_amount: 0,
      due_date: "2026-09-30",
      status: "paid",
    },
  ];

  public shouldFail = false;
  public errorMessage = "Lỗi máy chủ hóa đơn giả lập";

  async getInvoices(): Promise<Invoice[]> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    return [...this.invoices];
  }

  async getInvoiceById(id: number): Promise<Invoice | null> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    return this.invoices.find((i) => i.id === id) || null;
  }

  async createInvoice(invoiceData: Record<string, any>): Promise<{
    success: boolean;
    invoice_id?: number;
    invoice_code?: string;
    message?: string;
  }> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    const newId =
      this.invoices.length > 0
        ? Math.max(...this.invoices.map((i) => i.id)) + 1
        : 1;
    const invCode = `HDN-${Date.now().toString().slice(-6)}`;
    const total = Number(invoiceData.total_amount || 2500000);
    const newInv: Invoice = {
      id: newId,
      invoice_code: invCode,
      billing_month: invoiceData.billing_month || "2026-10",
      room_number: invoiceData.room_number || "Phòng 101",
      room_price: Number(invoiceData.room_price || 2500000),
      electricity_amount: Number(invoiceData.electricity_amount || 0),
      water_amount: Number(invoiceData.water_amount || 0),
      service_amount: Number(invoiceData.service_amount || 0),
      other_fees: Number(invoiceData.other_fees || 0),
      discount: Number(invoiceData.discount || 0),
      total_amount: total,
      paid_amount: 0,
      remaining_amount: total,
      due_date: invoiceData.due_date || "2026-10-31",
      status: "unpaid",
    };
    this.invoices.unshift(newInv);
    return {
      success: true,
      invoice_id: newId,
      invoice_code: invCode,
      message: "Lập hóa đơn thành công",
    };
  }

  async recordPayment(
    invoiceId: number,
    amount: number,
  ): Promise<{
    success: boolean;
    new_status?: string;
    remaining_amount?: number;
    message?: string;
  }> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, message: "Hóa đơn không tồn tại" };

    inv.paid_amount += amount;
    inv.remaining_amount = Math.max(0, inv.total_amount - inv.paid_amount);
    inv.status = inv.remaining_amount === 0 ? "paid" : "partially_paid";

    return {
      success: true,
      new_status: inv.status,
      remaining_amount: inv.remaining_amount,
      message: "Ghi nhận thanh toán thành công",
    };
  }
}

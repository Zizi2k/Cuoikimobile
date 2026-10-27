import { IInvoiceRepository } from "./IInvoiceRepository";
import { Invoice, ApiResponse } from "../models/types";
import { apiClient } from "../services/apiService";

export class ApiInvoiceRepository implements IInvoiceRepository {
  async getInvoices(): Promise<Invoice[]> {
    const res = await apiClient<ApiResponse<Invoice[]>>("invoices", "GET");
    return res.data || [];
  }

  async getInvoiceById(id: number): Promise<Invoice | null> {
    return (await apiClient(`invoices/${id}`)).data;
  }

  async createInvoice(invoiceData: Record<string, any>): Promise<{
    success: boolean;
    invoice_id?: number;
    invoice_code?: string;
    message?: string;
  }> {
    const res = await apiClient<ApiResponse>("invoices", "POST", invoiceData);
    return {
      success: res.success,
      invoice_id: res.invoice_id,
      invoice_code: res.invoice_code,
      message: res.message,
    };
  }

  async recordPayment(
    invoiceId: number,
    amount: number,
    paymentMethod = "cash",
    transactionRef = "",
    notes = "",
  ): Promise<{
    success: boolean;
    new_status?: string;
    remaining_amount?: number;
    message?: string;
  }> {
    const res = await apiClient<ApiResponse>("payments", "POST", {
      invoice_id: invoiceId,
      amount,
      payment_method: paymentMethod,
      transaction_ref: transactionRef,
      notes,
    });
    return {
      success: res.success,
      new_status: res.new_status,
      remaining_amount: res.remaining_amount,
      message: res.message,
    };
  }
}

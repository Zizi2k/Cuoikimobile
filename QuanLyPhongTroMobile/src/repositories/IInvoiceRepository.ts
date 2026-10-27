import { Invoice } from "../models/types";

export interface IInvoiceRepository {
  getInvoices(): Promise<Invoice[]>;
  getInvoiceById(id: number): Promise<Invoice | null>;
  createInvoice(
    invoiceData: Record<string, any>,
  ): Promise<{
    success: boolean;
    invoice_id?: number;
    invoice_code?: string;
    message?: string;
  }>;
  recordPayment(
    invoiceId: number,
    amount: number,
    paymentMethod?: string,
    transactionRef?: string,
    notes?: string,
  ): Promise<{
    success: boolean;
    new_status?: string;
    remaining_amount?: number;
    message?: string;
  }>;
}

import { useState, useEffect } from "react";
import { Invoice } from "../models/types";
import { IInvoiceRepository } from "../repositories/IInvoiceRepository";
import { ApiInvoiceRepository } from "../repositories/ApiInvoiceRepository";

const defaultRepo = new ApiInvoiceRepository();

export type InvoiceStatusFilter = "all" | "unpaid" | "partially_paid" | "paid";

export interface UseInvoicesViewModelOptions {
  repository?: IInvoiceRepository;
  autoLoad?: boolean;
}

/**
 * ViewModel Class for Invoices (MVVM Pattern)
 */
export class InvoicesViewModel {
  public repo: IInvoiceRepository;
  public invoices: Invoice[] = [];
  public loading: boolean = false;
  public refreshing: boolean = false;
  public actionLoading: boolean = false;
  public error: string | null = null;
  public statusFilter: InvoiceStatusFilter = "all";
  private listeners: Set<() => void> = new Set();

  constructor(repo?: IInvoiceRepository) {
    this.repo = repo || defaultRepo;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  get filteredInvoices(): Invoice[] {
    if (this.statusFilter === "all") return this.invoices;
    return this.invoices.filter((i) => i.status === this.statusFilter);
  }

  get summary() {
    const totalRevenue = this.invoices.reduce(
      (sum, i) => sum + (Number(i.paid_amount) || 0),
      0,
    );
    const totalRemaining = this.invoices.reduce(
      (sum, i) => sum + (Number(i.remaining_amount) || 0),
      0,
    );
    const unpaidCount = this.invoices.filter(
      (i) => i.status === "unpaid" || i.status === "partially_paid",
    ).length;
    return {
      totalRevenue,
      totalRemaining,
      unpaidCount,
      totalCount: this.invoices.length,
    };
  }

  get isEmpty(): boolean {
    return this.invoices.length === 0 && !this.loading;
  }

  public async loadInvoices(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.notify();
    try {
      this.invoices = await this.repo.getInvoices();
    } catch (err: any) {
      this.error = err.message || "Không thể tải danh sách hóa đơn";
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  public async refresh(): Promise<void> {
    this.refreshing = true;
    this.error = null;
    this.notify();
    try {
      this.invoices = await this.repo.getInvoices();
    } catch (err: any) {
      this.error = err.message || "Lỗi khi làm mới danh sách hóa đơn";
    } finally {
      this.refreshing = false;
      this.notify();
    }
  }

  public setStatusFilter(filter: InvoiceStatusFilter): void {
    this.statusFilter = filter;
    this.notify();
  }

  public async createInvoice(
    invoiceData: Record<string, any>,
  ): Promise<{ success: boolean; invoice_id?: number; message?: string }> {
    if (!invoiceData.contract_id && !invoiceData.room_id) {
      this.error = "Vui lòng chọn phòng/hợp đồng lập hóa đơn";
      this.notify();
      return {
        success: false,
        message: "Vui lòng chọn phòng/hợp đồng lập hóa đơn",
      };
    }
    if (!invoiceData.billing_month) {
      this.error = "Vui lòng chọn kỳ thanh toán";
      this.notify();
      return { success: false, message: "Vui lòng chọn kỳ thanh toán" };
    }

    this.actionLoading = true;
    this.error = null;
    this.notify();
    try {
      const res = await this.repo.createInvoice(invoiceData);
      if (res.success) {
        await this.refresh();
      }
      return res;
    } catch (err: any) {
      const msg = err.message || "Lỗi tạo hóa đơn";
      this.error = msg;
      return { success: false, message: msg };
    } finally {
      this.actionLoading = false;
      this.notify();
    }
  }

  public async payInvoice(
    invoiceId: number,
    amount: number,
    paymentMethod = "cash",
    transactionRef = "",
    notes = "",
  ): Promise<{ success: boolean; message?: string }> {
    if (amount <= 0) {
      return { success: false, message: "Số tiền thanh toán phải lớn hơn 0" };
    }

    this.actionLoading = true;
    this.error = null;
    this.notify();
    try {
      const res = await this.repo.recordPayment(
        invoiceId,
        amount,
        paymentMethod,
        transactionRef,
        notes,
      );
      if (res.success) {
        await this.refresh();
      }
      return res;
    } catch (err: any) {
      const msg = err.message || "Lỗi ghi nhận thanh toán";
      this.error = msg;
      return { success: false, message: msg };
    } finally {
      this.actionLoading = false;
      this.notify();
    }
  }
}

/**
 * Custom hook wrapping InvoicesViewModel for React Native components.
 */
export function useInvoicesViewModel(options?: UseInvoicesViewModelOptions) {
  const [vm] = useState(() => new InvoicesViewModel(options?.repository));
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = vm.subscribe(() => setTick((t) => t + 1));
    if (options?.autoLoad ?? true) {
      vm.loadInvoices();
    }
    return unsub;
  }, [vm, options?.autoLoad]);

  return {
    invoices: vm.invoices,
    filteredInvoices: vm.filteredInvoices,
    statusFilter: vm.statusFilter,
    setStatusFilter: (f: InvoiceStatusFilter) => vm.setStatusFilter(f),
    loading: vm.loading,
    refreshing: vm.refreshing,
    actionLoading: vm.actionLoading,
    error: vm.error,
    summary: vm.summary,
    isEmpty: vm.isEmpty,
    loadInvoices: () => vm.loadInvoices(),
    refresh: () => vm.refresh(),
    createInvoice: (data: Record<string, any>) => vm.createInvoice(data),
    payInvoice: (
      id: number,
      amount: number,
      method?: string,
      ref?: string,
      notes?: string,
    ) => vm.payInvoice(id, amount, method, ref, notes),
  };
}

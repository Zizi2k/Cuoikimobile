import { useState, useEffect } from "react";
import { Room } from "../models/types";
import { IRoomRepository } from "../repositories/IRoomRepository";
import { ApiRoomRepository } from "../repositories/ApiRoomRepository";

const defaultRepo = new ApiRoomRepository();

export type RoomStatusFilter = "all" | "rented" | "empty" | "maintenance";

export interface UseRoomsViewModelOptions {
  repository?: IRoomRepository;
  autoLoad?: boolean;
}

/**
 * ViewModel Class for Rooms (MVVM Pattern)
 * Encapsulates state and business logic independently of UI.
 */
export class RoomsViewModel {
  public repo: IRoomRepository;
  public rooms: Room[] = [];
  public loading: boolean = false;
  public refreshing: boolean = false;
  public actionLoading: boolean = false;
  public error: string | null = null;
  public statusFilter: RoomStatusFilter = "all";
  private listeners: Set<() => void> = new Set();

  constructor(repo?: IRoomRepository) {
    this.repo = repo || defaultRepo;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  get filteredRooms(): Room[] {
    if (this.statusFilter === "all") return this.rooms;
    return this.rooms.filter((r) => r.status === this.statusFilter);
  }

  get stats() {
    return {
      total: this.rooms.length,
      rented: this.rooms.filter((r) => r.status === "rented").length,
      empty: this.rooms.filter((r) => r.status === "empty").length,
      maintenance: this.rooms.filter((r) => r.status === "maintenance").length,
    };
  }

  get isEmpty(): boolean {
    return this.rooms.length === 0 && !this.loading;
  }

  public async loadRooms(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.notify();
    try {
      this.rooms = await this.repo.getRooms();
    } catch (err: any) {
      this.error = err.message || "Không thể tải danh sách phòng trọ";
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
      this.rooms = await this.repo.getRooms();
    } catch (err: any) {
      this.error = err.message || "Lỗi khi làm mới dữ liệu";
    } finally {
      this.refreshing = false;
      this.notify();
    }
  }

  public setStatusFilter(filter: RoomStatusFilter): void {
    this.statusFilter = filter;
    this.notify();
  }

  public async addRoom(
    roomData: Partial<Room>,
  ): Promise<{ success: boolean; message?: string }> {
    if (!roomData.room_number?.trim()) {
      return { success: false, message: "Số phòng không được để trống" };
    }
    if (!roomData.price || roomData.price <= 0) {
      return { success: false, message: "Giá thuê phải lớn hơn 0 VNĐ" };
    }

    this.actionLoading = true;
    this.error = null;
    this.notify();
    try {
      const res = await this.repo.createRoom(roomData);
      if (res.success) {
        await this.refresh();
      }
      return res;
    } catch (err: any) {
      const msg = err.message || "Lỗi tạo phòng";
      this.error = msg;
      return { success: false, message: msg };
    } finally {
      this.actionLoading = false;
      this.notify();
    }
  }

  public async editRoom(
    id: number,
    roomData: Partial<Room>,
  ): Promise<{ success: boolean; message?: string }> {
    if (
      !roomData.room_number?.trim() ||
      !Number.isFinite(Number(roomData.price)) ||
      Number(roomData.price) <= 0
    ) {
      this.error = "Tên phòng và giá thuê không hợp lệ.";
      this.notify();
      return { success: false, message: this.error };
    }
    this.actionLoading = true;
    this.error = null;
    this.notify();
    try {
      const res = await this.repo.updateRoom(id, roomData);
      if (res.success) {
        await this.refresh();
      }
      return res;
    } catch (err: any) {
      const msg = err.message || "Lỗi cập nhật phòng";
      this.error = msg;
      return { success: false, message: msg };
    } finally {
      this.actionLoading = false;
      this.notify();
    }
  }

  public async removeRoom(
    id: number,
  ): Promise<{ success: boolean; message?: string }> {
    this.actionLoading = true;
    this.error = null;
    this.notify();
    try {
      const res = await this.repo.deleteRoom(id);
      if (res.success) {
        this.rooms = this.rooms.filter((r) => r.id !== id);
      }
      return res;
    } catch (err: any) {
      const msg = err.message || "Lỗi xóa phòng";
      this.error = msg;
      return { success: false, message: msg };
    } finally {
      this.actionLoading = false;
      this.notify();
    }
  }
}

/**
 * Custom hook wrapping RoomsViewModel for React Native components.
 */
export function useRoomsViewModel(options?: UseRoomsViewModelOptions) {
  const [vm] = useState(() => new RoomsViewModel(options?.repository));
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = vm.subscribe(() => setTick((t) => t + 1));
    if (options?.autoLoad ?? true) {
      vm.loadRooms();
    }
    return unsub;
  }, [vm, options?.autoLoad]);

  return {
    rooms: vm.rooms,
    filteredRooms: vm.filteredRooms,
    statusFilter: vm.statusFilter,
    setStatusFilter: (f: RoomStatusFilter) => vm.setStatusFilter(f),
    loading: vm.loading,
    refreshing: vm.refreshing,
    actionLoading: vm.actionLoading,
    error: vm.error,
    stats: vm.stats,
    isEmpty: vm.isEmpty,
    loadRooms: () => vm.loadRooms(),
    refresh: () => vm.refresh(),
    addRoom: (data: Partial<Room>) => vm.addRoom(data),
    editRoom: (id: number, data: Partial<Room>) => vm.editRoom(id, data),
    removeRoom: (id: number) => vm.removeRoom(id),
  };
}

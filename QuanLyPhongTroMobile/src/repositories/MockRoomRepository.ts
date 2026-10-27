import { IRoomRepository } from "./IRoomRepository";
import { Room } from "../models/types";

export class MockRoomRepository implements IRoomRepository {
  public rooms: Room[] = [
    {
      id: 1,
      room_code: "P101",
      room_number: "Phòng 101",
      area_id: 1,
      area_name: "Khu A",
      area_size: 25,
      price: 2500000,
      deposit: 2500000,
      status: "rented",
      current_tenant_name: "Nguyễn Văn An",
      current_tenant_phone: "0912345678",
    },
    {
      id: 2,
      room_code: "P102",
      room_number: "Phòng 102",
      area_id: 1,
      area_name: "Khu A",
      area_size: 28,
      price: 2800000,
      deposit: 2800000,
      status: "empty",
      description: "Phòng có ban công thoáng mát",
    },
    {
      id: 3,
      room_code: "P103",
      room_number: "Phòng 103",
      area_id: 1,
      area_name: "Khu A",
      area_size: 22,
      price: 2200000,
      deposit: 2200000,
      status: "maintenance",
      description: "Đang sơn sửa lại tường",
    },
  ];

  public shouldFail = false;
  public errorMessage = "Lỗi kết nối máy chủ giả lập";

  async getRooms(): Promise<Room[]> {
    if (this.shouldFail) {
      throw new Error(this.errorMessage);
    }
    return [...this.rooms];
  }

  async getRoomById(id: number): Promise<Room | null> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    return this.rooms.find((r) => r.id === id) || null;
  }

  async createRoom(
    roomData: Partial<Room>,
  ): Promise<{ success: boolean; room_id?: number; message?: string }> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    const newId =
      this.rooms.length > 0 ? Math.max(...this.rooms.map((r) => r.id)) + 1 : 1;
    const newRoom: Room = {
      id: newId,
      room_code: roomData.room_code || `P${newId}`,
      room_number: roomData.room_number || `Phòng ${newId}`,
      area_size: roomData.area_size || 25,
      price: roomData.price || 2500000,
      status: (roomData.status as any) || "empty",
      description: roomData.description || "",
    };
    this.rooms.push(newRoom);
    return { success: true, room_id: newId, message: "Tạo phòng thành công" };
  }

  async updateRoom(
    id: number,
    roomData: Partial<Room>,
  ): Promise<{ success: boolean; message?: string }> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    const idx = this.rooms.findIndex((r) => r.id === id);
    if (idx === -1) {
      return { success: false, message: "Phòng không tồn tại" };
    }
    this.rooms[idx] = { ...this.rooms[idx], ...roomData };
    return { success: true, message: "Cập nhật phòng thành công" };
  }

  async deleteRoom(
    id: number,
  ): Promise<{ success: boolean; message?: string }> {
    if (this.shouldFail) throw new Error(this.errorMessage);
    const idx = this.rooms.findIndex((r) => r.id === id);
    if (idx === -1) {
      return { success: false, message: "Phòng không tồn tại" };
    }
    this.rooms.splice(idx, 1);
    return { success: true, message: "Xóa phòng thành công" };
  }
}

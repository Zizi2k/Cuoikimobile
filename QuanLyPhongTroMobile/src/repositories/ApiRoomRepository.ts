import { IRoomRepository } from "./IRoomRepository";
import { Room, ApiResponse } from "../models/types";
import { apiClient } from "../services/apiService";

export class ApiRoomRepository implements IRoomRepository {
  async getRooms(): Promise<Room[]> {
    const res = await apiClient<ApiResponse<Room[]>>("rooms", "GET");
    return res.data || [];
  }

  async getRoomById(id: number): Promise<Room | null> {
    const rooms = await this.getRooms();
    return rooms.find((r) => r.id === id) || null;
  }

  async createRoom(
    roomData: Partial<Room>,
  ): Promise<{ success: boolean; room_id?: number; message?: string }> {
    const res = await apiClient<ApiResponse>("rooms", "POST", roomData);
    return {
      success: res.success,
      room_id: res.room_id,
      message: res.message,
    };
  }

  async updateRoom(
    id: number,
    roomData: Partial<Room>,
  ): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient<ApiResponse>(
      `rooms/update/${id}`,
      "POST",
      roomData,
    );
    return {
      success: res.success,
      message: res.message,
    };
  }

  async deleteRoom(
    id: number,
  ): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient<ApiResponse>(`rooms/delete/${id}`, "POST", {
      id,
    });
    return {
      success: res.success,
      message: res.message,
    };
  }
}

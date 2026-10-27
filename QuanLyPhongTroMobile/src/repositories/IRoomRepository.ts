import { Room } from "../models/types";

export interface IRoomRepository {
  getRooms(): Promise<Room[]>;
  getRoomById(id: number): Promise<Room | null>;
  createRoom(
    roomData: Partial<Room>,
  ): Promise<{ success: boolean; room_id?: number; message?: string }>;
  updateRoom(
    id: number,
    roomData: Partial<Room>,
  ): Promise<{ success: boolean; message?: string }>;
  deleteRoom(id: number): Promise<{ success: boolean; message?: string }>;
}

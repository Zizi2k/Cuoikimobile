import { MaintenanceRequest } from "../models/types";
export interface IMaintenanceRepository {
  list(): Promise<MaintenanceRequest[]>;
  find(id: number): Promise<MaintenanceRequest>;
  create(data: Record<string, unknown>, realtime: boolean): Promise<void>;
  update(
    id: number,
    data: Record<string, unknown>,
    realtime: boolean,
  ): Promise<void>;
  remove(id: number, realtime: boolean): Promise<void>;
}

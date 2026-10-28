import { IMaintenanceRepository } from "./IMaintenanceRepository";
import { MaintenanceRequest } from "../models/types";
import { apiClient } from "../services/apiService";
import { socketCommand } from "../services/socketService";
export class ApiMaintenanceRepository implements IMaintenanceRepository {
  async list(): Promise<MaintenanceRequest[]> {
    return (await apiClient("maintenance")).data;
  }
  async find(id: number): Promise<MaintenanceRequest> {
    return (await apiClient(`maintenance/${id}`)).data;
  }
  async create(
    data: Record<string, unknown>,
    realtime: boolean,
  ): Promise<void> {
    if (realtime) await socketCommand("incident:create", data);
    else await apiClient("maintenance", "POST", data);
  }
  async update(
    id: number,
    data: Record<string, unknown>,
    realtime: boolean,
  ): Promise<void> {
    if (realtime) await socketCommand("incident:updateStatus", { ...data, id });
    else await apiClient("maintenance/update", "POST", { ...data, id });
  }

  async remove(id: number, realtime: boolean): Promise<void> {
    if (realtime) {
      try {
        await socketCommand("incident:delete", { id });
        return;
      } catch (error) {
        await apiClient(`maintenance/delete/${id}`, "POST");
        return;
      }
    }
    await apiClient(`maintenance/delete/${id}`, "POST");
  }
}

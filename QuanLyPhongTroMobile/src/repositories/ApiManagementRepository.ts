import { ResourceName } from "../models/management";
import { IManagementRepository } from "./IManagementRepository";
import { apiClient } from "../services/apiService";
export class ApiManagementRepository implements IManagementRepository {
  async list(resource: ResourceName): Promise<Record<string, any>[]> {
    return (await apiClient(`manage/${resource}`)).data;
  }
  async save(
    resource: ResourceName,
    id: number | null,
    data: Record<string, unknown>,
  ): Promise<void> {
    await apiClient(
      `manage/${resource}${id ? "/" + id : ""}`,
      id ? "PUT" : "POST",
      data,
    );
  }
  async remove(resource: ResourceName, id: number): Promise<void> {
    await apiClient(`manage/${resource}/${id}`, "DELETE");
  }
}

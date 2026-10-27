import { ResourceName } from "../models/management";
export interface IManagementRepository {
  list(resource: ResourceName): Promise<Record<string, any>[]>;
  save(
    resource: ResourceName,
    id: number | null,
    data: Record<string, unknown>,
  ): Promise<void>;
  remove(resource: ResourceName, id: number): Promise<void>;
}

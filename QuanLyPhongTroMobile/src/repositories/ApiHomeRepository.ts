import { IHomeRepository } from "./IHomeRepository";
import { apiClient } from "../services/apiService";
export class ApiHomeRepository implements IHomeRepository {
  dashboard = () => apiClient<Record<string, any>>("dashboard");
}

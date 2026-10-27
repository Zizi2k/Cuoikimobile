import { ISettingsRepository } from "./ISettingsRepository";
import {
  apiClient,
  getSavedApiBase,
  setSavedApiBase,
} from "../services/apiService";
export class ApiSettingsRepository implements ISettingsRepository {
  getBase = getSavedApiBase;
  saveBase = setSavedApiBase;
  async health(): Promise<void> {
    await apiClient("health", "GET", undefined, "");
  }
}

export interface ISettingsRepository {
  getBase(): Promise<string>;
  saveBase(value: string): Promise<void>;
  health(): Promise<void>;
}

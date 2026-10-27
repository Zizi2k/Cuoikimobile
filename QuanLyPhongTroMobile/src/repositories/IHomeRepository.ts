export interface IHomeRepository {
  dashboard(): Promise<Record<string, any>>;
}

export class ObservableModel {
  private listeners = new Set<() => void>();
  private version = 0;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = (): number => this.version;
  protected changed(): void {
    this.version++;
    this.listeners.forEach((listener) => listener());
  }
}

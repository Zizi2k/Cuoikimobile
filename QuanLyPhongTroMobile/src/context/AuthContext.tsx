import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { SessionViewModel } from "../viewmodels/SessionViewModel";
import { ApiAuthRepository } from "../repositories/ApiAuthRepository";
import { ApiSettingsRepository } from "../repositories/ApiSettingsRepository";
import { onEvent, emitEvent } from "../services/events";
import {
  registerDevice,
  startRuntime,
  unregisterDevice,
} from "../services/runtimeService";
import { onSocketStatusChange } from "../services/socketService";
import {
  checkInitialNotification,
  subscribeToNotificationEvents,
} from "../services/notificationService";
import {
  clearPendingNotification,
  queueNotification,
} from "../navigation/notificationRouting";
import { AppState } from "react-native";
const Context = createContext<SessionViewModel | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [model] = useState(
    () =>
      new SessionViewModel(
        new ApiAuthRepository(),
        new ApiSettingsRepository(),
        async () => {
          clearPendingNotification();
          await unregisterDevice();
        },
        registerDevice,
      ),
  );
  useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    void model.restore();
    return onEvent("unauthorized", () => {
      void model.logout();
    });
  }, [model]);
  useEffect(() => {
    let active = true;
    let cleanup = () => {};
    subscribeToNotificationEvents(() => emitEvent("data"), queueNotification)
      .then((off) => {
        if (active) cleanup = off;
        else off();
      })
      .catch(() => {});
    checkInitialNotification()
      .then((data) => {
        if (active && data) queueNotification(data);
      })
      .catch(() => {});
    return () => {
      active = false;
      cleanup();
    };
  }, []);
  useEffect(() => {
    if (!model.token || !model.apiBase) return;
    let active = true;
    const stop = startRuntime(model.apiBase, model.token);
    const off = onSocketStatusChange((value) => model.setSocketStatus(value));
    const register = () => {
      void registerDevice().then((message) => {
        if (active) model.setPushStatus(message);
      });
    };
    register();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        emitEvent("data");
        register();
      }
    });
    return () => {
      active = false;
      appState.remove();
      off();
      stop();
    };
  }, [model, model.token, model.apiBase]);
  return <Context.Provider value={model}>{children}</Context.Provider>;
}
export function useSession(): SessionViewModel {
  const model = useContext(Context);
  if (!model) throw new Error("AuthProvider is required");
  useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  return model;
}

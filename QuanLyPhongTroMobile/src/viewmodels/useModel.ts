import { useCallback, useEffect, useReducer, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { onEvent } from "../services/events";
export function useModel<T extends { subscribe(fn: () => void): () => void }>(
  create: () => T,
  load: (model: T) => Promise<unknown>,
): T {
  const [model] = useState(create);
  const [, render] = useReducer((n: number) => n + 1, 0);
  useEffect(() => model.subscribe(render), [model]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const refresh = () => {
        if (active) void load(model);
      };
      refresh();
      const off = onEvent("data", refresh);
      return () => {
        active = false;
        off();
      };
      // load is a module-level function at each call site; model owns the request state.
    }, [model, load]),
  );
  return model;
}

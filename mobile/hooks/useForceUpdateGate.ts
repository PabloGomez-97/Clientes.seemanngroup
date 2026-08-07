import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  checkForceUpdateRequirement,
  type ForceUpdateRequirement,
} from "../services/appVersionApi";

type ForceUpdateGateState = {
  checking: boolean;
  requirement: ForceUpdateRequirement | null;
  recheck: () => void;
};

export function useForceUpdateGate(): ForceUpdateGateState {
  const [checking, setChecking] = useState(true);
  const [requirement, setRequirement] =
    useState<ForceUpdateRequirement | null>(null);

  const runCheck = useCallback(async (signal?: AbortSignal) => {
    const result = await checkForceUpdateRequirement(signal);
    if (signal?.aborted) return;
    setRequirement(result);
    setChecking(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    void runCheck(controller.signal);
    return () => controller.abort();
  }, [runCheck]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === "active") {
        void runCheck();
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [runCheck]);

  return {
    checking,
    requirement,
    recheck: () => {
      void runCheck();
    },
  };
}

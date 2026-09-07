"use client";

// Cross-page demo state. Small surface, so React Context + useReducer only.
// Holds non-persistent overrides for demo interactions (approving/rejecting a
// decision). Nothing here is written to a backend — it resets on reload.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { DecisionStatus } from "@/lib/types";

interface DemoState {
  // decisionId -> locally-overridden status
  decisionStatus: Record<string, DecisionStatus>;
}

type Action =
  | { type: "SET_DECISION_STATUS"; id: string; status: DecisionStatus }
  | { type: "RESET" };

const initialState: DemoState = {
  decisionStatus: {},
};

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "SET_DECISION_STATUS":
      return {
        ...state,
        decisionStatus: { ...state.decisionStatus, [action.id]: action.status },
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

interface DemoContextValue {
  getDecisionStatus: (id: string, fallback: DecisionStatus) => DecisionStatus;
  setDecisionStatus: (id: string, status: DecisionStatus) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const getDecisionStatus = useCallback(
    (id: string, fallback: DecisionStatus): DecisionStatus =>
      state.decisionStatus[id] ?? fallback,
    [state.decisionStatus],
  );

  const setDecisionStatus = useCallback((id: string, status: DecisionStatus) => {
    dispatch({ type: "SET_DECISION_STATUS", id, status });
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({ getDecisionStatus, setDecisionStatus }),
    [getDecisionStatus, setDecisionStatus],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoState(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemoState must be used within a DemoStateProvider");
  }
  return ctx;
}

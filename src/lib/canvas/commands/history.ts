// Undo/redo history manager — pure functions only, no side effects.
import type { CanvasDocument, Command, HistoryState } from "../document/types";
import { MAX_HISTORY } from "../document/types";

export function makeHistory(initial: CanvasDocument): HistoryState {
  return { past: [], present: initial, future: [] };
}

export function applyCommand(
  state: HistoryState,
  command: Command
): HistoryState {
  const next = command.execute(state.present);
  return {
    past: [...state.past, state.present].slice(-MAX_HISTORY),
    present: next,
    future: [], // clear redo stack on new action
  };
}

export function undo(state: HistoryState): HistoryState {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redo(state: HistoryState): HistoryState {
  if (state.future.length === 0) return state;
  const next = state.future[0];
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  };
}

export function canUndo(state: HistoryState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: HistoryState): boolean {
  return state.future.length > 0;
}

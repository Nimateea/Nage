import { create } from "zustand";
import type {
  CanvasDocument,
  Camera,
  Command,
  HistoryState,
} from "../document/types";
import { makeEmptyDocument } from "../document/defaults";
import {
  makeHistory,
  applyCommand,
  undo as historyUndo,
  redo as historyRedo,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
} from "../commands/history";
import type { Rect } from "../renderer/IRenderer";

export type ToolType =
  | "select"
  | "hand"
  | "frame"
  | "rectangle"
  | "ellipse"
  | "line"
  | "text"
  | "image";

export interface EditorState {
  // Document & History
  projectId: string;
  projectName: string;
  document: CanvasDocument;
  history: HistoryState;

  // Interaction State
  activeTool: ToolType;
  selectedIds: Set<string>;
  hoveredId: string | null;
  dragPreview: Rect | null;
  isPanning: boolean;

  // UI Modals & Toast
  shortcutsModalOpen: boolean;
  illustrationModalOpen: boolean;
  layersPanelOpen: boolean;
  toastMessage: string | null;

  // Actions
  initEditor: (projectId: string, projectName: string, doc?: CanvasDocument) => void;
  setProjectName: (name: string) => void;
  setActiveTool: (tool: ToolType) => void;
  setHoveredId: (id: string | null) => void;
  setSelectedIds: (ids: string[] | Set<string>) => void;
  toggleSelectId: (id: string) => void;
  clearSelection: () => void;
  setDragPreview: (rect: Rect | null) => void;
  setIsPanning: (isPanning: boolean) => void;
  toggleLayersPanel: () => void;
  setLayersPanelOpen: (open: boolean) => void;

  // Camera & Navigation
  panBy: (dx: number, dy: number) => void;
  zoomAt: (
    screenX: number,
    screenY: number,
    factor: number,
    viewWidth: number,
    viewHeight: number
  ) => void;
  zoomTo: (zoom: number) => void;
  centerView: () => void;

  // History / Command execution
  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Modal / Toast actions
  openShortcutsModal: () => void;
  openIllustrationModal: () => void;
  closeModals: () => void;
  showToast: (msg: string) => void;
  hideToast: () => void;
}

const initialDoc = makeEmptyDocument();

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: "",
  projectName: "Untitled",
  document: initialDoc,
  history: makeHistory(initialDoc),

  activeTool: "select",
  selectedIds: new Set<string>(),
  hoveredId: null,
  dragPreview: null,
  isPanning: false,

  shortcutsModalOpen: false,
  illustrationModalOpen: false,
  layersPanelOpen: true,
  toastMessage: null,

  initEditor: (projectId, projectName, doc) => {
    const document = doc || makeEmptyDocument();
    set({
      projectId,
      projectName,
      document,
      history: makeHistory(document),
      selectedIds: new Set<string>(),
      hoveredId: null,
      dragPreview: null,
      isPanning: false,
      layersPanelOpen: true,
    });
  },

  setProjectName: (projectName) => set({ projectName }),

  setActiveTool: (activeTool) => {
    // If switching to hand, clear selection
    if (activeTool === "hand") {
      set({ activeTool, selectedIds: new Set() });
    } else {
      set({ activeTool });
    }
  },

  setHoveredId: (hoveredId) => set({ hoveredId }),

  setSelectedIds: (ids) => {
    const next = ids instanceof Set ? ids : new Set(ids);
    set({ selectedIds: next });
  },

  toggleSelectId: (id) => {
    const current = new Set(get().selectedIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    set({ selectedIds: current });
  },

  clearSelection: () => set({ selectedIds: new Set<string>() }),

  setDragPreview: (dragPreview) => set({ dragPreview }),

  setIsPanning: (isPanning) => set({ isPanning }),

  panBy: (dx, dy) => {
    const doc = get().document;
    const nextCamera: Camera = {
      ...doc.camera,
      x: doc.camera.x + dx,
      y: doc.camera.y + dy,
    };
    set({
      document: {
        ...doc,
        camera: nextCamera,
      },
    });
  },

  zoomAt: (screenX, screenY, factor, viewWidth, viewHeight) => {
    const doc = get().document;
    const currentZoom = doc.camera.zoom;
    const nextZoom = Math.min(8.0, Math.max(0.1, currentZoom * factor));
    if (Math.abs(nextZoom - currentZoom) < 0.0001) return;

    const cx = viewWidth / 2;
    const cy = viewHeight / 2;

    // World coordinate under mouse cursor
    const wx = (screenX - cx - doc.camera.x) / currentZoom;
    const wy = (screenY - cy - doc.camera.y) / currentZoom;

    // Adjust camera so world coordinate remains under mouse cursor
    const nextX = screenX - cx - wx * nextZoom;
    const nextY = screenY - cy - wy * nextZoom;

    set({
      document: {
        ...doc,
        camera: {
          x: nextX,
          y: nextY,
          zoom: nextZoom,
        },
      },
    });
  },

  zoomTo: (zoom) => {
    const clampedZoom = Math.min(8.0, Math.max(0.1, zoom));
    const doc = get().document;
    set({
      document: {
        ...doc,
        camera: {
          ...doc.camera,
          zoom: clampedZoom,
        },
      },
    });
  },

  centerView: () => {
    const doc = get().document;
    set({
      document: {
        ...doc,
        camera: {
          x: 0,
          y: 0,
          zoom: 1,
        },
      },
    });
    get().showToast("View centered");
  },

  executeCommand: (command) => {
    const state = get();
    const nextHistory = applyCommand(state.history, command);
    set({
      history: nextHistory,
      document: nextHistory.present,
    });
  },

  undo: () => {
    const state = get();
    if (!historyCanUndo(state.history)) return;
    const nextHistory = historyUndo(state.history);
    set({
      history: nextHistory,
      document: nextHistory.present,
    });
  },

  redo: () => {
    const state = get();
    if (!historyCanRedo(state.history)) return;
    const nextHistory = historyRedo(state.history);
    set({
      history: nextHistory,
      document: nextHistory.present,
    });
  },

  canUndo: () => historyCanUndo(get().history),
  canRedo: () => historyCanRedo(get().history),

  openShortcutsModal: () => set({ shortcutsModalOpen: true }),
  openIllustrationModal: () => set({ illustrationModalOpen: true }),
  closeModals: () => set({ shortcutsModalOpen: false, illustrationModalOpen: false }),

  toggleLayersPanel: () => set((state) => ({ layersPanelOpen: !state.layersPanelOpen })),
  setLayersPanelOpen: (open) => set({ layersPanelOpen: open }),

  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 2200);
  },

  hideToast: () => set({ toastMessage: null }),
}));

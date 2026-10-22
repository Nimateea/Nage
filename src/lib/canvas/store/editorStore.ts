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

export interface RemoteCursor {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  lastSeen: number;
}

export type LeftSidebarTab = "layers" | "pages" | "ai";

export interface PageItem {
  id: string;
  name: string;
}

export interface EditorState {
  // Document & History
  projectId: string;
  projectName: string;
  document: CanvasDocument;
  history: HistoryState;

  // Auto-Save & Persistence
  saveStatus: "saved" | "saving" | "unsaved" | "error";
  lastSavedAt: number | null;

  // Pages & Left Sidebar
  layersPanelTab: LeftSidebarTab;
  pages: PageItem[];
  currentPageId: string;

  // Interaction State
  activeTool: ToolType;
  selectedIds: Set<string>;
  hoveredId: string | null;
  dragPreview: Rect | null;
  isPanning: boolean;
  remoteCursors: Record<string, RemoteCursor>;

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
  setLayersPanelTab: (tab: LeftSidebarTab) => void;
  addPage: (name?: string) => void;
  renamePage: (id: string, name: string) => void;
  deletePage: (id: string) => void;
  setCurrentPageId: (id: string) => void;
  setSaveStatus: (status: "saved" | "saving" | "unsaved" | "error") => void;
  setRemoteCursor: (id: string, cursor: RemoteCursor) => void;
  removeRemoteCursor: (id: string) => void;

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

  saveStatus: "saved",
  lastSavedAt: null,

  layersPanelTab: "layers",
  pages: [{ id: "page-1", name: "Page 1" }],
  currentPageId: "page-1",

  activeTool: "select",
  selectedIds: new Set<string>(),
  hoveredId: null,
  dragPreview: null,
  isPanning: false,
  remoteCursors: {},

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
      saveStatus: "saved",
      lastSavedAt: Date.now(),
      selectedIds: new Set<string>(),
      hoveredId: null,
      dragPreview: null,
      isPanning: false,
      layersPanelOpen: true,
      remoteCursors: {},
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

  toggleLayersPanel: () => set((state) => ({ layersPanelOpen: !state.layersPanelOpen })),

  setLayersPanelOpen: (layersPanelOpen) => set({ layersPanelOpen }),

  setLayersPanelTab: (layersPanelTab) => set({ layersPanelTab, layersPanelOpen: true }),

  addPage: (name) => {
    const pages = get().pages;
    const pageName = name || `Page ${pages.length + 1}`;
    const newPage = { id: `page-${Date.now()}`, name: pageName };
    set({
      pages: [...pages, newPage],
      currentPageId: newPage.id,
    });
    get().showToast(`Created ${pageName}`);
  },

  renamePage: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
    }));
  },

  deletePage: (id) => {
    const pages = get().pages;
    if (pages.length <= 1) {
      get().showToast("Project must have at least one page");
      return;
    }
    const remaining = pages.filter((p) => p.id !== id);
    const nextCurrent = remaining[0].id;
    set({
      pages: remaining,
      currentPageId: nextCurrent,
    });
    get().showToast("Page deleted");
  },

  setCurrentPageId: (currentPageId) => set({ currentPageId }),

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
      history: {
        ...get().history,
        present: {
          ...get().history.present,
          camera: nextCamera,
        },
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

    const nextCamera: Camera = {
      x: nextX,
      y: nextY,
      zoom: nextZoom,
    };

    set({
      document: {
        ...doc,
        camera: nextCamera,
      },
      history: {
        ...get().history,
        present: {
          ...get().history.present,
          camera: nextCamera,
        },
      },
    });
  },

  zoomTo: (zoom) => {
    const clampedZoom = Math.min(8.0, Math.max(0.1, zoom));
    const doc = get().document;
    const nextCamera: Camera = {
      ...doc.camera,
      zoom: clampedZoom,
    };
    set({
      document: {
        ...doc,
        camera: nextCamera,
      },
      history: {
        ...get().history,
        present: {
          ...get().history.present,
          camera: nextCamera,
        },
      },
    });
  },

  centerView: () => {
    const doc = get().document;
    const nextCamera: Camera = {
      x: 0,
      y: 0,
      zoom: 1,
    };
    set({
      document: {
        ...doc,
        camera: nextCamera,
      },
      history: {
        ...get().history,
        present: {
          ...get().history.present,
          camera: nextCamera,
        },
      },
    });
    get().showToast("View centered");
  },

  executeCommand: (command) => {
    const state = get();
    const currentCamera = state.document.camera;
    const historyWithCurrentCamera: HistoryState = {
      ...state.history,
      present: {
        ...state.history.present,
        camera: currentCamera,
      },
    };
    const nextHistory = applyCommand(historyWithCurrentCamera, command);
    set({
      history: nextHistory,
      document: {
        ...nextHistory.present,
        camera: currentCamera,
      },
      saveStatus: state.projectId === "demo-project" ? "saved" : "unsaved",
    });
  },

  undo: () => {
    const state = get();
    if (!historyCanUndo(state.history)) return;
    const currentCamera = state.document.camera;
    const nextHistory = historyUndo(state.history);
    set({
      history: nextHistory,
      document: {
        ...nextHistory.present,
        camera: currentCamera,
      },
      saveStatus: state.projectId === "demo-project" ? "saved" : "unsaved",
    });
  },

  redo: () => {
    const state = get();
    if (!historyCanRedo(state.history)) return;
    const currentCamera = state.document.camera;
    const nextHistory = historyRedo(state.history);
    set({
      history: nextHistory,
      document: {
        ...nextHistory.present,
        camera: currentCamera,
      },
      saveStatus: state.projectId === "demo-project" ? "saved" : "unsaved",
    });
  },

  canUndo: () => historyCanUndo(get().history),
  canRedo: () => historyCanRedo(get().history),

  openShortcutsModal: () => set({ shortcutsModalOpen: true }),
  openIllustrationModal: () => set({ illustrationModalOpen: true }),
  closeModals: () => set({ shortcutsModalOpen: false, illustrationModalOpen: false }),

  setSaveStatus: (saveStatus) =>
    set({
      saveStatus,
      lastSavedAt: saveStatus === "saved" ? Date.now() : get().lastSavedAt,
    }),

  setRemoteCursor: (id, cursor) =>
    set((state) => ({
      remoteCursors: {
        ...state.remoteCursors,
        [id]: cursor,
      },
    })),

  removeRemoteCursor: (id) =>
    set((state) => {
      const next = { ...state.remoteCursors };
      delete next[id];
      return { remoteCursors: next };
    }),

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

import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../lib/canvas/store/editorStore";
import { makeRectangle } from "../lib/canvas/document/defaults";
import { AddNode } from "../lib/canvas/commands";

describe("useEditorStore", () => {
  beforeEach(() => {
    useEditorStore.getState().initEditor("test-proj", "Test Project");
  });

  it("initializes with default camera and project information", () => {
    const state = useEditorStore.getState();
    expect(state.projectId).toBe("test-proj");
    expect(state.projectName).toBe("Test Project");
    expect(state.document.camera.zoom).toBe(1);
    expect(state.document.camera.x).toBe(0);
    expect(state.document.camera.y).toBe(0);
    expect(state.activeTool).toBe("select");
  });

  it("updates camera via panBy", () => {
    useEditorStore.getState().panBy(100, -50);
    const state = useEditorStore.getState();
    expect(state.document.camera.x).toBe(100);
    expect(state.document.camera.y).toBe(-50);
  });

  it("clamps zoom within [0.1, 8.0]", () => {
    useEditorStore.getState().zoomTo(100);
    expect(useEditorStore.getState().document.camera.zoom).toBe(8);

    useEditorStore.getState().zoomTo(0.01);
    expect(useEditorStore.getState().document.camera.zoom).toBe(0.1);
  });

  it("switches active tool and manages selection", () => {
    useEditorStore.getState().setSelectedIds(["node-1"]);
    expect(useEditorStore.getState().selectedIds.has("node-1")).toBe(true);

    useEditorStore.getState().setActiveTool("hand");
    // Hand tool clears selection
    expect(useEditorStore.getState().activeTool).toBe("hand");
    expect(useEditorStore.getState().selectedIds.size).toBe(0);
  });

  it("executes commands and supports undo / redo", () => {
    const rect = makeRectangle({ id: "rect-1" });
    useEditorStore.getState().executeCommand(new AddNode(rect));

    expect(useEditorStore.getState().document.nodes).toHaveLength(1);
    expect(useEditorStore.getState().canUndo()).toBe(true);
    expect(useEditorStore.getState().canRedo()).toBe(false);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().document.nodes).toHaveLength(0);
    expect(useEditorStore.getState().canRedo()).toBe(true);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().document.nodes).toHaveLength(1);
  });

  it("centers view back to (0, 0) and zoom 1", () => {
    useEditorStore.getState().panBy(250, 400);
    useEditorStore.getState().zoomTo(3.5);

    useEditorStore.getState().centerView();
    const cam = useEditorStore.getState().document.camera;
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    expect(cam.zoom).toBe(1);
  });

  it("toggles layers panel visibility", () => {
    expect(useEditorStore.getState().layersPanelOpen).toBe(true);
    useEditorStore.getState().toggleLayersPanel();
    expect(useEditorStore.getState().layersPanelOpen).toBe(false);
    useEditorStore.getState().setLayersPanelOpen(true);
    expect(useEditorStore.getState().layersPanelOpen).toBe(true);
  });

  it("tracks auto-save status and lastSavedAt", () => {
    expect(useEditorStore.getState().saveStatus).toBe("saved");

    const rect = makeRectangle({ id: "rect-save-test" });
    useEditorStore.getState().executeCommand(new AddNode(rect));
    expect(useEditorStore.getState().saveStatus).toBe("unsaved");

    useEditorStore.getState().setSaveStatus("saving");
    expect(useEditorStore.getState().saveStatus).toBe("saving");

    useEditorStore.getState().setSaveStatus("saved");
    expect(useEditorStore.getState().saveStatus).toBe("saved");
    expect(useEditorStore.getState().lastSavedAt).toBeGreaterThan(0);
  });

  it("stores and manages multiplayer remote cursors", () => {
    const cursor = {
      id: "user-alpha",
      name: "Alice",
      x: 120,
      y: 240,
      color: "#2E5CFF",
      lastSeen: Date.now(),
    };

    useEditorStore.getState().setRemoteCursor("user-alpha", cursor);
    expect(useEditorStore.getState().remoteCursors["user-alpha"]).toEqual(cursor);

    useEditorStore.getState().removeRemoteCursor("user-alpha");
    expect(useEditorStore.getState().remoteCursors["user-alpha"]).toBeUndefined();
  });

  it("manages pages and sidebar tabs", () => {
    expect(useEditorStore.getState().layersPanelTab).toBe("layers");
    useEditorStore.getState().setLayersPanelTab("ai");
    expect(useEditorStore.getState().layersPanelTab).toBe("ai");
    expect(useEditorStore.getState().layersPanelOpen).toBe(true);

    useEditorStore.getState().setLayersPanelTab("pages");
    expect(useEditorStore.getState().layersPanelTab).toBe("pages");

    // Add page
    useEditorStore.getState().addPage("Moodboard Exploration");
    expect(useEditorStore.getState().pages).toHaveLength(2);
    expect(useEditorStore.getState().pages[1].name).toBe("Moodboard Exploration");

    // Rename page
    const newPageId = useEditorStore.getState().pages[1].id;
    useEditorStore.getState().renamePage(newPageId, "Final Deliverable");
    expect(useEditorStore.getState().pages[1].name).toBe("Final Deliverable");

    // Switch page
    useEditorStore.getState().setCurrentPageId(newPageId);
    expect(useEditorStore.getState().currentPageId).toBe(newPageId);

    // Delete page
    useEditorStore.getState().deletePage(newPageId);
    expect(useEditorStore.getState().pages).toHaveLength(1);
  });
});

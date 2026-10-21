import { describe, it, expect } from "vitest";
import { makeEmptyDocument, makeRectangle } from "@/lib/canvas/document/defaults";
import { AddNode, DeleteNode, MoveNode } from "@/lib/canvas/commands/index";
import {
  makeHistory,
  applyCommand,
  undo,
  redo,
  canUndo,
  canRedo,
} from "@/lib/canvas/commands/history";

describe("Commands", () => {
  it("AddNode inserts a node into the document", () => {
    const doc = makeEmptyDocument();
    const node = makeRectangle({ id: "rect-1" });
    const cmd = new AddNode(node);
    const next = cmd.execute(doc);
    expect(next.nodes).toHaveLength(1);
    expect(next.nodes[0].id).toBe("rect-1");
  });

  it("AddNode.undo removes the node", () => {
    const doc = makeEmptyDocument();
    const node = makeRectangle({ id: "rect-1" });
    const cmd = new AddNode(node);
    const after = cmd.execute(doc);
    const undone = cmd.undo(after);
    expect(undone.nodes).toHaveLength(0);
  });

  it("DeleteNode removes a node and undo restores it", () => {
    let doc = makeEmptyDocument();
    const node = makeRectangle({ id: "rect-2" });
    doc = new AddNode(node).execute(doc);
    const del = new DeleteNode("rect-2");
    const after = del.execute(doc);
    expect(after.nodes).toHaveLength(0);
    const restored = del.undo(after);
    expect(restored.nodes).toHaveLength(1);
    expect(restored.nodes[0].id).toBe("rect-2");
  });

  it("MoveNode shifts position and undo reverts it", () => {
    let doc = makeEmptyDocument();
    const node = makeRectangle({ id: "rect-3", x: 10, y: 20 });
    doc = new AddNode(node).execute(doc);
    const move = new MoveNode("rect-3", 50, 30);
    const moved = move.execute(doc);
    expect(moved.nodes[0].x).toBe(60);
    expect(moved.nodes[0].y).toBe(50);
    const reverted = move.undo(moved);
    expect(reverted.nodes[0].x).toBe(10);
    expect(reverted.nodes[0].y).toBe(20);
  });
});

describe("History (undo/redo)", () => {
  it("starts with empty past and future", () => {
    const history = makeHistory(makeEmptyDocument());
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it("applying a command enables undo", () => {
    let history = makeHistory(makeEmptyDocument());
    const node = makeRectangle();
    history = applyCommand(history, new AddNode(node));
    expect(canUndo(history)).toBe(true);
    expect(history.present.nodes).toHaveLength(1);
  });

  it("undo reverts to previous state", () => {
    let history = makeHistory(makeEmptyDocument());
    history = applyCommand(history, new AddNode(makeRectangle()));
    history = undo(history);
    expect(history.present.nodes).toHaveLength(0);
    expect(canRedo(history)).toBe(true);
  });

  it("redo re-applies undone action", () => {
    let history = makeHistory(makeEmptyDocument());
    const node = makeRectangle();
    history = applyCommand(history, new AddNode(node));
    history = undo(history);
    history = redo(history);
    expect(history.present.nodes).toHaveLength(1);
    expect(canRedo(history)).toBe(false);
  });

  it("new command clears the redo stack", () => {
    let history = makeHistory(makeEmptyDocument());
    history = applyCommand(history, new AddNode(makeRectangle()));
    history = undo(history);
    // New action after undo
    history = applyCommand(history, new AddNode(makeRectangle()));
    expect(canRedo(history)).toBe(false);
  });

  it("caps history at MAX_HISTORY entries", () => {
    let history = makeHistory(makeEmptyDocument());
    // Add 105 commands
    for (let i = 0; i < 105; i++) {
      history = applyCommand(history, new AddNode(makeRectangle()));
    }
    expect(history.past.length).toBeLessThanOrEqual(100);
  });
});

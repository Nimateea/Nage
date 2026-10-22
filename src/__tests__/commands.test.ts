import { describe, it, expect } from "vitest";
import { makeEmptyDocument, makeRectangle } from "@/lib/canvas/document/defaults";
import type { RectangleNode } from "@/lib/canvas/document/types";
import {
  AddNode,
  DeleteNode,
  MoveNode,
  MoveNodes,
  ResizeNode,
  RotateNode,
  UpdateProps,
  ReorderNodes,
} from "@/lib/canvas/commands/index";
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

  it("MoveNodes shifts multiple nodes together and undo reverts them", () => {
    let doc = makeEmptyDocument();
    const r1 = makeRectangle({ id: "r1", x: 10, y: 10 });
    const r2 = makeRectangle({ id: "r2", x: 50, y: 50 });
    doc = new AddNode(r1).execute(doc);
    doc = new AddNode(r2).execute(doc);

    const moveBatch = new MoveNodes([
      { nodeId: "r1", dx: 15, dy: 25 },
      { nodeId: "r2", dx: 15, dy: 25 },
    ]);
    const moved = moveBatch.execute(doc);
    expect(moved.nodes.find((n) => n.id === "r1")?.x).toBe(25);
    expect(moved.nodes.find((n) => n.id === "r1")?.y).toBe(35);
    expect(moved.nodes.find((n) => n.id === "r2")?.x).toBe(65);
    expect(moved.nodes.find((n) => n.id === "r2")?.y).toBe(75);

    const reverted = moveBatch.undo(moved);
    expect(reverted.nodes.find((n) => n.id === "r1")?.x).toBe(10);
    expect(reverted.nodes.find((n) => n.id === "r1")?.y).toBe(10);
    expect(reverted.nodes.find((n) => n.id === "r2")?.x).toBe(50);
    expect(reverted.nodes.find((n) => n.id === "r2")?.y).toBe(50);
  });

  it("ResizeNode updates bounds and undo reverts to previous bounds", () => {
    let doc = makeEmptyDocument();
    const node = makeRectangle({ id: "r-size", x: 20, y: 20, width: 100, height: 100 });
    doc = new AddNode(node).execute(doc);

    const prev = { x: 20, y: 20, width: 100, height: 100 };
    const next = { x: 10, y: 10, width: 150, height: 120 };
    const resize = new ResizeNode("r-size", prev, next);
    const resized = resize.execute(doc);
    expect(resized.nodes[0].x).toBe(10);
    expect(resized.nodes[0].y).toBe(10);
    expect(resized.nodes[0].width).toBe(150);
    expect(resized.nodes[0].height).toBe(120);

    const reverted = resize.undo(resized);
    expect(reverted.nodes[0].x).toBe(20);
    expect(reverted.nodes[0].y).toBe(20);
    expect(reverted.nodes[0].width).toBe(100);
    expect(reverted.nodes[0].height).toBe(100);
  });

  it("RotateNode updates angle and undo reverts to previous angle", () => {
    let doc = makeEmptyDocument();
    const node = makeRectangle({ id: "r-rot", rotation: 0 });
    doc = new AddNode(node).execute(doc);

    const rotate = new RotateNode("r-rot", 0, 45);
    const rotated = rotate.execute(doc);
    expect(rotated.nodes[0].rotation).toBe(45);

    const reverted = rotate.undo(rotated);
    expect(reverted.nodes[0].rotation).toBe(0);
  });

  it("UpdateProps modifies node properties and undo restores previous properties", () => {
    let doc = makeEmptyDocument();
    const node = makeRectangle({ id: "r-props", opacity: 1, cornerRadius: 0 });
    doc = new AddNode(node).execute(doc);

    const update = new UpdateProps("r-props", { opacity: 1, cornerRadius: 0 }, { opacity: 0.5, cornerRadius: 16 });
    const updated = update.execute(doc);
    expect(updated.nodes[0].opacity).toBe(0.5);
    expect((updated.nodes[0] as RectangleNode).cornerRadius).toBe(16);

    const reverted = update.undo(updated);
    expect(reverted.nodes[0].opacity).toBe(1);
    expect((reverted.nodes[0] as RectangleNode).cornerRadius).toBe(0);
  });

  it("ReorderNodes updates z-order and undo reverts it", () => {
    let doc = makeEmptyDocument();
    const r1 = makeRectangle({ id: "layer1" });
    const r2 = makeRectangle({ id: "layer2" });
    doc = new AddNode(r1).execute(doc);
    doc = new AddNode(r2).execute(doc);

    const reorder = new ReorderNodes([r1, r2], [r2, r1]);
    const reordered = reorder.execute(doc);
    expect(reordered.nodes[0].id).toBe("layer2");
    expect(reordered.nodes[1].id).toBe("layer1");

    const reverted = reorder.undo(reordered);
    expect(reverted.nodes[0].id).toBe("layer1");
    expect(reverted.nodes[1].id).toBe("layer2");
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

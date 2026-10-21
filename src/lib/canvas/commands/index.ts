// Command implementations: AddNode, DeleteNode
import { nanoid } from "nanoid";
import type { CanvasDocument, CanvasNode, Command } from "../document/types";

// ── AddNode ───────────────────────────────────────────────────────────────────

export class AddNode implements Command {
  readonly id = nanoid();
  readonly label: string;
  private readonly node: CanvasNode;

  constructor(node: CanvasNode) {
    this.node = node;
    this.label = `Add ${node.type}`;
  }

  execute(doc: CanvasDocument): CanvasDocument {
    return { ...doc, nodes: [...doc.nodes, this.node] };
  }

  undo(doc: CanvasDocument): CanvasDocument {
    return {
      ...doc,
      nodes: doc.nodes.filter((n) => n.id !== this.node.id),
    };
  }
}

// ── DeleteNode ────────────────────────────────────────────────────────────────

export class DeleteNode implements Command {
  readonly id = nanoid();
  readonly label: string;
  private readonly nodeId: string;
  private removed: CanvasNode | undefined;
  private removedIndex: number | undefined;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.label = "Delete node";
  }

  execute(doc: CanvasDocument): CanvasDocument {
    this.removedIndex = doc.nodes.findIndex((n) => n.id === this.nodeId);
    if (this.removedIndex === -1) return doc;
    this.removed = doc.nodes[this.removedIndex];
    const nodes = [...doc.nodes];
    nodes.splice(this.removedIndex, 1);
    return { ...doc, nodes };
  }

  undo(doc: CanvasDocument): CanvasDocument {
    if (this.removed === undefined || this.removedIndex === undefined) return doc;
    const nodes = [...doc.nodes];
    nodes.splice(this.removedIndex, 0, this.removed);
    return { ...doc, nodes };
  }
}

// ── MoveNode ──────────────────────────────────────────────────────────────────

export class MoveNode implements Command {
  readonly id = nanoid();
  readonly label = "Move";
  private readonly nodeId: string;
  private readonly dx: number;
  private readonly dy: number;

  constructor(nodeId: string, dx: number, dy: number) {
    this.nodeId = nodeId;
    this.dx = dx;
    this.dy = dy;
  }

  execute(doc: CanvasDocument): CanvasDocument {
    return {
      ...doc,
      nodes: doc.nodes.map((n) =>
        n.id === this.nodeId ? { ...n, x: n.x + this.dx, y: n.y + this.dy } : n
      ),
    };
  }

  undo(doc: CanvasDocument): CanvasDocument {
    return {
      ...doc,
      nodes: doc.nodes.map((n) =>
        n.id === this.nodeId ? { ...n, x: n.x - this.dx, y: n.y - this.dy } : n
      ),
    };
  }
}

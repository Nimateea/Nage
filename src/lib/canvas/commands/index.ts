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

// ── MoveNodes (Batch) ──────────────────────────────────────────────────────────

export class MoveNodes implements Command {
  readonly id = nanoid();
  readonly label = "Move nodes";
  private readonly movements: { nodeId: string; dx: number; dy: number }[];

  constructor(movements: { nodeId: string; dx: number; dy: number }[]) {
    this.movements = movements;
  }

  execute(doc: CanvasDocument): CanvasDocument {
    const moveMap = new Map(this.movements.map((m) => [m.nodeId, m]));
    return {
      ...doc,
      nodes: doc.nodes.map((n) => {
        const m = moveMap.get(n.id);
        if (!m) return n;
        if (n.type === "line") {
          return {
            ...n,
            x: n.x + m.dx,
            y: n.y + m.dy,
            x2: n.x2 + m.dx,
            y2: n.y2 + m.dy,
          };
        }
        return { ...n, x: n.x + m.dx, y: n.y + m.dy };
      }),
    };
  }

  undo(doc: CanvasDocument): CanvasDocument {
    const moveMap = new Map(this.movements.map((m) => [m.nodeId, m]));
    return {
      ...doc,
      nodes: doc.nodes.map((n) => {
        const m = moveMap.get(n.id);
        if (!m) return n;
        if (n.type === "line") {
          return {
            ...n,
            x: n.x - m.dx,
            y: n.y - m.dy,
            x2: n.x2 - m.dx,
            y2: n.y2 - m.dy,
          };
        }
        return { ...n, x: n.x - m.dx, y: n.y - m.dy };
      }),
    };
  }
}

// ── ResizeNode ────────────────────────────────────────────────────────────────

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  x2?: number;
  y2?: number;
}

export class ResizeNode implements Command {
  readonly id = nanoid();
  readonly label = "Resize";
  private readonly nodeId: string;
  private readonly prev: NodeBounds;
  private readonly next: NodeBounds;

  constructor(nodeId: string, prev: NodeBounds, next: NodeBounds) {
    this.nodeId = nodeId;
    this.prev = prev;
    this.next = next;
  }

  execute(doc: CanvasDocument): CanvasDocument {
    return {
      ...doc,
      nodes: doc.nodes.map((n) => {
        if (n.id !== this.nodeId) return n;
        if (n.type === "line" && this.next.x2 !== undefined && this.next.y2 !== undefined) {
          return {
            ...n,
            x: this.next.x,
            y: this.next.y,
            width: this.next.width,
            height: this.next.height,
            x2: this.next.x2,
            y2: this.next.y2,
          };
        }
        return {
          ...n,
          x: this.next.x,
          y: this.next.y,
          width: this.next.width,
          height: this.next.height,
        };
      }),
    };
  }

  undo(doc: CanvasDocument): CanvasDocument {
    return {
      ...doc,
      nodes: doc.nodes.map((n) => {
        if (n.id !== this.nodeId) return n;
        if (n.type === "line" && this.prev.x2 !== undefined && this.prev.y2 !== undefined) {
          return {
            ...n,
            x: this.prev.x,
            y: this.prev.y,
            width: this.prev.width,
            height: this.prev.height,
            x2: this.prev.x2,
            y2: this.prev.y2,
          };
        }
        return {
          ...n,
          x: this.prev.x,
          y: this.prev.y,
          width: this.prev.width,
          height: this.prev.height,
        };
      }),
    };
  }
}

// ── RotateNode ────────────────────────────────────────────────────────────────

export class RotateNode implements Command {
  readonly id = nanoid();
  readonly label = "Rotate";
  private readonly nodeId: string;
  private readonly prevRotation: number;
  private readonly nextRotation: number;

  constructor(nodeId: string, prevRotation: number, nextRotation: number) {
    this.nodeId = nodeId;
    this.prevRotation = prevRotation;
    this.nextRotation = nextRotation;
  }

  execute(doc: CanvasDocument): CanvasDocument {
    return {
      ...doc,
      nodes: doc.nodes.map((n) =>
        n.id === this.nodeId ? { ...n, rotation: this.nextRotation } : n
      ),
    };
  }

  undo(doc: CanvasDocument): CanvasDocument {
    return {
      ...doc,
      nodes: doc.nodes.map((n) =>
        n.id === this.nodeId ? { ...n, rotation: this.prevRotation } : n
      ),
    };
  }
}

import { Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AuthRequest } from "./auth.middleware";

/**
 * Resolves the boardId for the current request (directly from params,
 * or by looking it up via a column/task id), then checks that the
 * authenticated user is either the owner or a BoardMember.
 *
 * Attaches req.boardId and req.boardRole for downstream handlers to use.
 */
export interface BoardScopedRequest extends AuthRequest {
  boardId?: string;
  boardRole?: string;
}

async function resolveBoardId(req: BoardScopedRequest): Promise<string | null> {
  if (req.params.boardId) return req.params.boardId;

  if (req.params.columnId) {
    const column = await prisma.column.findUnique({
      where: { id: req.params.columnId },
      select: { boardId: true },
    });
    return column?.boardId ?? null;
  }

  if (req.params.taskId) {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      select: { column: { select: { boardId: true } } },
    });
    return task?.column.boardId ?? null;
  }

  // Some routes (e.g. task move) pass boardId in the body instead.
  if (req.body?.boardId) return req.body.boardId;

  return null;
}

export async function boardAccessMiddleware(
  req: BoardScopedRequest,
  res: Response,
  next: NextFunction
) {
  const boardId = await resolveBoardId(req);

  if (!boardId) {
    return res.status(400).json({ error: "Could not determine target board" });
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { members: true },
  });

  if (!board) {
    return res.status(404).json({ error: "Board not found" });
  }

  const isOwner = board.ownerId === req.userId;
  const membership = board.members.find((m) => m.userId === req.userId);

  if (!isOwner && !membership) {
    // Explicitly do not leak whether the board exists to non-members.
    return res.status(404).json({ error: "Board not found" });
  }

  req.boardId = boardId;
  req.boardRole = isOwner ? "OWNER" : membership!.role;
  next();
}

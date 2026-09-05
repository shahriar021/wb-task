import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { authMiddleware } from "../middleware/auth.middleware";
import { boardAccessMiddleware, BoardScopedRequest } from "../middleware/boardAccess.middleware";

const router = Router();
router.use(authMiddleware);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

// Create a task at the end of a column (position = max + 1).
router.post("/column/:columnId", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const last = await prisma.task.findFirst({
    where: { columnId: req.params.columnId },
    orderBy: { position: "desc" },
  });
  const position = last ? last.position + 1 : 0;

  const task = await prisma.task.create({
    data: { ...parsed.data, columnId: req.params.columnId, position },
  });
  res.status(201).json(task);
});

router.patch("/:taskId", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  const parsed = createTaskSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await prisma.task.update({
    where: { id: req.params.taskId },
    data: parsed.data,
  });
  res.json(updated);
});

router.delete("/:taskId", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  await prisma.task.delete({ where: { id: req.params.taskId } });
  res.status(204).send();
});

/**
 * THE CORE ENDPOINT: move a task.
 *
 * Body: { targetColumnId: string, targetIndex: number }
 *
 * Strategy: fetch the ordered task list of the target column (excluding
 * the task being moved), figure out its new neighbors based on
 * targetIndex, and set position to the midpoint between them. This
 * means moving a task is an O(1) write — we never touch any other
 * task's row, so reordering is conflict-free even with concurrent
 * moves elsewhere on the board.
 *
 * If neighbors end up too close together (float precision exhausted
 * after many moves in the same slot), we detect that and rebalance
 * the whole column's positions to integer steps as a fallback.
 */
const moveTaskSchema = z.object({
  targetColumnId: z.string().uuid(),
  targetIndex: z.number().int().min(0),
});

router.patch("/:taskId/move", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  const parsed = moveTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { targetColumnId, targetIndex } = parsed.data;
  const taskId = req.params.taskId;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  // Guard against moving a task into a column on a different board —
  // boardAccessMiddleware only verified access to the task's own board.
  const targetColumn = await prisma.column.findUnique({ where: { id: targetColumnId } });
  if (!targetColumn || targetColumn.boardId !== req.boardId) {
    return res.status(403).json({ error: "Target column is not on a board you have access to" });
  }

  // Ordered tasks currently in the destination column, excluding the
  // task being moved (relevant when reordering within the same column).
  const siblings = await prisma.task.findMany({
    where: { columnId: targetColumnId, id: { not: taskId } },
    orderBy: { position: "asc" },
  });

  const before = siblings[targetIndex - 1];
  const after = siblings[targetIndex];

  let newPosition: number;
  if (!before && !after) {
    newPosition = 0; // first task in an empty column
  } else if (!before) {
    newPosition = after.position - 1; // insert at the start
  } else if (!after) {
    newPosition = before.position + 1; // insert at the end
  } else {
    newPosition = (before.position + after.position) / 2; // insert between
  }

  // Fallback: if float precision has been exhausted (positions too
  // close to represent a distinct midpoint), rebalance the column.
  const precisionExhausted =
    before && after && after.position - before.position < Number.EPSILON * 4;

  if (precisionExhausted) {
    const rebalanced = [
      ...siblings.slice(0, targetIndex),
      { id: taskId },
      ...siblings.slice(targetIndex),
    ];
    await prisma.$transaction(
      rebalanced.map((t, i) =>
        prisma.task.update({ where: { id: t.id }, data: { position: i, columnId: targetColumnId } })
      )
    );
  } else {
    await prisma.task.update({
      where: { id: taskId },
      data: { columnId: targetColumnId, position: newPosition },
    });
  }

  const updated = await prisma.task.findUnique({ where: { id: taskId } });
  res.json(updated);
});

export default router;

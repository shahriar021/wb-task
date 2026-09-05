import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { authMiddleware } from "../middleware/auth.middleware";
import { boardAccessMiddleware, BoardScopedRequest } from "../middleware/boardAccess.middleware";

const router = Router();
router.use(authMiddleware);

const createColumnSchema = z.object({ name: z.string().min(1) });

// Create a column at the end of the board (order = max + 1).
router.post("/board/:boardId", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  const parsed = createColumnSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const last = await prisma.column.findFirst({
    where: { boardId: req.boardId },
    orderBy: { order: "desc" },
  });
  const order = last ? last.order + 1 : 0;

  const column = await prisma.column.create({
    data: { name: parsed.data.name, boardId: req.boardId!, order },
  });
  res.status(201).json(column);
});

router.patch("/:columnId", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  const parsed = createColumnSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await prisma.column.update({
    where: { id: req.params.columnId },
    data: parsed.data,
  });
  res.json(updated);
});

router.delete("/:columnId", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  await prisma.column.delete({ where: { id: req.params.columnId } });
  res.status(204).send();
});

export default router;

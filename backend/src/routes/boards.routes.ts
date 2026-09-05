import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import { boardAccessMiddleware, BoardScopedRequest } from "../middleware/boardAccess.middleware";

const router = Router();
router.use(authMiddleware);

// List boards the user owns or is a member of.
router.get("/", async (req: AuthRequest, res) => {
  const boards = await prisma.board.findMany({
    where: {
      OR: [{ ownerId: req.userId }, { members: { some: { userId: req.userId } } }],
    },
    include: { members: true },
  });
  res.json(boards);
});

const createBoardSchema = z.object({ name: z.string().min(1) });

router.post("/", async (req: AuthRequest, res) => {
  const parsed = createBoardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const board = await prisma.board.create({
    data: {
      name: parsed.data.name,
      ownerId: req.userId!,
      members: { create: { userId: req.userId!, role: "OWNER" } },
    },
  });
  res.status(201).json(board);
});

// All routes below operate on a specific board and require access checks.
router.get("/:boardId", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  const board = await prisma.board.findUnique({
    where: { id: req.boardId },
    include: {
      columns: { orderBy: { order: "asc" }, include: { tasks: { orderBy: { position: "asc" } } } },
      members: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });
  res.json(board);
});

router.patch("/:boardId", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  const parsed = createBoardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await prisma.board.update({
    where: { id: req.boardId },
    data: { name: parsed.data.name },
  });
  res.json(updated);
});

router.delete("/:boardId", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  if (req.boardRole !== "OWNER") {
    return res.status(403).json({ error: "Only the owner can delete this board" });
  }
  await prisma.board.delete({ where: { id: req.boardId } });
  res.status(204).send();
});

// Share a board with another registered user by email.
const shareSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]).default("EDITOR"),
});

router.post("/:boardId/share", boardAccessMiddleware, async (req: BoardScopedRequest, res) => {
  if (req.boardRole !== "OWNER") {
    return res.status(403).json({ error: "Only the owner can share this board" });
  }

  const parsed = shareSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(404).json({ error: "No user with that email" });

  const membership = await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId: req.boardId!, userId: user.id } },
    update: { role: parsed.data.role },
    create: { boardId: req.boardId!, userId: user.id, role: parsed.data.role },
  });

  res.status(201).json(membership);
});

export default router;

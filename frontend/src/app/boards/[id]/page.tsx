"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { ColumnView } from "@/components/ColumnView";
import { TaskCard } from "@/components/TaskCard";
import type { Board, Column, Task } from "@/types";

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadBoard();
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBoard() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Board>(`/boards/${boardId}`);
      setBoard(data);
      setColumns(data.columns ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this board.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    try {
      const column = await api.post<Column>(`/columns/board/${boardId}`, {
        name: newColumnName.trim(),
      });
      setColumns((prev) => [...prev, { ...column, tasks: [] }]);
      setNewColumnName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the column.");
    }
  }

  async function handleDeleteColumn(columnId: string) {
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    try {
      await api.delete(`/columns/${columnId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete the column.");
      loadBoard();
    }
  }

  async function handleAddTask(columnId: string, title: string) {
    try {
      const task = await api.post<Task>(`/tasks/column/${columnId}`, { title });
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, tasks: [...c.tasks, task] } : c))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the task.");
    }
  }

  async function handleDeleteTask(taskId: string) {
    setColumns((prev) =>
      prev.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) }))
    );
    try {
      await api.delete(`/tasks/${taskId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete the task.");
      loadBoard();
    }
  }

  function findColumnByTaskId(taskId: string): Column | undefined {
    return columns.find((c) => c.tasks.some((t) => t.id === taskId));
  }

  function handleDragStart(event: DragStartEvent) {
    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeTaskId = active.id as string;
    const sourceColumn = findColumnByTaskId(activeTaskId);
    if (!sourceColumn) return;

    // `over` is either another task (drop next to it) or a column itself (empty column / drop at end).
    const overIsColumn = columns.some((c) => c.id === over.id);
    const targetColumn = overIsColumn
      ? columns.find((c) => c.id === over.id)!
      : findColumnByTaskId(over.id as string) ?? sourceColumn;

    // Index computed against the target column's tasks *excluding* the
    // task being moved, to match the backend's sibling calculation
    // (backend excludes the moved task when finding neighbors).
    const siblingTasks = targetColumn.tasks.filter((t) => t.id !== activeTaskId);
    const targetIndex = overIsColumn
      ? siblingTasks.length
      : siblingTasks.findIndex((t) => t.id === over.id);

    if (targetIndex < 0) return;

    // Optimistic local update so the UI feels instant.
    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
      const from = next.find((c) => c.id === sourceColumn.id)!;
      const to = next.find((c) => c.id === targetColumn.id)!;
      const taskIdx = from.tasks.findIndex((t) => t.id === activeTaskId);
      const [moved] = from.tasks.splice(taskIdx, 1);
      moved.columnId = to.id;

      const insertAt = Math.min(targetIndex, to.tasks.length);
      to.tasks.splice(insertAt, 0, moved);
      return next;
    });

    try {
      await api.patch(`/tasks/${activeTaskId}/move`, {
        targetColumnId: targetColumn.id,
        targetIndex,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't move the task. Reloading board.");
      loadBoard();
    }
  }

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setShareMessage(null);
    try {
      await api.post(`/boards/${boardId}/share`, { email: shareEmail, role: "EDITOR" });
      setShareMessage(`Shared with ${shareEmail}.`);
      setShareEmail("");
      loadBoard();
    } catch (err) {
      setShareMessage(err instanceof ApiError ? err.message : "Couldn't share the board.");
    }
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center text-ink/50">Loading…</main>;
  }

  if (error && !board) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-ink/60">{error}</p>
        <Link href="/boards" className="text-signal hover:underline text-sm">
          Back to boards
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-4 border-b border-line flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/boards" className="text-ink/40 hover:text-ink text-sm">
            ← Boards
          </Link>
          <h1 className="text-lg font-semibold text-ink">{board?.name}</h1>
        </div>

        <form onSubmit={handleShare} className="flex items-center gap-2">
          <input
            type="email"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            placeholder="Invite by email"
            className="text-sm rounded-md border border-line bg-white px-2.5 py-1.5 focus:border-signal outline-none w-48"
          />
          <button
            type="submit"
            className="text-sm text-white bg-ink rounded-md px-3 py-1.5 hover:bg-ink/90"
          >
            Share
          </button>
        </form>
      </header>

      {shareMessage && <p className="px-6 pt-2 text-xs text-ink/50">{shareMessage}</p>}
      {error && board && <p className="px-6 pt-2 text-xs text-red-600">{error}</p>}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto px-6 py-6 flex gap-4 items-start">
          {columns
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((column) => (
              <ColumnView
                key={column.id}
                column={column}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                onDeleteColumn={handleDeleteColumn}
              />
            ))}

          <form onSubmit={handleAddColumn} className="w-72 shrink-0">
            <input
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="+ Add column"
              className="w-full rounded-lg border border-dashed border-line bg-transparent px-3 py-3 text-sm text-ink/60 focus:border-signal outline-none placeholder:text-ink/40"
            />
          </form>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} onDelete={() => {}} /> : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
}

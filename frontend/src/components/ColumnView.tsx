"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import type { Column, Task } from "@/types";

export function ColumnView({
  column,
  onAddTask,
  onDeleteTask,
  onDeleteColumn,
}: {
  column: Column;
  onAddTask: (columnId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteColumn: (columnId: string) => void;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: "column" } });

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(column.id, newTaskTitle.trim());
    setNewTaskTitle("");
    setShowForm(false);
  }

  return (
    <div className="w-72 shrink-0 rounded-lg bg-paper border border-line/70 flex flex-col max-h-full">
      <div className="flex items-center justify-between px-3 py-3">
        <h3 className="font-medium text-ink text-sm">{column.name}</h3>
        <button
          onClick={() => onDeleteColumn(column.id)}
          className="text-ink/30 hover:text-red-600 text-xs"
          aria-label="Delete column"
        >
          ✕
        </button>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-3 space-y-2 min-h-[40px]">
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task: Task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
      </div>

      <div className="p-3">
        {showForm ? (
          <form onSubmit={submitTask} className="space-y-2">
            <input
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onBlur={() => !newTaskTitle && setShowForm(false)}
              placeholder="Task title"
              className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:border-signal outline-none"
            />
            <button
              type="submit"
              className="text-sm text-white bg-signal rounded-md px-3 py-1.5 hover:bg-signal/90"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-ink/50 hover:text-ink w-full text-left"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}

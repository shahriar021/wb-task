"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";

export function TaskCard({
  task,
  onDelete,
  onEdit,
}: {
  task: Task;
  onDelete: (taskId: string) => void;
  onEdit?: (taskId: string, title: string, description: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { columnId: task.columnId },
  });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function save() {
    setEditing(false);
    if (!title.trim()) {
      setTitle(task.title);
      return;
    }
    if (title !== task.title || description !== (task.description ?? "")) {
      onEdit?.(task.id, title.trim(), description.trim());
    }
  }

  if (editing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-md border border-signal bg-white p-3 space-y-2"
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-full text-sm text-ink outline-none border-b border-line focus:border-signal pb-1"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full text-xs text-ink/70 outline-none border border-line rounded p-1.5 focus:border-signal resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            className="text-xs text-white bg-signal rounded px-2 py-1 hover:bg-signal/90"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setTitle(task.title);
              setDescription(task.description ?? "");
            }}
            className="text-xs text-ink/50 hover:text-ink px-2 py-1"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onEdit && setEditing(true)}
      className="group rounded-md border border-line bg-white p-3 cursor-grab active:cursor-grabbing shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-ink leading-snug">{task.title}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-ink/30 hover:text-red-600 text-xs transition-opacity"
          aria-label="Delete task"
        >
          ✕
        </button>
      </div>
      {task.description && (
        <p className="text-xs text-ink/50 mt-1 leading-snug">{task.description}</p>
      )}
      {onEdit && (
        <p className="text-[10px] text-ink/30 mt-1.5 opacity-0 group-hover:opacity-100">
          Double-click to edit
        </p>
      )}
    </div>
  );
}

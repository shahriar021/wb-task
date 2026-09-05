"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";

export function TaskCard({
  task,
  onDelete,
}: {
  task: Task;
  onDelete: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { columnId: task.columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
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
    </div>
  );
}

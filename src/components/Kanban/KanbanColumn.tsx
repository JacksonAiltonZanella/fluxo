import { useState, type DragEvent } from "react";
import { KanbanCard } from "./KanbanCard";
import { EmptyState } from "../common/UI";
import type { TaskStatus } from "../../types";
import type { TaskWithScore } from "../../hooks/useTasks";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskWithScore[];
  canEditMap: Record<string, boolean>;
  onOpenComments: (task: TaskWithScore) => void;
  onDrop: (taskId: string, status: TaskStatus) => void;
}

export function KanbanColumn({ status, tasks, canEditMap, onOpenComments, onDrop }: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) onDrop(taskId, status);
  }

  return (
    <section className="kanban-column" data-status={status}>
      <header className="kanban-column-header">
        <span>{status}</span>
        <span className="column-count">{tasks.length}</span>
      </header>
      <div
        className={`kanban-column-body ${dragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {tasks.length === 0 && <EmptyState title="Sem atividades" />}
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            draggable={Boolean(canEditMap[task.id])}
            onDragStart={() => {}}
            onDragEnd={() => {}}
            onOpenComments={() => onOpenComments(task)}
          />
        ))}
      </div>
    </section>
  );
}

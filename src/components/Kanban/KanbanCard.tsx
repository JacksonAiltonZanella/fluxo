import { ChatBubbleIcon } from "../common/icons";
import { PriorityTag, StatusPill } from "../common/UI";
import type { TaskWithScore } from "../../hooks/useTasks";

interface KanbanCardProps {
  task: TaskWithScore;
  draggable: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpenComments: () => void;
}

export function KanbanCard({ task, draggable, onDragStart, onDragEnd, onOpenComments }: KanbanCardProps) {
  return (
    <div
      className="kanban-card"
      data-draggable={draggable}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="kanban-card-top">
        <h3 className="kanban-card-title">{task.summary}</h3>
        <button
          className="chat-bubble-icon"
          onClick={onOpenComments}
          aria-label={`Comentários de ${task.summary}`}
          title="Comentários"
        >
          <ChatBubbleIcon size={13} />
        </button>
      </div>
      {task.description && <p className="kanban-card-desc">{task.description}</p>}
      <hr className="kanban-card-divider" />
      <div className="kanban-card-row">
        <span className="label">Score</span>
        <strong className="score-value">{task.score}</strong>
      </div>
      <div className="kanban-card-row">
        <span className="label">Prioridade</span>
        <PriorityTag priority={task.priority} />
      </div>
      <div className="kanban-card-row">
        <span className="label">Status</span>
        <StatusPill status={task.status} />
      </div>
    </div>
  );
}

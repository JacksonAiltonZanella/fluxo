import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTasks, type TaskWithScore } from "../../hooks/useTasks";
import { canCreateTask, canDeleteTask, canEditTask } from "../../utils/permissions";
import { deleteTask } from "../../firebase/tasks";
import { formatDate, formatDateKey } from "../../utils/date";
import { ChatBubbleIcon, EditIcon, PlusIcon, TrashIcon } from "../common/icons";
import { EmptyState, ErrorBanner, LoadingBlock, PriorityTag, StatusPill } from "../common/UI";
import { ConfirmDialog } from "../common/UI";
import { TaskFormModal } from "./TaskFormModal";
import { CommentsPanel } from "../Comments/CommentsPanel";

export function GradeView() {
  const { user, role } = useAuth();
  const { tasks, loading, error } = useTasks(user?.uid ?? null, role);

  const [editing, setEditing] = useState<TaskWithScore | "new" | null>(null);
  const [commenting, setCommenting] = useState<TaskWithScore | null>(null);
  const [deleting, setDeleting] = useState<TaskWithScore | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const sorted = useMemo(() => [...tasks].sort((a, b) => b.score - a.score), [tasks]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteTask(deleting.id);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Fluxo</p>
          <h1 className="page-title">Grade de atividades</h1>
        </div>
        {canCreateTask(role) && (
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            <PlusIcon /> Nova atividade
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <LoadingBlock label="Carregando atividades…" />}

      {!loading && !error && sorted.length === 0 && (
        <EmptyState
          title="Nenhuma atividade por aqui"
          description="Atividades que você criar, for responsável ou tiver acesso compartilhado aparecem nesta grade."
        />
      )}

      {!loading && sorted.length > 0 && (
        <div className="table-wrap">
          <table className="grade-table">
            <thead>
              <tr>
                <th>Resumo</th>
                <th>Score</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Previsão</th>
                <th>Responsável</th>
                <th>Criação</th>
                <th>Comentários</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((task) => {
                const editable = user ? canEditTask(task, user.uid, role) : false;
                const deletable = user ? canDeleteTask(task, user.uid, role) : false;
                return (
                  <tr key={task.id}>
                    <td className="grade-summary-cell">
                      <strong>{task.summary}</strong>
                      {task.description && <span>{task.description}</span>}
                    </td>
                    <td className="score-value">{task.score}</td>
                    <td>
                      <StatusPill status={task.status} />
                    </td>
                    <td>
                      <PriorityTag priority={task.priority} />
                    </td>
                    <td>{formatDateKey(task.dueDate)}</td>
                    <td>{task.assigneeName ?? "—"}</td>
                    <td>{formatDate(new Date(task.createdAt))}</td>
                    <td>
                      <button
                        className="comment-icon-btn"
                        onClick={() => setCommenting(task)}
                        aria-label={`Comentários de ${task.summary}`}
                        title="Comentários"
                      >
                        <ChatBubbleIcon />
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        {editable && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(task)} title="Editar">
                            <EditIcon />
                          </button>
                        )}
                        {deletable && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeleting(task)}
                            title="Excluir"
                            style={{ color: "var(--danger)" }}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <TaskFormModal task={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
      {commenting && <CommentsPanel task={commenting} onClose={() => setCommenting(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Excluir atividade"
          message={`Tem certeza que deseja excluir "${deleting.summary}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          busy={deleteBusy}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

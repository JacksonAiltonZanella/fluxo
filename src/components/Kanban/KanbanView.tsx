import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTasks, type TaskWithScore } from "../../hooks/useTasks";
import { canEditTask } from "../../utils/permissions";
import { updateTaskStatus } from "../../firebase/tasks";
import { STATUS_OPTIONS, type TaskStatus } from "../../types";
import { KanbanColumn } from "./KanbanColumn";
import { CommentsPanel } from "../Comments/CommentsPanel";
import { ErrorBanner, LoadingBlock } from "../common/UI";

export function KanbanView() {
  const { user, role } = useAuth();
  const { tasks, loading, error } = useTasks(user?.uid ?? null, role);
  const [commenting, setCommenting] = useState<TaskWithScore | null>(null);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskWithScore[]> = {
      Pendente: [],
      "Em andamento": [],
      Acompanhar: [],
      Pronto: [],
    };
    for (const task of tasks) map[task.status].push(task);
    for (const status of STATUS_OPTIONS) map[status].sort((a, b) => b.score - a.score);
    return map;
  }, [tasks]);

  const canEditMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!user) return map;
    for (const task of tasks) map[task.id] = canEditTask(task, user.uid, role);
    return map;
  }, [tasks, user, role]);

  const totalDone = byStatus.Pronto.length;

  async function handleDrop(taskId: string, status: TaskStatus) {
    if (!canEditMap[taskId]) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    await updateTaskStatus(taskId, status);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Fluxo</p>
          <h1 className="page-title">Quadro Kanban</h1>
        </div>
        <div className="page-meta">
          <span className="dot" />
          {tasks.length} {tasks.length === 1 ? "item" : "itens"} · {totalDone} concluídos
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <LoadingBlock label="Carregando quadro…" />}

      {!loading && !error && (
        <div className="kanban-board">
          {STATUS_OPTIONS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={byStatus[status]}
              canEditMap={canEditMap}
              onOpenComments={setCommenting}
              onDrop={(taskId, s) => void handleDrop(taskId, s)}
            />
          ))}
        </div>
      )}

      {commenting && <CommentsPanel task={commenting} onClose={() => setCommenting(null)} />}
    </div>
  );
}

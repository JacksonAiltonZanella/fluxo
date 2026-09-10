import { useState } from "react";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, type Task, type TaskPriority, type TaskStatus } from "../../types";
import { createTask, updateTask, updateTaskAssignment } from "../../firebase/tasks";
import { useAuth } from "../../context/AuthContext";
import { useAllUsers } from "../../hooks/useUsers";
import { CloseIcon } from "../common/icons";

interface TaskFormModalProps {
  task: Task | null; // null = criação
  onClose: () => void;
}

export function TaskFormModal({ task, onClose }: TaskFormModalProps) {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const isEdit = Boolean(task);

  const [summary, setSummary] = useState(task?.summary ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "Baixa");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "Pendente");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [assigneeUid, setAssigneeUid] = useState(task?.assigneeUid ?? "");
  const [sharedWith, setSharedWith] = useState<string[]>(task?.sharedWith ?? []);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { users } = useAllUsers(isAdmin);

  function toggleShared(uid: string) {
    setSharedWith((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  }

  async function handleSubmit() {
    if (!user) return;
    if (!summary.trim()) {
      setFormError("Informe um resumo para a atividade.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (isEdit && task) {
        await updateTask(task.id, {
          summary,
          description,
          priority,
          status,
          dueDate: dueDate || null,
        });
        if (isAdmin) {
          const assignee = users.find((u) => u.uid === assigneeUid);
          await updateTaskAssignment(task.id, {
            assigneeUid: assigneeUid || null,
            assigneeName: assignee?.name ?? null,
            sharedWith,
          });
        }
      } else {
        await createTask({
          summary,
          description,
          priority,
          dueDate: dueDate || null,
          ownerUid: user.uid,
          ownerName: user.displayName ?? user.email ?? "Usuário",
        });
      }
      onClose();
    } catch {
      setFormError("Não foi possível salvar a atividade. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop center" onClick={onClose}>
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div>
            <h2>{isEdit ? "Editar atividade" : "Nova atividade"}</h2>
            <p>{isEdit ? "Atualize os dados desta atividade." : "Ela começa com status Pendente."}</p>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </div>

        <div className="form-grid">
          {formError && <div className="error-banner">⚠ {formError}</div>}

          <div className="form-field">
            <label htmlFor="summary">Resumo *</label>
            <input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={140}
              placeholder="Ex.: Revisar jornada de cadastro"
            />
          </div>

          <div className="form-field">
            <label htmlFor="description">Descrição</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="Detalhes da atividade…"
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="priority">Prioridade</label>
              <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="dueDate">Data de previsão</label>
              <input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {isEdit && (
            <div className="form-field">
              <label htmlFor="status">Status</label>
              <select id="status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isEdit && isAdmin && (
            <>
              <div className="form-field">
                <label htmlFor="assignee">Responsável</label>
                <select id="assignee" value={assigneeUid} onChange={(e) => setAssigneeUid(e.target.value)}>
                  <option value="">Sem responsável</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} · {u.email}
                    </option>
                  ))}
                </select>
                <span className="form-hint">O responsável sempre tem acesso de leitura garantido.</span>
              </div>

              <div className="form-field">
                <label>Compartilhar com (acesso de leitura)</label>
                <div className="checkbox-list">
                  {users.length === 0 && <span className="form-hint">Nenhum outro usuário cadastrado ainda.</span>}
                  {users
                    .filter((u) => u.uid !== task?.ownerUid)
                    .map((u) => (
                      <label className="checkbox-row" key={u.uid}>
                        <input
                          type="checkbox"
                          checked={sharedWith.includes(u.uid)}
                          onChange={() => toggleShared(u.uid)}
                        />
                        {u.name} · {u.email}
                      </label>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="panel-footer">
          <button className="btn" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

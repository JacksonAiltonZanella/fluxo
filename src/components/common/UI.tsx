import type { ReactNode } from "react";
import type { EffectiveRole, TaskPriority, TaskStatus } from "../../types";
import { roleLabel } from "../../utils/permissions";

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Carregando" />;
}

export function LoadingBlock({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="loading-block">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner">⚠ {message}</div>;
}

const STATUS_CLASS: Record<TaskStatus, string> = {
  Pendente: "status-pendente",
  "Em andamento": "status-em-andamento",
  Acompanhar: "status-acompanhar",
  Pronto: "status-pronto",
};

export function StatusPill({ status }: { status: TaskStatus }) {
  return <span className={`status-pill ${STATUS_CLASS[status]}`}>{status}</span>;
}

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  Alto: "priority-alto",
  Baixa: "priority-baixa",
  "Para Hoje": "priority-para-hoje",
  "Para Amanhã": "priority-para-amanha",
  "Para essa semana": "priority-para-essa-semana",
  Acompanhar: "priority-acompanhar",
};

export function PriorityTag({ priority }: { priority: TaskPriority }) {
  return <span className={`priority-tag ${PRIORITY_CLASS[priority]}`}>{priority}</span>;
}

export function RoleBadge({ role }: { role: EffectiveRole }) {
  return <span className={`badge badge-role-${role}`}>{roleLabel(role)}</span>;
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  danger,
  onConfirm,
  onCancel,
  busy,
}: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop center" onClick={onCancel}>
      <div className="dialog-panel" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div>
            <h2>{title}</h2>
          </div>
        </div>
        <div style={{ padding: "18px 20px", color: "var(--text-dim)", fontSize: 13.5 }}>{message}</div>
        <div className="panel-footer">
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button className={danger ? "btn btn-danger" : "btn btn-primary"} onClick={onConfirm} disabled={busy}>
            {busy ? "Aguarde…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalShell({
  children,
  onBackdropClick,
  align = "right",
}: {
  children: ReactNode;
  onBackdropClick: () => void;
  align?: "right" | "center";
}) {
  return (
    <div className={`modal-backdrop ${align === "center" ? "center" : ""}`} onClick={onBackdropClick}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}>
        {children}
      </div>
    </div>
  );
}

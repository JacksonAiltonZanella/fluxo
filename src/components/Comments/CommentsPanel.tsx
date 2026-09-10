import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useComments } from "../../hooks/useComments";
import { addComment } from "../../firebase/comments";
import { canComment } from "../../utils/permissions";
import { formatDateTime } from "../../utils/date";
import { CloseIcon } from "../common/icons";
import { EmptyState, ErrorBanner, LoadingBlock } from "../common/UI";
import type { Task } from "../../types";

interface CommentsPanelProps {
  task: Task;
  onClose: () => void;
}

export function CommentsPanel({ task, onClose }: CommentsPanelProps) {
  const { user, role } = useAuth();
  const { comments, loading, error } = useComments(task.id);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const allowed = user ? canComment(task, user.uid, role) : false;

  async function handleSend() {
    if (!user || !text.trim()) return;
    setSending(true);
    try {
      await addComment(task.id, user.uid, user.displayName ?? user.email ?? "Usuário", text);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="comments-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div>
            <h2>Comentários</h2>
            <p>{task.summary}</p>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </div>

        <div className="panel-body">
          {loading && <LoadingBlock label="Carregando comentários…" />}
          {error && <ErrorBanner message={error} />}
          {!loading && !error && comments.length === 0 && (
            <EmptyState title="Nenhum comentário ainda" description="Seja o primeiro a comentar nesta atividade." />
          )}
          {!loading && comments.length > 0 && (
            <div className="comment-timeline">
              {comments.map((c) => (
                <div className="comment-item" key={c.id}>
                  <div className="comment-item-meta">
                    <strong>{c.authorName}</strong>
                    <span>{c.createdAt ? formatDateTime(new Date(c.createdAt)) : "agora"}</span>
                  </div>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {allowed ? (
          <div className="comment-form">
            <textarea
              placeholder="Escreva um comentário…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              maxLength={2000}
            />
            <button className="btn btn-primary" onClick={() => void handleSend()} disabled={sending || !text.trim()}>
              Enviar
            </button>
          </div>
        ) : (
          <div className="readonly-note">Seu papel atual (Leitura) permite apenas visualizar os comentários.</div>
        )}
      </div>
    </div>
  );
}

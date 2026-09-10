import { useState } from "react";
import { useAllUsers } from "../../hooks/useUsers";
import { setUserRole } from "../../firebase/users";
import { effectiveRole, roleLabel } from "../../utils/permissions";
import { formatDateTime } from "../../utils/date";
import { isAdminEmail } from "../../types";
import { EmptyState, ErrorBanner, LoadingBlock } from "../common/UI";
import type { StoredRole } from "../../types";

export function SettingsView() {
  const { users, loading, error } = useAllUsers(true);
  const [savingUid, setSavingUid] = useState<string | null>(null);

  async function handleRoleChange(uid: string, role: StoredRole) {
    setSavingUid(uid);
    try {
      await setUserRole(uid, role);
    } finally {
      setSavingUid(null);
    }
  }

  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Fluxo</p>
          <h1 className="page-title">Configurações</h1>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <LoadingBlock label="Carregando usuários…" />}

      {!loading && !error && sorted.length === 0 && (
        <EmptyState title="Nenhum usuário cadastrado ainda" description="Os usuários aparecem aqui após o primeiro login." />
      )}

      {!loading && sorted.length > 0 && (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Papel</th>
                <th>Primeiro acesso</th>
                <th>Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => {
                const role = effectiveRole(u);
                const locked = isAdminEmail(u.email);
                return (
                  <tr key={u.uid}>
                    <td>
                      <div className="user-cell">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="avatar-fallback">{u.name.slice(0, 1).toUpperCase()}</span>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {locked ? (
                        <span className="badge badge-role-admin">{roleLabel(role)}</span>
                      ) : (
                        <select
                          className="role-select"
                          value={u.role}
                          disabled={savingUid === u.uid}
                          onChange={(e) => void handleRoleChange(u.uid, e.target.value as StoredRole)}
                        >
                          <option value="leitura">Leitura</option>
                          <option value="editor">Editor</option>
                        </select>
                      )}
                    </td>
                    <td>{u.createdAt ? formatDateTime(new Date(u.createdAt)) : "—"}</td>
                    <td>{u.lastAccessAt ? formatDateTime(new Date(u.lastAccessAt)) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

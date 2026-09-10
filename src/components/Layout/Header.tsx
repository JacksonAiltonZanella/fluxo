import { useAuth } from "../../context/AuthContext";
import { RoleBadge } from "../common/UI";

export type Tab = "grade" | "kanban" | "configuracoes";

interface HeaderProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  isAdmin: boolean;
}

export function Header({ tab, onTabChange, isAdmin }: HeaderProps) {
  const { user, profile, role, signOut } = useAuth();

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">F</span>
          Fluxo
        </div>
        <div className="header-user">
          <RoleBadge role={role} />
          <div className="header-user-name">
            <strong>{profile?.name ?? user?.displayName ?? "…"}</strong>
            <span>{profile?.email ?? user?.email}</span>
          </div>
          {user?.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />}
          <button className="btn btn-sm" onClick={() => void signOut()}>
            Sair
          </button>
        </div>
      </header>
      <nav className="app-nav">
        <button className={tab === "grade" ? "active" : ""} onClick={() => onTabChange("grade")}>
          Grade
        </button>
        <button className={tab === "kanban" ? "active" : ""} onClick={() => onTabChange("kanban")}>
          Kanban
        </button>
        {isAdmin && (
          <button
            className={tab === "configuracoes" ? "active" : ""}
            onClick={() => onTabChange("configuracoes")}
          >
            Configurações
          </button>
        )}
      </nav>
    </>
  );
}

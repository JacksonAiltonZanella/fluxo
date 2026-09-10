import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { LoginScreen } from "./components/Login/LoginScreen";
import { Header, type Tab } from "./components/Layout/Header";
import { GradeView } from "./components/Grade/GradeView";
import { KanbanView } from "./components/Kanban/KanbanView";
import { SettingsView } from "./components/Admin/SettingsView";
import { LoadingBlock } from "./components/common/UI";
import { isFirebaseConfigured } from "./firebase/config";

export default function App() {
  const { user, authLoading, profileLoading, role } = useAuth();
  const [tab, setTab] = useState<Tab>("grade");

  if (!isFirebaseConfigured) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="brand">
            <span className="brand-mark">F</span>
            Fluxo
          </div>
          <p>
            Configuração do Firebase ausente. Preencha as variáveis VITE_FIREBASE_* (veja
            .env.example) para habilitar o login e os dados.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="login-screen">
        <LoadingBlock label="Carregando Fluxo…" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (profileLoading) {
    return (
      <div className="login-screen">
        <LoadingBlock label="Preparando seu perfil…" />
      </div>
    );
  }

  const isAdmin = role === "admin";
  const activeTab = tab === "configuracoes" && !isAdmin ? "grade" : tab;

  return (
    <div className="app-shell">
      <Header tab={activeTab} onTabChange={setTab} isAdmin={isAdmin} />
      <main className="app-main">
        {activeTab === "grade" && <GradeView />}
        {activeTab === "kanban" && <KanbanView />}
        {activeTab === "configuracoes" && isAdmin && <SettingsView />}
      </main>
    </div>
  );
}

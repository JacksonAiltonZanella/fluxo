import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { GoogleGlyph } from "../common/icons";
import { isUsingFirebaseEmulators } from "../../firebase/config";

export function LoginScreen() {
  const { signIn, signInAsEmulatorTestUser, signInError } = useAuth();
  const [busy, setBusy] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testName, setTestName] = useState("");

  async function handleSignIn() {
    setBusy(true);
    try {
      await signIn();
    } finally {
      setBusy(false);
    }
  }

  async function handleTestSignIn() {
    if (!testEmail.trim()) return;
    setBusy(true);
    try {
      await signInAsEmulatorTestUser(testEmail.trim(), testName.trim() || testEmail.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark">F</span>
          Fluxo
        </div>
        <p>
          Gestão de atividades em grade e quadro Kanban. Entre com sua conta Google para
          continuar — novos acessos começam com permissão de leitura.
        </p>
        <button className="google-btn" onClick={handleSignIn} disabled={busy}>
          <GoogleGlyph />
          {busy ? "Entrando…" : "Entrar com o Google"}
        </button>
        {signInError && (
          <p style={{ color: "var(--danger)", marginTop: 14, marginBottom: 0 }}>{signInError}</p>
        )}

        {isUsingFirebaseEmulators && (
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px dashed var(--border)", textAlign: "left" }}>
            <p style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 8 }}>
              Modo emulador (apenas desenvolvimento local)
            </p>
            <div className="form-field" style={{ marginBottom: 8 }}>
              <input
                placeholder="email@teste.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <div className="form-field" style={{ marginBottom: 8 }}>
              <input placeholder="Nome" value={testName} onChange={(e) => setTestName(e.target.value)} />
            </div>
            <button className="btn" style={{ width: "100%" }} onClick={handleTestSignIn} disabled={busy}>
              Entrar (emulador)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

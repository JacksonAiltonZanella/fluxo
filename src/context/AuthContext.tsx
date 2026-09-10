import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../firebase/config";
import { signInWithEmulatorTestUser, signInWithGoogle, signOut as firebaseSignOut } from "../firebase/auth";
import { subscribeOwnProfile } from "../firebase/users";
import { effectiveRole } from "../utils/permissions";
import type { EffectiveRole, UserProfile } from "../types";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  role: EffectiveRole;
  /** Carregando o estado de autenticação inicial do Firebase. */
  authLoading: boolean;
  /** Usuário autenticado, mas o documento de perfil ainda não chegou. */
  profileLoading: boolean;
  signIn: () => Promise<void>;
  signInAsEmulatorTestUser: (email: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInError: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) setProfile(null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    const unsub = subscribeOwnProfile(user.uid, (p) => {
      setProfile(p);
      setProfileLoading(false);
    });
    return unsub;
  }, [user]);

  const value = useMemo<AuthState>(() => {
    return {
      user,
      profile,
      role: effectiveRole(profile),
      authLoading,
      profileLoading,
      signInError,
      signIn: async () => {
        setSignInError(null);
        try {
          await signInWithGoogle();
        } catch (err) {
          setSignInError(
            err instanceof Error ? traduzErroLogin(err.message) : "Não foi possível entrar. Tente novamente.",
          );
        }
      },
      signInAsEmulatorTestUser: async (email: string, name: string) => {
        setSignInError(null);
        try {
          await signInWithEmulatorTestUser(email, name);
        } catch (err) {
          setSignInError(err instanceof Error ? err.message : "Falha no login de teste.");
        }
      },
      signOut: () => firebaseSignOut(),
    };
  }, [user, profile, authLoading, profileLoading, signInError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function traduzErroLogin(message: string): string {
  if (message.includes("popup-closed-by-user")) return "Login cancelado.";
  if (message.includes("network")) return "Falha de rede ao tentar entrar. Verifique sua conexão.";
  return "Não foi possível entrar com o Google. Tente novamente.";
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

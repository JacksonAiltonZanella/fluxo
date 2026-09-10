import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import type { StoredRole, UserProfile } from "../types";

interface UserDoc {
  uid: string;
  email: string;
  name: string;
  photoURL: string | null;
  role: StoredRole;
  createdAt: Timestamp | null;
  lastAccessAt: Timestamp | null;
}

function fromDoc(id: string, data: Partial<UserDoc>): UserProfile {
  return {
    uid: id,
    email: data.email ?? "",
    name: data.name ?? data.email ?? "Usuário",
    photoURL: data.photoURL ?? null,
    role: data.role ?? "leitura",
    createdAt: data.createdAt ? data.createdAt.toMillis() : null,
    lastAccessAt: data.lastAccessAt ? data.lastAccessAt.toMillis() : null,
  };
}

/** Assina o próprio perfil do usuário logado (qualquer usuário pode ler o próprio doc). */
export function subscribeOwnProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
): () => void {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    onChange(snap.exists() ? fromDoc(snap.id, snap.data() as Partial<UserDoc>) : null);
  });
}

/** Assina a lista completa de usuários — só resolve para quem tem permissão de admin nas regras. */
export function subscribeAllUsers(
  onChange: (users: UserProfile[]) => void,
  onError: (error: unknown) => void,
): () => void {
  return onSnapshot(
    collection(db, "users"),
    (snap) => {
      onChange(snap.docs.map((d) => fromDoc(d.id, d.data() as Partial<UserDoc>)));
    },
    onError,
  );
}

/** Altera o papel de um usuário entre "leitura" e "editor". Bloqueado nas regras para e-mails admin. */
export async function setUserRole(uid: string, role: StoredRole): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

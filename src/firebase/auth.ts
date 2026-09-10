import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./config";

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  await touchUserProfile(credential.user);
  return credential.user;
}

/**
 * Caminho de login alternativo usado apenas em desenvolvimento local com os
 * emuladores do Firebase (VITE_USE_FIREBASE_EMULATORS=true). O emulador de
 * Auth não consegue completar o fluxo de popup do Google fora de um navegador
 * real, então usamos e-mail/senha do próprio emulador — o restante do app
 * (perfil, regras, papéis) é exercitado exatamente como em produção. Nunca é
 * exposto fora do modo de emulador.
 */
export async function signInWithEmulatorTestUser(email: string, name: string): Promise<User> {
  const password = "fluxo-dev-emulator";
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await touchUserProfile(credential.user);
    return credential.user;
  } catch {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await touchUserProfile(credential.user);
    return credential.user;
  }
}

export function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

/**
 * Garante o documento users/{uid}: cria no primeiro acesso (role "leitura",
 * createdAt e lastAccessAt com timestamp de servidor) ou apenas atualiza
 * lastAccessAt em acessos seguintes. As regras do Firestore restringem uma
 * autoatualização a exatamente o campo lastAccessAt.
 */
export async function touchUserProfile(user: User): Promise<void> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email ?? "",
      name: user.displayName ?? user.email ?? "Usuário",
      photoURL: user.photoURL ?? null,
      role: "leitura",
      createdAt: serverTimestamp(),
      lastAccessAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, { lastAccessAt: serverTimestamp() });
  }
}

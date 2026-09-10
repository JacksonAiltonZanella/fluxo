import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import type { TaskComment } from "../types";

interface CommentDoc {
  text: string;
  authorUid: string;
  authorName: string;
  createdAt: Timestamp | null;
}

function commentFromDoc(snap: QueryDocumentSnapshot<DocumentData>): TaskComment {
  const data = snap.data() as Partial<CommentDoc>;
  return {
    id: snap.id,
    text: data.text ?? "",
    authorUid: data.authorUid ?? "",
    authorName: data.authorName ?? "Usuário",
    createdAt: data.createdAt ? data.createdAt.toMillis() : null,
  };
}

/** Comentários em ordem cronológica (mais antigo primeiro), como uma linha do tempo. */
export function subscribeComments(
  taskId: string,
  onChange: (comments: TaskComment[]) => void,
  onError: (error: unknown) => void,
): () => void {
  const ref = query(collection(db, "tasks", taskId, "comments"), orderBy("createdAt", "asc"));
  return onSnapshot(ref, (snap) => onChange(snap.docs.map(commentFromDoc)), onError);
}

export async function addComment(taskId: string, authorUid: string, authorName: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, "tasks", taskId, "comments"), {
    text: trimmed,
    authorUid,
    authorName,
    createdAt: serverTimestamp(),
  });
}

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import type { EffectiveRole, Task, TaskPriority, TaskStatus } from "../types";

interface TaskDoc {
  summary: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeUid: string | null;
  assigneeName: string | null;
  ownerUid: string;
  ownerName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  sharedWith: string[];
}

function taskFromDoc(snap: QueryDocumentSnapshot<DocumentData>): Task {
  const data = snap.data() as Partial<TaskDoc>;
  return {
    id: snap.id,
    summary: data.summary ?? "",
    description: data.description ?? "",
    status: data.status ?? "Pendente",
    priority: data.priority ?? "Baixa",
    dueDate: data.dueDate ?? null,
    assigneeUid: data.assigneeUid ?? null,
    assigneeName: data.assigneeName ?? null,
    ownerUid: data.ownerUid ?? "",
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ? data.createdAt.toMillis() : Date.now(),
    updatedAt: data.updatedAt ? data.updatedAt.toMillis() : null,
    sharedWith: data.sharedWith ?? [],
  };
}

/**
 * Assina as atividades visíveis ao usuário atual.
 *
 * Importante sobre regras do Firestore: uma consulta sem filtro só é permitida
 * quando a regra vale para QUALQUER documento retornado. Por isso, para quem
 * não é admin, fazemos três consultas filtradas (proprietário, responsável,
 * compartilhado) — cada uma delas provadamente satisfaz a regra de leitura —
 * e combinamos os resultados no cliente. Para admin, uma única consulta geral
 * é suficiente, pois a regra de admin não depende dos dados do documento.
 */
export function subscribeTasksForUser(
  uid: string,
  role: EffectiveRole,
  onChange: (tasks: Task[]) => void,
  onError: (error: unknown) => void,
): () => void {
  const tasksRef = collection(db, "tasks");

  if (role === "admin") {
    return onSnapshot(
      tasksRef,
      (snap) => onChange(snap.docs.map(taskFromDoc)),
      onError,
    );
  }

  const buckets = {
    owner: new Map<string, Task>(),
    assignee: new Map<string, Task>(),
    shared: new Map<string, Task>(),
  };

  function emit() {
    const merged = new Map<string, Task>();
    for (const bucket of Object.values(buckets)) {
      for (const [id, task] of bucket) merged.set(id, task);
    }
    onChange(Array.from(merged.values()));
  }

  const unsubOwner = onSnapshot(
    query(tasksRef, where("ownerUid", "==", uid)),
    (snap) => {
      buckets.owner = new Map(snap.docs.map((d) => [d.id, taskFromDoc(d)]));
      emit();
    },
    onError,
  );
  const unsubAssignee = onSnapshot(
    query(tasksRef, where("assigneeUid", "==", uid)),
    (snap) => {
      buckets.assignee = new Map(snap.docs.map((d) => [d.id, taskFromDoc(d)]));
      emit();
    },
    onError,
  );
  const unsubShared = onSnapshot(
    query(tasksRef, where("sharedWith", "array-contains", uid)),
    (snap) => {
      buckets.shared = new Map(snap.docs.map((d) => [d.id, taskFromDoc(d)]));
      emit();
    },
    onError,
  );

  return () => {
    unsubOwner();
    unsubAssignee();
    unsubShared();
  };
}

export interface NewTaskInput {
  summary: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
  ownerUid: string;
  ownerName: string;
}

export async function createTask(input: NewTaskInput): Promise<string> {
  const ref = await addDoc(collection(db, "tasks"), {
    summary: input.summary.trim(),
    description: input.description.trim(),
    status: "Pendente" satisfies TaskStatus,
    priority: input.priority,
    dueDate: input.dueDate,
    assigneeUid: null,
    assigneeName: null,
    ownerUid: input.ownerUid,
    ownerName: input.ownerName,
    sharedWith: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export interface TaskEditableFields {
  summary: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
}

export async function updateTask(taskId: string, patch: Partial<TaskEditableFields>): Promise<void> {
  await updateDoc(doc(db, "tasks", taskId), { ...patch, updatedAt: serverTimestamp() });
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  await updateDoc(doc(db, "tasks", taskId), { status, updatedAt: serverTimestamp() });
}

export interface AdminTaskFields {
  assigneeUid: string | null;
  assigneeName: string | null;
  sharedWith: string[];
}

export async function updateTaskAssignment(taskId: string, patch: AdminTaskFields): Promise<void> {
  await updateDoc(doc(db, "tasks", taskId), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, "tasks", taskId));
}

/**
 * Tipos centrais do domínio do Fluxo.
 * Mantidos em sincronia com o formato dos documentos gravados no Firestore
 * e com as regras de segurança em firestore.rules.
 */

export const STATUS_OPTIONS = [
  "Pendente",
  "Em andamento",
  "Acompanhar",
  "Pronto",
] as const;

export type TaskStatus = (typeof STATUS_OPTIONS)[number];

export const PRIORITY_OPTIONS = [
  "Alto",
  "Baixa",
  "Para Hoje",
  "Para Amanhã",
  "Para essa semana",
  "Acompanhar",
] as const;

export type TaskPriority = (typeof PRIORITY_OPTIONS)[number];

/** Peso de cada prioridade usado no cálculo do score. */
export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  Alto: 50,
  Baixa: 25,
  "Para Hoje": 200,
  "Para Amanhã": 150,
  "Para essa semana": 125,
  Acompanhar: 201,
};

/** Papel global do usuário, conforme armazenado em users/{uid}.role. */
export type StoredRole = "leitura" | "editor";

/** Papel efetivo, já considerando os e-mails administrativos fixos. */
export type EffectiveRole = "admin" | "editor" | "leitura";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  photoURL: string | null;
  role: StoredRole;
  /** Primeiro acesso — carimbo de servidor, imutável após criado. */
  createdAt: number | null;
  /** Último acesso — atualizado a cada login, carimbo de servidor. */
  lastAccessAt: number | null;
}

export interface Task {
  id: string;
  summary: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null; // formato YYYY-MM-DD
  assigneeUid: string | null;
  assigneeName: string | null;
  ownerUid: string;
  ownerName: string;
  createdAt: number; // epoch ms, timestamp de servidor
  updatedAt: number | null;
  sharedWith: string[]; // uids com acesso de leitura explícito
}

export interface TaskComment {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  createdAt: number | null; // epoch ms, timestamp de servidor
}

export const ADMIN_EMAILS = [
  "jacksonzanella69@gmail.com",
  "jackson.zanella@ciss.com.br",
] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (ADMIN_EMAILS as readonly string[]).includes(email.toLowerCase());
}

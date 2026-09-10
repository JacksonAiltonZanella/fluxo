import { isAdminEmail, type EffectiveRole, type StoredRole, type Task, type UserProfile } from "../types";

/**
 * Papel efetivo do usuário. Os dois e-mails administrativos são sempre
 * "admin", independentemente do campo "role" gravado no documento —
 * espelha exatamente a regra aplicada em firestore.rules.
 */
export function effectiveRole(profile: Pick<UserProfile, "email" | "role"> | null): EffectiveRole {
  if (!profile) return "leitura";
  if (isAdminEmail(profile.email)) return "admin";
  return profile.role;
}

export function roleLabel(role: EffectiveRole): string {
  switch (role) {
    case "admin":
      return "Administrador";
    case "editor":
      return "Editor";
    case "leitura":
      return "Leitura";
  }
}

export function storedRoleFromLabel(role: EffectiveRole): StoredRole {
  return role === "leitura" ? "leitura" : "editor";
}

export function hasReadAccess(task: Task, uid: string, role: EffectiveRole): boolean {
  if (role === "admin") return true;
  if (task.ownerUid === uid) return true;
  if (task.assigneeUid === uid) return true;
  if (task.sharedWith.includes(uid)) return true;
  return false;
}

export function canCreateTask(role: EffectiveRole): boolean {
  return role === "admin" || role === "editor";
}

export function canEditTask(task: Task, uid: string, role: EffectiveRole): boolean {
  if (role === "admin") return true;
  if (role === "editor") return task.ownerUid === uid;
  return false;
}

export function canDeleteTask(_task: Task, _uid: string, role: EffectiveRole): boolean {
  return role === "admin";
}

export function canComment(task: Task, uid: string, role: EffectiveRole): boolean {
  if (role === "leitura") return false;
  return hasReadAccess(task, uid, role);
}

export function canManageUsers(role: EffectiveRole): boolean {
  return role === "admin";
}

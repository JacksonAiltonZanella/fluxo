import { describe, expect, it } from "vitest";
import {
  canComment,
  canCreateTask,
  canDeleteTask,
  canEditTask,
  effectiveRole,
  hasReadAccess,
} from "../permissions";
import type { Task, UserProfile } from "../../types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    summary: "Tarefa",
    description: "",
    status: "Pendente",
    priority: "Alto",
    dueDate: null,
    assigneeUid: null,
    assigneeName: null,
    ownerUid: "owner-uid",
    ownerName: "Dono",
    createdAt: Date.now(),
    updatedAt: null,
    sharedWith: [],
    ...overrides,
  };
}

const reader: Pick<UserProfile, "email" | "role"> = { email: "leitor@example.com", role: "leitura" };
const editor: Pick<UserProfile, "email" | "role"> = { email: "editor@example.com", role: "editor" };
const admin: Pick<UserProfile, "email" | "role"> = { email: "jacksonzanella69@gmail.com", role: "leitura" };
const adminCorp: Pick<UserProfile, "email" | "role"> = { email: "jackson.zanella@ciss.com.br", role: "leitura" };

describe("effectiveRole", () => {
  it("e-mails administrativos são sempre admin, mesmo com role=leitura no banco", () => {
    expect(effectiveRole(admin)).toBe("admin");
    expect(effectiveRole(adminCorp)).toBe("admin");
  });

  it("demais usuários usam o campo role armazenado", () => {
    expect(effectiveRole(reader)).toBe("leitura");
    expect(effectiveRole(editor)).toBe("editor");
  });
});

describe("controle de acesso a atividades", () => {
  it("Leitura não pode criar, editar ou comentar", () => {
    expect(canCreateTask("leitura")).toBe(false);
    const task = makeTask();
    expect(canEditTask(task, "leitor-uid", "leitura")).toBe(false);
    expect(canComment(task, "leitor-uid", "leitura")).toBe(false);
  });

  it("Leitura só enxerga tarefas próprias, atribuídas ou compartilhadas", () => {
    const own = makeTask({ ownerUid: "u1" });
    const assigned = makeTask({ assigneeUid: "u1" });
    const shared = makeTask({ sharedWith: ["u1"] });
    const other = makeTask({ ownerUid: "outro", assigneeUid: "outro2", sharedWith: [] });
    expect(hasReadAccess(own, "u1", "leitura")).toBe(true);
    expect(hasReadAccess(assigned, "u1", "leitura")).toBe(true);
    expect(hasReadAccess(shared, "u1", "leitura")).toBe(true);
    expect(hasReadAccess(other, "u1", "leitura")).toBe(false);
  });

  it("Editor cria e edita apenas as próprias tarefas, mas comenta nas que tem acesso", () => {
    expect(canCreateTask("editor")).toBe(true);
    const own = makeTask({ ownerUid: "editor-uid" });
    const assigned = makeTask({ ownerUid: "outro", assigneeUid: "editor-uid" });
    const noAccess = makeTask({ ownerUid: "outro", assigneeUid: "outro2" });

    expect(canEditTask(own, "editor-uid", "editor")).toBe(true);
    expect(canEditTask(assigned, "editor-uid", "editor")).toBe(false);
    expect(canEditTask(noAccess, "editor-uid", "editor")).toBe(false);

    expect(canComment(assigned, "editor-uid", "editor")).toBe(true);
    expect(canComment(noAccess, "editor-uid", "editor")).toBe(false);
  });

  it("apenas Administrador pode excluir", () => {
    const task = makeTask({ ownerUid: "editor-uid" });
    expect(canDeleteTask(task, "editor-uid", "editor")).toBe(false);
    expect(canDeleteTask(task, "admin-uid", "admin")).toBe(true);
  });

  it("Administrador tem acesso total, inclusive a tarefas de terceiros", () => {
    const task = makeTask({ ownerUid: "outro", assigneeUid: "outro2", sharedWith: [] });
    expect(hasReadAccess(task, "admin-uid", "admin")).toBe(true);
    expect(canEditTask(task, "admin-uid", "admin")).toBe(true);
    expect(canComment(task, "admin-uid", "admin")).toBe(true);
  });
});

import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

/**
 * Testes das regras de segurança do Firestore (firestore.rules), executados
 * contra o emulador local — nenhuma chamada aqui toca um projeto real.
 * Rodar com: npm run test:rules
 */

const ADMIN_EMAIL = "jacksonzanella69@gmail.com";
const ADMIN_EMAIL_2 = "jackson.zanella@ciss.com.br";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-fluxo",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

function ctx(uid: string, email: string) {
  return testEnv.authenticatedContext(uid, { email });
}

async function seed(setup: (adminDb: ReturnType<typeof ctx>["firestore"]) => Promise<void>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setup(context.firestore());
  });
}

describe("users", () => {
  it("um usuário sem sessão não pode ler nem escrever", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "users/u1")));
  });

  it("criação do próprio perfil precisa vir com role leitura e e-mail correspondente", async () => {
    const db = ctx("u1", "pessoa@example.com").firestore();
    await assertFails(
      setDoc(doc(db, "users/u1"), {
        uid: "u1",
        email: "pessoa@example.com",
        name: "Pessoa",
        photoURL: null,
        role: "editor", // tentando entrar já como editor
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, "users/u1"), {
        uid: "u1",
        email: "pessoa@example.com",
        name: "Pessoa",
        photoURL: null,
        role: "leitura",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      }),
    );
  });

  it("usuário não pode elevar o próprio papel via update", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/u1"), {
        uid: "u1",
        email: "pessoa@example.com",
        name: "Pessoa",
        photoURL: null,
        role: "leitura",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
    });
    const db = ctx("u1", "pessoa@example.com").firestore();
    await assertFails(updateDoc(doc(db, "users/u1"), { role: "admin" }));
    await assertFails(updateDoc(doc(db, "users/u1"), { role: "editor" }));
    // mas pode tocar o próprio lastAccessAt
    await assertSucceeds(updateDoc(doc(db, "users/u1"), { lastAccessAt: serverTimestamp() }));
  });

  it("apenas admin pode listar todos os usuários", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/u1"), {
        uid: "u1",
        email: "pessoa@example.com",
        name: "Pessoa",
        photoURL: null,
        role: "leitura",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
    });
    const reader = ctx("u1", "pessoa@example.com").firestore();
    await assertFails(getDocs(collection(reader, "users")));

    const admin = ctx("admin1", ADMIN_EMAIL).firestore();
    await assertSucceeds(getDocs(collection(admin, "users")));
  });

  it("admin pode promover um usuário a editor, mas não rebaixar os e-mails administrativos fixos", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/u1"), {
        uid: "u1",
        email: "pessoa@example.com",
        name: "Pessoa",
        photoURL: null,
        role: "leitura",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
      await setDoc(doc(db, `users/${ADMIN_EMAIL_2}`), {
        uid: ADMIN_EMAIL_2,
        email: ADMIN_EMAIL_2,
        name: "Jackson",
        photoURL: null,
        role: "leitura",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
    });
    const admin = ctx("admin1", ADMIN_EMAIL).firestore();
    await assertSucceeds(updateDoc(doc(admin, "users/u1"), { role: "editor" }));
    await assertFails(updateDoc(doc(admin, `users/${ADMIN_EMAIL_2}`), { role: "leitura" }));
  });
});

describe("tasks — leitura, criação e edição", () => {
  it("usuário Leitura não consegue criar atividade", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/reader"), {
        uid: "reader",
        email: "reader@example.com",
        name: "Leitor",
        photoURL: null,
        role: "leitura",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
    });
    const reader = ctx("reader", "reader@example.com").firestore();
    await assertFails(
      addDoc(collection(reader, "tasks"), {
        summary: "Tarefa nova",
        description: "",
        status: "Pendente",
        priority: "Baixa",
        dueDate: null,
        assigneeUid: null,
        assigneeName: null,
        ownerUid: "reader",
        ownerName: "Leitor",
        sharedWith: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("Leitura só lê tarefas próprias, atribuídas ou compartilhadas", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "tasks/visible-owner"), taskDoc({ ownerUid: "reader" }));
      await setDoc(doc(db, "tasks/visible-assignee"), taskDoc({ ownerUid: "outro", assigneeUid: "reader" }));
      await setDoc(doc(db, "tasks/visible-shared"), taskDoc({ ownerUid: "outro", sharedWith: ["reader"] }));
      await setDoc(doc(db, "tasks/hidden"), taskDoc({ ownerUid: "outro" }));
    });
    const reader = ctx("reader", "reader@example.com").firestore();
    await assertSucceeds(getDoc(doc(reader, "tasks/visible-owner")));
    await assertSucceeds(getDoc(doc(reader, "tasks/visible-assignee")));
    await assertSucceeds(getDoc(doc(reader, "tasks/visible-shared")));
    await assertFails(getDoc(doc(reader, "tasks/hidden")));
  });

  it("consulta por array-contains em sharedWith (list) funciona sem erro de campo indefinido", async () => {
    // Regressão: taskReadable() usava data.ownerUid diretamente, o que falha
    // com "Property ownerUid is undefined" nesta consulta específica de
    // list, mesmo quando todo documento real tem ownerUid. A correção usa
    // data.get('campo', default).
    await seed(async (db) => {
      await setDoc(doc(db, "tasks/compartilhada-com-reader"), taskDoc({ ownerUid: "outro", sharedWith: ["reader"] }));
      await setDoc(doc(db, "tasks/nao-compartilhada"), taskDoc({ ownerUid: "outro" }));
    });
    const reader = ctx("reader", "reader@example.com").firestore();
    const snap = await assertSucceeds(
      getDocs(query(collection(reader, "tasks"), where("sharedWith", "array-contains", "reader"))),
    );
    expect(snap.size).toBe(1);
  });

  it("as três consultas usadas pela grade/kanban (owner, assignee, shared) funcionam como list", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "tasks/own"), taskDoc({ ownerUid: "reader" }));
      await setDoc(doc(db, "tasks/assigned"), taskDoc({ ownerUid: "outro", assigneeUid: "reader" }));
    });
    const reader = ctx("reader", "reader@example.com").firestore();
    const byOwner = await assertSucceeds(
      getDocs(query(collection(reader, "tasks"), where("ownerUid", "==", "reader"))),
    );
    const byAssignee = await assertSucceeds(
      getDocs(query(collection(reader, "tasks"), where("assigneeUid", "==", "reader"))),
    );
    expect(byOwner.size).toBe(1);
    expect(byAssignee.size).toBe(1);
  });

  it("Editor cria a própria atividade sempre com status Pendente", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/editor1"), {
        uid: "editor1",
        email: "editor@example.com",
        name: "Editor",
        photoURL: null,
        role: "editor",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
    });
    const editor = ctx("editor1", "editor@example.com").firestore();

    await assertFails(
      addDoc(collection(editor, "tasks"), {
        summary: "Tarefa",
        description: "",
        status: "Em andamento", // não pode nascer em outro status
        priority: "Baixa",
        dueDate: null,
        assigneeUid: null,
        assigneeName: null,
        ownerUid: "editor1",
        ownerName: "Editor",
        sharedWith: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );

    await assertFails(
      addDoc(collection(editor, "tasks"), {
        summary: "Tarefa",
        description: "",
        status: "Pendente",
        priority: "Baixa",
        dueDate: null,
        assigneeUid: null,
        assigneeName: null,
        ownerUid: "outro-uid", // tentando criar em nome de outro dono
        ownerName: "Editor",
        sharedWith: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );

    await assertSucceeds(
      addDoc(collection(editor, "tasks"), {
        summary: "Tarefa válida",
        description: "",
        status: "Pendente",
        priority: "Alto",
        dueDate: null,
        assigneeUid: null,
        assigneeName: null,
        ownerUid: "editor1",
        ownerName: "Editor",
        sharedWith: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("Editor edita apenas as próprias atividades", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/editor1"), {
        uid: "editor1",
        email: "editor@example.com",
        name: "Editor",
        photoURL: null,
        role: "editor",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
      await setDoc(doc(db, "tasks/own"), taskDoc({ ownerUid: "editor1" }));
      await setDoc(doc(db, "tasks/other"), taskDoc({ ownerUid: "outro" }));
    });
    const editor = ctx("editor1", "editor@example.com").firestore();
    await assertSucceeds(
      updateDoc(doc(editor, "tasks/own"), { status: "Em andamento", updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(editor, "tasks/other"), { status: "Em andamento", updatedAt: serverTimestamp() }),
    );
  });

  it("Editor não pode alterar responsável nem compartilhamento — isso é exclusivo do admin", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/editor1"), {
        uid: "editor1",
        email: "editor@example.com",
        name: "Editor",
        photoURL: null,
        role: "editor",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
      await setDoc(doc(db, "tasks/own"), taskDoc({ ownerUid: "editor1" }));
    });
    const editor = ctx("editor1", "editor@example.com").firestore();
    await assertFails(
      updateDoc(doc(editor, "tasks/own"), { assigneeUid: "editor1", updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(editor, "tasks/own"), { sharedWith: ["alguem"], updatedAt: serverTimestamp() }),
    );
  });

  it("ninguém pode alterar o proprietário ou a data de criação de uma atividade", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "tasks/own"), taskDoc({ ownerUid: "editor1" }));
    });
    const admin = ctx("admin1", ADMIN_EMAIL).firestore();
    await assertFails(
      updateDoc(doc(admin, "tasks/own"), { ownerUid: "outro-uid", updatedAt: serverTimestamp() }),
    );
  });

  it("apenas admin exclui atividades", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/editor1"), {
        uid: "editor1",
        email: "editor@example.com",
        name: "Editor",
        photoURL: null,
        role: "editor",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
      await setDoc(doc(db, "tasks/own"), taskDoc({ ownerUid: "editor1" }));
    });
    const editor = ctx("editor1", "editor@example.com").firestore();
    await assertFails(deleteDoc(doc(editor, "tasks/own")));

    const admin = ctx("admin1", ADMIN_EMAIL).firestore();
    await assertSucceeds(deleteDoc(doc(admin, "tasks/own")));
  });

  it("os dois e-mails administrativos têm acesso total, mesmo sem serem owner/assignee", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "tasks/alheia"), taskDoc({ ownerUid: "outro" }));
    });
    for (const email of [ADMIN_EMAIL, ADMIN_EMAIL_2]) {
      const admin = ctx(`admin-${email}`, email).firestore();
      await assertSucceeds(getDoc(doc(admin, "tasks/alheia")));
      await assertSucceeds(
        updateDoc(doc(admin, "tasks/alheia"), { status: "Pronto", updatedAt: serverTimestamp() }),
      );
    }
  });
});

describe("comentários", () => {
  it("Leitura não pode comentar", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/reader"), {
        uid: "reader",
        email: "reader@example.com",
        name: "Leitor",
        photoURL: null,
        role: "leitura",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
      await setDoc(doc(db, "tasks/t1"), taskDoc({ ownerUid: "reader" }));
    });
    const reader = ctx("reader", "reader@example.com").firestore();
    await assertFails(
      addDoc(collection(reader, "tasks/t1/comments"), {
        text: "Comentário",
        authorUid: "reader",
        authorName: "Leitor",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("Editor comenta em atividades às quais tem acesso, mas não nas demais", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/editor1"), {
        uid: "editor1",
        email: "editor@example.com",
        name: "Editor",
        photoURL: null,
        role: "editor",
        createdAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
      });
      await setDoc(doc(db, "tasks/compartilhada"), taskDoc({ ownerUid: "outro", sharedWith: ["editor1"] }));
      await setDoc(doc(db, "tasks/sem-acesso"), taskDoc({ ownerUid: "outro" }));
    });
    const editor = ctx("editor1", "editor@example.com").firestore();
    await assertSucceeds(
      addDoc(collection(editor, "tasks/compartilhada/comments"), {
        text: "Comentário válido",
        authorUid: "editor1",
        authorName: "Editor",
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      addDoc(collection(editor, "tasks/sem-acesso/comments"), {
        text: "Não deveria entrar",
        authorUid: "editor1",
        authorName: "Editor",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("comentários não podem ser editados nem excluídos", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "tasks/t1"), taskDoc({ ownerUid: "admin1" }));
      await setDoc(doc(db, "tasks/t1/comments/c1"), {
        text: "Original",
        authorUid: "admin1",
        authorName: "Admin",
        createdAt: serverTimestamp(),
      });
    });
    const admin = ctx("admin1", ADMIN_EMAIL).firestore();
    await assertFails(updateDoc(doc(admin, "tasks/t1/comments/c1"), { text: "Editado" }));
    await assertFails(deleteDoc(doc(admin, "tasks/t1/comments/c1")));
  });
});

function taskDoc(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    summary: "Tarefa",
    description: "",
    status: "Pendente",
    priority: "Baixa",
    dueDate: null,
    assigneeUid: null,
    assigneeName: null,
    ownerUid: "owner-uid",
    ownerName: "Dono",
    sharedWith: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

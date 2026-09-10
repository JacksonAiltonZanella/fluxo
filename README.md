# Fluxo

Aplicação web de gestão de atividades em **Grade** (tabela) e **Quadro Kanban**,
com login Google, controle de acesso por papéis e comentários por atividade.
Nome temporário do produto: **Fluxo**.

- **App publicado:** https://jacksonailtonzanella.github.io/fluxo/
- **Repositório:** https://github.com/JacksonAiltonZanella/fluxo
- **Projeto Firebase:** `fluxo-8e8d7` ([console](https://console.firebase.google.com/project/fluxo-8e8d7))

---

## 1. Visão geral

| Aba | O que faz |
|---|---|
| **Grade** | Tabela com todas as atividades visíveis ao usuário: resumo, score, status, prioridade, previsão, responsável, criação e um ícone de comentários. |
| **Kanban** | As mesmas atividades, organizadas em 4 raias por status (Pendente, Em andamento, Acompanhar, Pronto), ordenadas por score decrescente. Cartões podem ser arrastados entre raias por quem tem permissão de edição. |
| **Configurações** | Só para administradores. Lista todos os usuários, papel efetivo, primeiro e último acesso, e permite alternar o papel entre Leitura e Editor. |

A interface é inteiramente em português do Brasil, tema escuro, responsiva
(desktop e celular), com identidade visual própria — inspirada na proposta de
valor de ferramentas como o Monday, mas sem reaproveitar marca, logotipo ou
layout de nenhum produto de terceiros.

## 2. Stack técnica e decisões de arquitetura

- **React 18 + TypeScript + Vite** — SPA estática, hospedada no **GitHub Pages**.
- **Firebase Authentication** (login Google) + **Cloud Firestore** (dados),
  ambos no plano gratuito (Spark).
- **GitHub Actions** builda, testa e publica a cada push em `main`.
- **Nenhum backend próprio.** O Git/GitHub guarda só código — nunca dados de
  usuários, atividades ou comentários. Isso vive inteiramente no Firestore.
- **A autorização real está nas regras do Firestore** (`firestore.rules`), não
  no frontend. A interface apenas *esconde* ações que o papel do usuário não
  tem — quem tenta forçar uma ação pelo console do navegador esbarra nas
  regras do banco, testadas automaticamente (seção 7).
- **Score é sempre calculado no cliente**, nunca lido de um campo gravado no
  banco. Isso elimina de vez a possibilidade de alguém escrever um score
  arbitrário direto no Firestore — não existe campo `score` para escrever.

## 3. Modelo de dados (Firestore)

```
users/{uid}
  uid, email, name, photoURL
  role: "leitura" | "editor"       // papel armazenado (ver seção 4)
  createdAt                        // primeiro acesso, timestamp de servidor, imutável
  lastAccessAt                     // último acesso, timestamp de servidor

tasks/{taskId}
  summary, description
  status: "Pendente" | "Em andamento" | "Acompanhar" | "Pronto"
  priority: "Alto" | "Baixa" | "Para Hoje" | "Para Amanhã" | "Para essa semana" | "Acompanhar"
  dueDate: "YYYY-MM-DD" | null
  assigneeUid, assigneeName        // responsável — só o admin altera
  ownerUid, ownerName              // proprietário — imutável após criado
  sharedWith: [uid, ...]           // acesso de leitura explícito — só o admin altera
  createdAt, updatedAt             // timestamps de servidor

tasks/{taskId}/comments/{commentId}
  text, authorUid, authorName
  createdAt                        // timestamp de servidor
```

## 4. Papéis e permissões

| Papel | Ver | Criar | Editar | Excluir | Comentar | Gerenciar usuários |
|---|---|---|---|---|---|---|
| **Leitura** (padrão de todo novo login) | só o que criou, é responsável ou foi compartilhado | não | não | não | não | não |
| **Editor** | idem | próprias atividades | só as próprias | não | em qualquer atividade que tenha acesso | não |
| **Administrador** | tudo | tudo | tudo | tudo | tudo | sim |

- `jacksonzanella69@gmail.com` e `jackson.zanella@ciss.com.br` são
  administradores **fixos**, verificados por e-mail diretamente nas regras do
  Firestore (`firestore.rules`) — não é um campo que alguém possa editar pela
  interface ou pelo banco.
- Reatribuir responsável e alterar a lista de compartilhamento (`sharedWith`)
  é uma ação exclusiva de administrador — mesmo um Editor dono da atividade
  não pode alterar esses dois campos.
- Ninguém — nem admin — pode alterar o proprietário (`ownerUid`) ou a data de
  criação de uma atividade depois de criada.
- Um usuário nunca pode alterar o próprio papel; só um admin altera o papel
  de terceiros, e as regras impedem rebaixar os dois e-mails fixos.

## 5. Fórmula do score

```
score = peso da prioridade + dias corridos completos desde a criação
```

Dias contados no fuso `America/Sao_Paulo`: no dia da criação o acréscimo é
zero, no dia seguinte é um, e assim por diante. A data de previsão não entra
nessa fórmula. Pesos:

| Prioridade | Peso |
|---|---:|
| Para Hoje | 200 |
| Acompanhar | 201 |
| Para Amanhã | 150 |
| Para essa semana | 125 |
| Alto | 50 |
| Baixa | 25 |

O score é recalculado no cliente a cada carregamento e também exatamente na
virada do dia (sem precisar recarregar a página), o que também reordena a
Grade e o Kanban automaticamente.

## 6. Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com a config do seu projeto Firebase
npm run dev
```

### Modo emulador (sem precisar de um projeto Firebase real)

Útil para desenvolver e testar sem tocar em dados reais:

```bash
npm install -g firebase-tools   # se ainda não tiver
firebase emulators:start --project demo-fluxo --only firestore,auth
```

Em outro terminal:

```bash
echo "VITE_USE_FIREBASE_EMULATORS=true" > .env.development.local
npm run dev
```

A tela de login ganha um atalho "Modo emulador" (e-mail + nome, sem senha)
que usa o emulador de Auth — útil para testar os três papéis (Leitura,
Editor, Administrador) sem precisar de contas Google reais. Esse atalho nunca
aparece fora do modo emulador e não existe no build de produção.

## 7. Testes e qualidade

```bash
npm run typecheck   # TypeScript
npm run lint         # ESLint
npm run test         # testes de unidade (score, permissões) — vitest
npm run test:rules   # regras do Firestore contra o emulador — vitest + firebase emulators
npm run build        # build de produção
```

`test:rules` sobe o emulador do Firestore, roda os testes e derruba o
emulador sozinho — não precisa de nada rodando antes. Ele exige Java (o
emulador do Firestore roda em JVM); os runners do GitHub Actions já vêm com
Java, então isso também roda sozinho no CI a cada push.

Os testes de regras cobrem, entre outros cenários:
- Leitura não consegue criar, editar, comentar nem ler atividade sem acesso;
- Editor só edita as próprias atividades e não altera responsável/compartilhamento;
- apenas os dois e-mails administrativos têm acesso total e não podem ser rebaixados;
- ninguém altera proprietário ou data de criação;
- comentários exigem acesso de leitura à atividade e são imutáveis depois de criados;
- as consultas reais usadas pela Grade/Kanban (por dono, responsável e
  compartilhamento) funcionam como `list` do Firestore — não só como leitura
  de um documento isolado, que é um cenário mais permissivo e esconderia bugs
  de regra (foi assim que encontramos e corrigimos um bug real de acesso a
  campo indefinido em consultas `array-contains` durante o desenvolvimento).

## 8. Publicação

> A publicação atual (`fluxo-8e8d7` + GitHub Pages) já está configurada e
> funcionando. Esta seção documenta como foi feito — útil para recriar o
> ambiente ou entender a arquitetura, não para reconfigurar do zero.

### 8.1 GitHub Pages + Actions (frontend)

Já configurado em `.github/workflows/deploy.yml`. A cada push em `main`:
1. instala dependências, roda lint, typecheck, testes de unidade e de regras;
2. builda o frontend (Vite) injetando a config pública do Firebase a partir de
   **Repository variables** (não segredos — a config web do Firebase é
   pública por design; a segurança real está nas regras do Firestore);
3. publica o resultado no GitHub Pages.

Variáveis a cadastrar em **Settings → Secrets and variables → Actions → Variables**:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

E em **Settings → Pages**, a fonte precisa estar definida como **GitHub
Actions** (não "branch").

### 8.2 Regras do Firestore (opcional, via CI)

Se quiser que o CI também publique `firestore.rules` a cada push, crie uma
conta de serviço do Firebase (**Project settings → Service accounts →
Generate new private key**) e cadastre o JSON como **Secret**
`FIREBASE_SERVICE_ACCOUNT`. Sem esse segredo, o job simplesmente não roda —
nada quebra — e as regras podem ser publicadas manualmente:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project <project-id>
```

### 8.3 Criando o projeto Firebase (passo único, feito por um humano)

Isso exige login com uma conta Google — é o único trecho que não pode ser
automatizado por uma IA:

1. Acesse https://console.firebase.google.com → **Adicionar projeto**.
2. Nas configurações do projeto, adicione um app **Web** e copie os valores
   de config para as variáveis do repositório (seção 8.1).
3. Em **Build → Authentication → Sign-in method**, ative o provedor
   **Google**.
4. Em **Build → Firestore Database**, clique em **Criar banco de dados**
   (modo produção, qualquer região — ex.: `southamerica-east1`).
5. Publique as regras (seção 8.2, manual ou via CI).

Depois disso, qualquer pessoa com uma conta Google pode entrar no app — todo
novo login começa com papel **Leitura**, exceto os dois e-mails
administrativos fixos, que já entram como Administrador.

## 9. Notas de operação

- Durante a configuração inicial, uma tentativa automática de criar o
  projeto ficou registrada no Google Cloud como `fluxo-kanban-app` — é um
  projeto **vazio, sem Firebase e sem custo**, que pode ser excluído a
  qualquer momento em https://console.cloud.google.com/. O projeto real em
  uso é `fluxo-8e8d7`.
- Não há segredo `FIREBASE_SERVICE_ACCOUNT` configurado ainda, então o job
  `deploy-firestore-rules` do CI roda e não faz nada (comportamento
  esperado). As regras já publicadas continuam válidas; para o CI passar a
  publicar novas alterações em `firestore.rules` automaticamente, siga a
  seção 8.2.

## 10. Limitações conhecidas desta primeira versão

- Sem Cloud Functions (fora do plano gratuito para uso continuado) — por
  isso o score é derivado no cliente em vez de recalculado no servidor.
- Comentários não podem ser editados nem excluídos (fazem parte do
  histórico/auditoria da atividade).
- Sem anexos, notificações ou automações — fora de escopo desta versão.

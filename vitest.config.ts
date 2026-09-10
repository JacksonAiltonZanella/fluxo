import { defineConfig } from "vitest/config";

// Testes de unidade ficam em src/**/__tests__ e rodam sem dependências externas.
// Os testes de regras do Firestore (tests/firestore.rules.test.ts) exigem o
// emulador e são executados à parte via `npm run test:rules`.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});

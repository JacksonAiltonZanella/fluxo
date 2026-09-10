import { defineConfig } from "vitest/config";

// Configuração isolada para os testes de regras do Firestore, que exigem o
// emulador rodando em 127.0.0.1:8080 (ver `npm run test:rules`).
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});

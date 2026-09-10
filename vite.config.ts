import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Publicado no GitHub Pages em https://<usuario>.github.io/fluxo/
// então o base precisa corresponder ao nome do repositório.
export default defineConfig({
  base: "/fluxo/",
  plugins: [react()],
  build: {
    outDir: "dist",
    // O bundle inclui o SDK do Firebase; para uma ferramenta interna de uso
    // autenticado o tamanho é aceitável e não justifica code-splitting extra
    // nesta primeira versão.
    chunkSizeWarningLimit: 900,
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves the `@/*` → `./src/*` map from tsconfig.json. Needed even though
    // the tests import their subject relatively: src/lib/verification.ts imports
    // "@/lib/email", so the alias has to work transitively.
    //
    // The Next 16 testing guide (node_modules/next/dist/docs/01-app/02-guides/
    // testing/vitest.md) reaches for the vite-tsconfig-paths plugin here. Vite 8
    // resolves tsconfig paths natively and warns that the plugin is redundant,
    // so this is the same behaviour with one fewer dependency.
    tsconfigPaths: true,
  },
  test: {
    // Every unit under test is pure TypeScript — no DOM, no React render. The
    // AudioBuffer that computePeaks() takes is faked with a Float32Array, and
    // jsdom implements no Web Audio anyway. Add jsdom + @testing-library the day
    // a test renders a component, not before.
    environment: "node",

    // Pinned rather than left to the default glob: this repo accumulates
    // gitignored build scratch (.next/, .open-next/, .wrangler/, and at least one
    // .next-broken-cache-backup/) that a repo-wide scan would walk.
    include: ["src/**/*.test.ts"],

    setupFiles: ["./vitest.setup.ts"],

    // Several suites stub process.env; a leaked stub would make results depend on
    // file order.
    unstubEnvs: true,
    restoreMocks: true,
  },
});

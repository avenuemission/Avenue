import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Layer boundaries (cleanup spec, target structure). A later config object
// replaces an earlier one's no-restricted-imports for the files both match,
// so each narrower block repeats the bans of the wider ones.
const NO_APP = { group: ["@/app", "@/app/*"], message: "lib/ must not import from app/. Move the shared code into lib/ or content/." };
const NO_SERVER_IN_CLIENT = {
  group: ["@/lib/server", "@/lib/server/*", "@/lib/emails/*", "!@/lib/emails/prefs", "!@/lib/emails/topic", "!@/lib/emails/schedule"],
  message: "Client code must not import server modules. Only lib/emails/{prefs,topic,schedule} are shared.",
};
// Server modules without the server-only guard (the Netlify scheduled
// function imports them in plain Node, where server-only throws).
const NO_UNGUARDED_SERVER = {
  group: ["@/lib/server/mail/*", "@/lib/server/adminRead", "@/lib/emails/*", "!@/lib/emails/prefs", "!@/lib/emails/topic", "!@/lib/emails/schedule"],
  message: "This server module has no server-only guard; import it only from route handlers or server code.",
};
const DOMAIN_BANS = [
  { group: ["react", "react/*", "react-dom", "react-dom/*"], message: "lib/domain is pure: no React." },
  { group: ["next", "next/*"], message: "lib/domain is pure: no Next.js." },
  { group: ["@supabase/*"], message: "lib/domain is pure: no Supabase." },
  { group: ["@/lib/server", "@/lib/server/*", "@/lib/client", "@/lib/client/*"], message: "lib/domain is pure: no server or client modules." },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/lib/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [NO_APP] }] },
  },
  {
    files: ["src/lib/domain/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [NO_APP, ...DOMAIN_BANS] }] },
  },
  {
    files: ["src/components/**", "src/hooks/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [NO_SERVER_IN_CLIENT] }] },
  },
  {
    // Pages, layouts and colocated components may be client code. They may
    // import guarded server modules (Next rejects those in client bundles),
    // but not the modules left unguarded for the Netlify function.
    files: ["src/app/**/*.tsx"],
    rules: { "no-restricted-imports": ["error", { patterns: [NO_UNGUARDED_SERVER] }] },
  },
  {
    files: ["src/lib/client/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [NO_APP, NO_SERVER_IN_CLIENT] }] },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

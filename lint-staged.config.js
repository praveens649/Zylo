export default {
  "ReactApp/**/*.{ts,tsx,js,jsx}": () => "pnpm --filter ./ReactApp lint",
  "Server/**/*.{ts,js}": () => "pnpm --filter ./Server lint",
};

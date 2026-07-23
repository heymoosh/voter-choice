// Ambient declaration for side-effect imports of plain CSS files (e.g.
// `import "../styles/print.css";`). Next's own `next/types/global.d.ts`
// already declares `*.module.css`, but not plain `*.css` — TypeScript 6.0's
// new TS2882 diagnostic requires an ambient module for any side-effect
// import TS can't otherwise type.
declare module "*.css";

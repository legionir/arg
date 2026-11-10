#!/usr/bin/env node
// CLI صحنه مرجع (0.234.0 — C-TST-4): چاپ تعداد فرمان‌ها + checksum.
// بدون وابستگی اجرایی (فقط lib + console) — در execute_js هم اجرا می‌شود.
//   node tools/refscene.mjs [seed] [iconKey,iconKey,...]
import { REFSCENE, refSceneCommands, refSceneChecksum } from "./refscene-lib.mjs";
const seed = process.argv[2] !== undefined ? +process.argv[2] : REFSCENE.seed;
const keys = process.argv[3] ? process.argv[3].split(",") : [];
const cmds = refSceneCommands(seed, keys);
console.log("cmds=" + cmds.length + " checksum=" + refSceneChecksum(cmds) + " seed=" + seed);

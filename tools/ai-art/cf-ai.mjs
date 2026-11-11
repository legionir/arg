// Thin Workers AI client for the art pipeline. Uses curl because Node's fetch ignores the sandbox HTTPS proxy.
// Credentials are injected by the proxy; no token is read or stored here.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

let account = null;
function curlJson(args) {
  const out = execFileSync("curl", ["-sS", "-m", "180", ...args], { maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(out.toString());
}
export function accountId() {
  if (account) return account;
  const r = curlJson(["https://api.cloudflare.com/client/v4/accounts"]);
  account = r.result && r.result[0] && r.result[0].id;
  if (!account) throw new Error("no Cloudflare account visible: " + JSON.stringify(r.errors));
  return account;
}
// JSON body models (flux-1-schnell, SDXL, ...) → Buffer (jpeg/png)
export function runJson(model, body) {
  const r = curlJson(["-X", "POST", `https://api.cloudflare.com/client/v4/accounts/${accountId()}/ai/run/${model}`,
    "-H", "Content-Type: application/json", "-d", JSON.stringify(body)]);
  if (!r.success && !(r.result && r.result.image)) throw new Error(model + ": " + JSON.stringify(r.errors || r).slice(0, 300));
  return Buffer.from(r.result.image, "base64");
}
// multipart models (flux-2-*): fields = {name: string | {file: path}}
export function runForm(model, fields) {
  const args = ["-X", "POST", `https://api.cloudflare.com/client/v4/accounts/${accountId()}/ai/run/${model}`];
  for (const [k, v] of Object.entries(fields)) args.push("-F", typeof v === "object" ? `${k}=@${v.file}` : `${k}=${v}`);
  const r = curlJson(args);
  if (!(r.result && r.result.image)) throw new Error(model + ": " + JSON.stringify(r.errors || r).slice(0, 300));
  return Buffer.from(r.result.image, "base64");
}
export const save = (p, buf) => fs.writeFileSync(p, buf);

// Builds the app with fixture photos (one local OK, one broken remote) and serves it.
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";

const target = "src/data/photos.generated.json";
const original = readFileSync(target);
copyFileSync("tests/fixtures/photos.e2e.json", target);
try {
  execSync("npx next build", { stdio: "inherit" });
} finally {
  writeFileSync(target, original);
}
spawn("npx", ["next", "start", "-p", "3200"], { stdio: "inherit" });

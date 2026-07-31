import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const client = join(dist, "client");
const server = join(dist, "server");

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });

for (const file of ["index.html", "styles.css", "app.js"]) {
  await cp(join(root, file), join(client, file));
}

await writeFile(
  join(server, "index.js"),
  `export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
`
);

console.log("站点构建完成");

import {
  copyFile,
  mkdir,
  rm,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
await rm("public/runtime", { recursive: true, force: true });
await mkdir("public/runtime", { recursive: true });
for (const suffix of ["", ".asyncify"])
  for (const extension of ["mjs", "wasm"]) {
    const name = `ort-wasm-simd-threaded${suffix}.${extension}`;
    await copyFile(
      "node_modules/onnxruntime-web/dist/" + name,
      "public/runtime/" + name,
    );
  }
const sections = [await readFile("LICENSE", "utf8")];
const roots = [];
for (const entry of await readdir("node_modules", { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
  const path = "node_modules/" + entry.name;
  if (entry.name.startsWith("@")) {
    for (const child of await readdir(path, { withFileTypes: true }))
      if (child.isDirectory()) roots.push(path + "/" + child.name);
  } else roots.push(path);
}
for (const root of roots) {
  try {
    const pkg = JSON.parse(await readFile(root + "/package.json", "utf8"));
    for (const name of await readdir(root))
      if (/^(licen[cs]e|notice)([.-].*)?$/i.test(name)) {
        sections.push(
          `${pkg.name} ${pkg.version}\n${name}\n` +
            (await readFile(root + "/" + name, "utf8")),
        );
      }
  } catch {}
}
await writeFile(
  "public/third-party-licenses.txt",
  sections.join("\n\n---\n\n"),
);

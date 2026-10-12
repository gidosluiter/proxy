import { copyFile, mkdir,rm } from "node:fs/promises";
await rm('public/runtime',{recursive:true,force:true});
await mkdir("public/runtime", { recursive: true });
for (const suffix of ["", ".asyncify"])
  for (const extension of ["mjs", "wasm"]) {
    const name = `ort-wasm-simd-threaded${suffix}.${extension}`;
    await copyFile(
      "node_modules/onnxruntime-web/dist/" + name,
      "public/runtime/" + name,
    );
  }

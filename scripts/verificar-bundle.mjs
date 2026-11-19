import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";

// Era 420 KiB com as ofertas de todos os cursos no bundle inicial. Com elas por
// curso e sob demanda (dadosCurso.ts) a entrada caiu para ~247 KiB; o teto
// desceu junto para que o ganho não se perca sem ninguém notar.
const LIMITE_ENTRADA_GZIP = 300 * 1024;
const html = readFileSync(join("dist", "index.html"), "utf8");
const entrada = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];

if (!entrada) {
  throw new Error("Não foi possível localizar o JavaScript de entrada em dist/index.html.");
}

const arquivo = join("dist", "assets", basename(entrada));
const bytesGzip = gzipSync(readFileSync(arquivo)).byteLength;
const kib = (bytesGzip / 1024).toFixed(1);

if (bytesGzip > LIMITE_ENTRADA_GZIP) {
  throw new Error(
    `Bundle inicial acima do limite móvel: ${kib} KiB gzip (limite 300 KiB).`,
  );
}

console.log(`Bundle inicial dentro do limite móvel: ${kib} KiB gzip (limite 300 KiB).`);

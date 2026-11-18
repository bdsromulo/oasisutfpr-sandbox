/**
 * Ajustes de texto feitos só na exibição. O dado da matriz, da oferta e do
 * histórico continua como a fonte publica.
 */

/**
 * Conectivos que o português escreve em minúscula no meio de um nome próprio.
 * A matriz e o histórico da UTFPR vêm com cada palavra capitalizada
 * ("Análise E Projeto De Sistemas"), o que lê como texto de máquina.
 */
const CONECTIVOS = new Set([
  "a", "à", "ao", "aos", "as", "às", "com", "da", "das", "de", "do", "dos",
  "e", "em", "na", "nas", "no", "nos", "o", "os", "ou", "para", "pela",
  "pelas", "pelo", "pelos", "por", "sem", "sob",
]);

/**
 * Devolve o nome com os conectivos em minúscula, como em
 * "Análise e Projeto de Sistemas" ou "Fulano de Tal".
 *
 * A primeira e a última palavra ficam como vieram, porque ali a letra costuma
 * ser parte do nome ("A Engenharia...", "Física A", "Grupo E"). Palavras que
 * já chegam todas em maiúscula, como siglas, também não mudam.
 */
export function nomeLegivel(nome: string | null | undefined): string {
  if (!nome) return "";
  const palavras = nome.split(" ");
  const ultima = palavras.length - 1;
  return palavras
    .map((p, i) => {
      if (i === 0 || i === ultima) return p;
      const minuscula = p.toLocaleLowerCase("pt-BR");
      if (!CONECTIVOS.has(minuscula)) return p;
      // "DE" isolado num nome todo em caixa alta é sigla ou cabeçalho, não conectivo.
      if (p.length > 1 && p === p.toLocaleUpperCase("pt-BR")) return p;
      return minuscula;
    })
    .join(" ");
}

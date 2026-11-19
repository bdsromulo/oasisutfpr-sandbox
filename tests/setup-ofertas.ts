// As ofertas de turma chegam por chunk sob demanda no site (dadosCurso.ts).
// Os testes leem `curso.ofertas` de forma síncrona, então tudo é carregado
// antes de cada arquivo de teste rodar.
import { carregarTodasOfertas } from "../src/domain/dadosCurso";

await carregarTodasOfertas();

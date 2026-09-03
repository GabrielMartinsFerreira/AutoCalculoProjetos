import { estrategiaSlim } from "./slim";
import { estrategiaMiterGlass } from "./miterglass";
import { estrategiaSacada } from "./sacada";
import { estrategiaBox } from "./box";
import { estrategiaBoxFlex } from "./boxFlex";
import { estrategiaEspelho } from "./espelho";
import type { EstrategiaCalculoModelo } from "./types";
import type { ProductKey } from "../types";

export type { EstrategiaCalculoModelo, GetValor } from "./types";

const ESTRATEGIAS: Record<string, EstrategiaCalculoModelo> = {
  slim: estrategiaSlim,
  // Slim 8mm é a mesma construção da Slim (10mm) — só muda a espessura do vidro
  // e os valores do catálogo, não a fórmula.
  slim8mm: estrategiaSlim,
  miterglass: estrategiaMiterGlass,
  sacada: estrategiaSacada,
  box: estrategiaBox,
  // Box Flex é INTENCIONALMENTE separado do Box Padrão (id/estratégia/fórmula
  // diferentes) — fórmula proprietária própria, ver lib/calculators/boxFlex.ts.
  boxFlex: estrategiaBoxFlex,
  espelho: estrategiaEspelho,
};

/**
 * Devolve a estratégia de cálculo de um modelo pelo seu id. Modelos sem fórmula
 * própria configurada (ex.: BlindGlass, ou qualquer modelo novo cadastrado pelo
 * usuário) caem na estratégia da Slim como padrão, até terem regras específicas.
 */
export function obterEstrategia(modeloId: string): EstrategiaCalculoModelo {
  return ESTRATEGIAS[modeloId] ?? estrategiaSlim;
}

/**
 * Ids reservados de "item fechado": preço fechado ou fórmula própria, sem ferragens/
 * opcionais universais de divisória (puxador, fechadura, kits de porta...). Tudo que
 * não está aqui é tratado como Divisória (Vãos + Ferragens) pelo carrinho e pelo
 * cálculo — única fonte de verdade dessa regra, usada por lib/useCalculator.ts e pela UI.
 */
export const MODELOS_FECHADOS = ["box", "boxFlex", "espelho"] as const;

export function ehItemFechado(modeloId: string): boolean {
  return (MODELOS_FECHADOS as readonly string[]).includes(modeloId);
}

/** Ferragens/opcionais somados em lib/useCalculator.ts pra qualquer item do tipo Divisória. */
const CHAVES_UNIVERSAIS_DIVISORIA: ProductKey[] = [
  "puxadorH",
  "fechadura",
  "pelicula",
  "laDeVidro",
  "portaPremium",
  "kitPortaSimples",
  "kitPortaDupla",
  "adicionalNoturno",
];
const CHAVES_OPCIONAIS_SACADA: ProductKey[] = ["artEngenheiro", "caixaArCondicionado", "respiroAluminio"];
const CHAVES_ADICIONAIS_ESPELHO: ProductKey[] = [
  "espelhoDesembacador",
  "espelhoRecorteCxLuz",
  "espelhoChassisPerfilU",
  "espelhoTouchScreen",
];

/**
 * TODAS as chaves do catálogo que entram no cálculo de um item deste modelo — as da
 * fórmula estrutural (estratégia) + as dos opcionais somados em lib/useCalculator.ts.
 * Usado pelo Cadastro de Produtos pra mostrar só o que importa pro modelo selecionado
 * (todo modelo carrega o catálogo inteiro no seed, ver seção 4 do CLAUDE.md). Lista
 * vazia = o modelo não lê preço nenhum do catálogo (hoje só o Box Flex).
 */
export function chavesCatalogoDoModelo(modeloId: string): ProductKey[] {
  const chaves = [...obterEstrategia(modeloId).chavesCatalogo];
  if (!ehItemFechado(modeloId)) chaves.push(...CHAVES_UNIVERSAIS_DIVISORIA);
  if (modeloId === "sacada") chaves.push(...CHAVES_OPCIONAIS_SACADA);
  if (modeloId === "espelho") chaves.push(...CHAVES_ADICIONAIS_ESPELHO);
  return chaves;
}

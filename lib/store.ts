import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OPCIONAIS_PADRAO } from "./types";
import type {
  ItemOrcamentoDetalhado,
  Modelo,
  OpcionaisSimplificado,
  OrcamentoDetalhadoDados,
  Product,
  ProductKey,
  ProjectInputs,
  SimplifiedInputs,
  TipoRT,
  Vao,
  VaoSimples,
} from "./types";

const SEED_MODELO_IDS = ["slim", "slim8mm", "miterglass", "blindglass", "sacada", "box", "boxFlex", "espelho"];

/**
 * Referência estável para "nenhum produto ainda". Nunca crie `[]` inline dentro de
 * um seletor do Zustand como fallback — uma referência nova a cada chamada faz o
 * useSyncExternalStore achar que o snapshot mudou sempre, causando loop infinito de
 * render. Modelos novos (sem entrada em productsByModelo) usam esta constante.
 */
export const EMPTY_PRODUCTS: Product[] = [];

const SEED_PRODUCTS: Product[] = [
  { id: "vidro", key: "vidro", nome: "Vidro", unidade: "m²", valor: 580, tipoVaoAssociado: null },
  {
    id: "perfilU",
    key: "perfilU",
    nome: "Perfil U 10mm (Barra 6m)",
    unidade: "un",
    valor: 220,
    tipoVaoAssociado: null,
  },
  {
    id: "tubo2x2",
    key: "tubo2x2",
    nome: "Tubo 2x2 (Barra 6m)",
    unidade: "un",
    valor: 500,
    tipoVaoAssociado: null,
  },
  {
    id: "perfilEngenharia",
    key: "perfilEngenharia",
    nome: "Perfil Engenharia (Barra 6m)",
    unidade: "un",
    valor: 970,
    tipoVaoAssociado: null,
  },
  {
    id: "puxadorH",
    key: "puxadorH",
    nome: "Puxador H 40cm",
    unidade: "un",
    valor: 200,
    tipoVaoAssociado: null,
  },
  {
    id: "fechadura",
    key: "fechadura",
    nome: "Fechadura PT Correr",
    unidade: "un",
    valor: 300,
    tipoVaoAssociado: null,
  },
  {
    id: "pelicula",
    key: "pelicula",
    nome: "Película (Opcional)",
    unidade: "m²",
    valor: 200,
    tipoVaoAssociado: null,
  },
  {
    id: "adicionalNoturno",
    key: "adicionalNoturno",
    nome: "Adicional Noturno (Opcional)",
    unidade: "un/noite",
    valor: 650,
    tipoVaoAssociado: null,
  },
  {
    id: "portaPremium",
    key: "portaPremium",
    nome: "Porta Premium (Opcional)",
    unidade: "un",
    valor: 2500,
    tipoVaoAssociado: null,
  },
  {
    id: "laDeVidro",
    key: "laDeVidro",
    nome: "Lã de Vidro (Opcional)",
    unidade: "m²",
    valor: 150,
    tipoVaoAssociado: null,
  },
  {
    id: "kitPortaSimples",
    key: "kitPortaSimples",
    nome: "Kit Porta Simples",
    unidade: "un",
    valor: 600,
    tipoVaoAssociado: null,
  },
  {
    id: "kitPortaDupla",
    key: "kitPortaDupla",
    nome: "Kit Porta Dupla",
    unidade: "un",
    valor: 920,
    tipoVaoAssociado: null,
  },
  {
    id: "vidroSacadaIncolor",
    key: "vidroSacadaIncolor",
    nome: "Vidro Laminado 10mm INCOLOR (Sacada)",
    unidade: "m²",
    valor: 780,
    tipoVaoAssociado: null,
  },
  {
    id: "vidroSacadaVerde",
    key: "vidroSacadaVerde",
    nome: "Vidro Laminado 10mm VERDE (Sacada)",
    unidade: "m²",
    valor: 930,
    tipoVaoAssociado: null,
  },
  {
    id: "kitSacada2m",
    key: "kitSacada2m",
    nome: "Kit Sacada até 2m",
    unidade: "un",
    valor: 2080,
    tipoVaoAssociado: null,
  },
  {
    id: "kitSacada3m",
    key: "kitSacada3m",
    nome: "Kit Sacada até 3m",
    unidade: "un",
    valor: 2990,
    tipoVaoAssociado: null,
  },
  {
    id: "kitSacada4m",
    key: "kitSacada4m",
    nome: "Kit Sacada até 4m",
    unidade: "un",
    valor: 3900,
    tipoVaoAssociado: null,
  },
  {
    id: "kitSacada6m",
    key: "kitSacada6m",
    nome: "Kit Sacada até 6m",
    unidade: "un",
    valor: 5460,
    tipoVaoAssociado: null,
  },
  {
    id: "artEngenheiro",
    key: "artEngenheiro",
    nome: "ART Engenheiro (Opcional)",
    unidade: "un",
    valor: 450,
    tipoVaoAssociado: null,
  },
  {
    id: "caixaArCondicionado",
    key: "caixaArCondicionado",
    nome: "Caixa Ar Condicionado (Opcional)",
    unidade: "un",
    valor: 4550,
    tipoVaoAssociado: null,
  },
  {
    id: "respiroAluminio",
    key: "respiroAluminio",
    nome: "Respiro Alumínio (Opcional)",
    unidade: "m²",
    valor: 780,
    tipoVaoAssociado: null,
  },
  // Box Padrão — matriz de preço fechado (medida frontal × forma de pagamento).
  { id: "box900Vista", key: "box900Vista", nome: "Box 900mm Abrir — À Vista", unidade: "un", valor: 1070, tipoVaoAssociado: null },
  { id: "box900Cartao", key: "box900Cartao", nome: "Box 900mm Abrir — Cartão", unidade: "un", valor: 1242, tipoVaoAssociado: null },
  { id: "box1000Vista", key: "box1000Vista", nome: "Box 1000mm Correr 2 Pçs — À Vista", unidade: "un", valor: 1116, tipoVaoAssociado: null },
  { id: "box1000Cartao", key: "box1000Cartao", nome: "Box 1000mm Correr 2 Pçs — Cartão", unidade: "un", valor: 1295, tipoVaoAssociado: null },
  { id: "box1200Vista", key: "box1200Vista", nome: "Box 1200mm Correr 2 Pçs — À Vista", unidade: "un", valor: 1207, tipoVaoAssociado: null },
  { id: "box1200Cartao", key: "box1200Cartao", nome: "Box 1200mm Correr 2 Pçs — Cartão", unidade: "un", valor: 1400, tipoVaoAssociado: null },
  { id: "box1330Vista", key: "box1330Vista", nome: "Box 1330mm Correr 2 Pçs — À Vista", unidade: "un", valor: 1276, tipoVaoAssociado: null },
  { id: "box1330Cartao", key: "box1330Cartao", nome: "Box 1330mm Correr 2 Pçs — Cartão", unidade: "un", valor: 1480, tipoVaoAssociado: null },
  { id: "box1500Vista", key: "box1500Vista", nome: "Box 1500mm Correr 2 Pçs — À Vista", unidade: "un", valor: 1344, tipoVaoAssociado: null },
  { id: "box1500Cartao", key: "box1500Cartao", nome: "Box 1500mm Correr 2 Pçs — Cartão", unidade: "un", valor: 1559, tipoVaoAssociado: null },
  { id: "box1800Vista", key: "box1800Vista", nome: "Box 1800mm Correr 4 Pçs — À Vista", unidade: "un", valor: 1521, tipoVaoAssociado: null },
  { id: "box1800Cartao", key: "box1800Cartao", nome: "Box 1800mm Correr 4 Pçs — Cartão", unidade: "un", valor: 1764, tipoVaoAssociado: null },
  { id: "box2000Vista", key: "box2000Vista", nome: "Box 2000mm Correr 4 Pçs — À Vista", unidade: "un", valor: 1632, tipoVaoAssociado: null },
  { id: "box2000Cartao", key: "box2000Cartao", nome: "Box 2000mm Correr 4 Pçs — Cartão", unidade: "un", valor: 1893, tipoVaoAssociado: null },
  { id: "box2200Vista", key: "box2200Vista", nome: "Box 2200mm Correr 4 Pçs — À Vista", unidade: "un", valor: 1753, tipoVaoAssociado: null },
  { id: "box2200Cartao", key: "box2200Cartao", nome: "Box 2200mm Correr 4 Pçs — Cartão", unidade: "un", valor: 2034, tipoVaoAssociado: null },
  // Espelhos — modelos base (material + acabamento), R$/m².
  { id: "espelhoGuardian4mmLapidado", key: "espelhoGuardian4mmLapidado", nome: "Espelho Guardian 4mm — Lapidado", unidade: "m²", valor: 500, tipoVaoAssociado: null },
  { id: "espelhoGuardian4mmBizote", key: "espelhoGuardian4mmBizote", nome: "Espelho Guardian 4mm — Bizote", unidade: "m²", valor: 580, tipoVaoAssociado: null },
  { id: "espelhoGuardian4mmBizoteJuncao", key: "espelhoGuardian4mmBizoteJuncao", nome: "Espelho Guardian 4mm — Bizote c/ Junção", unidade: "m²", valor: 700, tipoVaoAssociado: null },
  { id: "espelhoCebrace5mmLapidado", key: "espelhoCebrace5mmLapidado", nome: "Espelho Cebrace 5mm — Lapidado", unidade: "m²", valor: 700, tipoVaoAssociado: null },
  { id: "espelhoCebrace5mmBizote", key: "espelhoCebrace5mmBizote", nome: "Espelho Cebrace 5mm — Bizote", unidade: "m²", valor: 760, tipoVaoAssociado: null },
  { id: "espelhoCebrace6mmLapidado", key: "espelhoCebrace6mmLapidado", nome: "Espelho Cebrace 6mm — Lapidado", unidade: "m²", valor: 800, tipoVaoAssociado: null },
  { id: "espelhoCebrace6mmBizote", key: "espelhoCebrace6mmBizote", nome: "Espelho Cebrace 6mm — Bizote", unidade: "m²", valor: 870, tipoVaoAssociado: null },
  { id: "espelhoBronzeFume4mmLapidado", key: "espelhoBronzeFume4mmLapidado", nome: "Espelho Bronze/Fumê 4mm — Lapidado", unidade: "m²", valor: 1090, tipoVaoAssociado: null },
  { id: "espelhoBronzeFume4mmBizote", key: "espelhoBronzeFume4mmBizote", nome: "Espelho Bronze/Fumê 4mm — Bizote", unidade: "m²", valor: 1130, tipoVaoAssociado: null },
  // Espelhos — modelos especiais (preço fechado por m², anula o modelo base).
  { id: "espelhoOrganicoComMoldura", key: "espelhoOrganicoComMoldura", nome: "Espelho Orgânico c/ Moldura", unidade: "m²", valor: 1600, tipoVaoAssociado: null },
  { id: "espelhoOrganico", key: "espelhoOrganico", nome: "Espelho Orgânico", unidade: "m²", valor: 1300, tipoVaoAssociado: null },
  { id: "espelhoOrganicoComLed", key: "espelhoOrganicoComLed", nome: "Espelho Orgânico c/ Led", unidade: "m²", valor: 1800, tipoVaoAssociado: null },
  { id: "espelhoLedFrontal", key: "espelhoLedFrontal", nome: "Espelho Led Frontal", unidade: "m²", valor: 1500, tipoVaoAssociado: null },
  { id: "espelhoLedExpandido", key: "espelhoLedExpandido", nome: "Espelho Led Expandido", unidade: "m²", valor: 1200, tipoVaoAssociado: null },
  { id: "espelhoOvalComMoldura", key: "espelhoOvalComMoldura", nome: "Espelho Oval c/ Moldura", unidade: "m²", valor: 1280, tipoVaoAssociado: null },
  { id: "espelhoOvalSemMoldura", key: "espelhoOvalSemMoldura", nome: "Espelho Oval s/ Moldura", unidade: "m²", valor: 950, tipoVaoAssociado: null },
  { id: "espelhoCantoMoeda", key: "espelhoCantoMoeda", nome: "Espelho Canto Moeda", unidade: "m²", valor: 560, tipoVaoAssociado: null },
  { id: "espelhoMeiaLuaComLed", key: "espelhoMeiaLuaComLed", nome: "Espelho Meia Lua com Led", unidade: "m²", valor: 1300, tipoVaoAssociado: null },
  // Espelhos — adicionais/opcionais.
  { id: "espelhoDesembacador", key: "espelhoDesembacador", nome: "Desembaçador Elétrico (Espelho)", unidade: "m²", valor: 1620, tipoVaoAssociado: null },
  { id: "espelhoRecorteCxLuz", key: "espelhoRecorteCxLuz", nome: "Recorte CX de Luz (Espelho)", unidade: "un", valor: 65, tipoVaoAssociado: null },
  { id: "espelhoChassisPerfilU", key: "espelhoChassisPerfilU", nome: "Chassis Perfil U (Espelho)", unidade: "un", valor: 180, tipoVaoAssociado: null },
  { id: "espelhoTouchScreen", key: "espelhoTouchScreen", nome: "Touch Screen (Espelho)", unidade: "un", valor: 200, tipoVaoAssociado: null },
];

/**
 * Chaves de produtos adicionados depois que os primeiros usuários já tinham um
 * catálogo salvo no navegador — precisam ser injetados em todo modelo já
 * existente (não só nos modelos novos), senão o item nunca aparece pra quem já
 * tinha dados persistidos.
 */
const CHAVES_NOVAS_RETROATIVAS: ProductKey[] = [
  "kitPortaSimples",
  "kitPortaDupla",
  "vidroSacadaIncolor",
  "vidroSacadaVerde",
  "kitSacada2m",
  "kitSacada3m",
  "kitSacada4m",
  "kitSacada6m",
  "artEngenheiro",
  "caixaArCondicionado",
  "respiroAluminio",
  // Box Padrão e Espelhos (reforma "Carrinho") — injetados em todo modelo já existente,
  // mesmo os que não usam (mesmo comportamento já aplicado às chaves da Sacada acima).
  "box900Vista",
  "box900Cartao",
  "box1000Vista",
  "box1000Cartao",
  "box1200Vista",
  "box1200Cartao",
  "box1330Vista",
  "box1330Cartao",
  "box1500Vista",
  "box1500Cartao",
  "box1800Vista",
  "box1800Cartao",
  "box2000Vista",
  "box2000Cartao",
  "box2200Vista",
  "box2200Cartao",
  "espelhoGuardian4mmLapidado",
  "espelhoGuardian4mmBizote",
  "espelhoGuardian4mmBizoteJuncao",
  "espelhoCebrace5mmLapidado",
  "espelhoCebrace5mmBizote",
  "espelhoCebrace6mmLapidado",
  "espelhoCebrace6mmBizote",
  "espelhoBronzeFume4mmLapidado",
  "espelhoBronzeFume4mmBizote",
  "espelhoOrganicoComMoldura",
  "espelhoOrganico",
  "espelhoOrganicoComLed",
  "espelhoLedFrontal",
  "espelhoLedExpandido",
  "espelhoOvalComMoldura",
  "espelhoOvalSemMoldura",
  "espelhoCantoMoeda",
  "espelhoMeiaLuaComLed",
  "espelhoDesembacador",
  "espelhoRecorteCxLuz",
  "espelhoChassisPerfilU",
  "espelhoTouchScreen",
];

/**
 * Catálogo de produtos independente por modelo: cada Modelo.id tem sua própria
 * lista. Um modelo novo (cadastrado pelo usuário) nasce sem nenhum produto — é
 * preciso cadastrar cada item manualmente. Editar um valor num modelo nunca
 * afeta os demais.
 */
interface ProductStore {
  productsByModelo: Record<string, Product[]>;
  getProducts: (modeloId: string) => Product[];
  addProduct: (modeloId: string, product: Omit<Product, "id" | "key">) => void;
  updateProduct: (modeloId: string, id: string, product: Omit<Product, "id" | "key">) => void;
  deleteProduct: (modeloId: string, id: string) => void;
  getValor: (modeloId: string, key: Product["key"]) => number;
}

function copiarSeedProducts(): Product[] {
  return SEED_PRODUCTS.map((p) => ({ ...p }));
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      productsByModelo: Object.fromEntries(SEED_MODELO_IDS.map((id) => [id, copiarSeedProducts()])),
      getProducts: (modeloId) => get().productsByModelo[modeloId] ?? EMPTY_PRODUCTS,
      addProduct: (modeloId, product) =>
        set((state) => ({
          productsByModelo: {
            ...state.productsByModelo,
            [modeloId]: [
              ...(state.productsByModelo[modeloId] ?? EMPTY_PRODUCTS),
              { ...product, id: crypto.randomUUID(), key: null },
            ],
          },
        })),
      updateProduct: (modeloId, id, product) =>
        set((state) => ({
          productsByModelo: {
            ...state.productsByModelo,
            [modeloId]: (state.productsByModelo[modeloId] ?? EMPTY_PRODUCTS).map((p) =>
              p.id === id ? { ...p, ...product } : p
            ),
          },
        })),
      deleteProduct: (modeloId, id) =>
        set((state) => ({
          productsByModelo: {
            ...state.productsByModelo,
            [modeloId]: (state.productsByModelo[modeloId] ?? EMPTY_PRODUCTS).filter((p) => p.id !== id),
          },
        })),
      getValor: (modeloId, key) => {
        if (!key) return 0;
        return (get().productsByModelo[modeloId] ?? EMPTY_PRODUCTS).find((p) => p.key === key)?.valor ?? 0;
      },
    }),
    {
      name: "autocalculo-conceito:produtos",
      skipHydration: true,
      merge: (persisted, current) => {
        const persistedState = persisted as
          | { products?: Product[]; productsByModelo?: Record<string, Product[]> }
          | undefined;
        if (!persistedState) return current;

        // Já no formato por modelo: garante tipoVaoAssociado em produtos salvos antes desse
        // campo existir, e adiciona um catálogo completo (cópia do padrão) para qualquer
        // modelo-semente novo que o usuário ainda não tinha (ex.: Slim 8mm) — os modelos
        // que o usuário já tem e já customizou continuam intocados.
        if (persistedState.productsByModelo) {
          const productsByModelo = Object.fromEntries(
            Object.entries(persistedState.productsByModelo).map(([modeloId, produtos]) => {
              const atualizados = produtos.map((p) => ({
                ...p,
                tipoVaoAssociado: p.tipoVaoAssociado ?? null,
                // "Fechadura para porta" foi renomeada — mantém o valor já customizado
                // pelo usuário, só corrige o nome de quem ainda tem o antigo.
                nome: p.key === "fechadura" && p.nome === "Fechadura para porta" ? "Fechadura PT Correr" : p.nome,
              }));
              // Kits de porta são novos: injeta em todo modelo que ainda não tem (modelos
              // já customizados pelo usuário não perdem nada, só ganham os itens que faltam).
              const faltando = CHAVES_NOVAS_RETROATIVAS.filter(
                (key) => !atualizados.some((p) => p.key === key)
              ).map((key) => SEED_PRODUCTS.find((p) => p.key === key)!);
              return [modeloId, [...atualizados, ...faltando]];
            })
          );
          for (const id of SEED_MODELO_IDS) {
            if (!(id in productsByModelo)) {
              productsByModelo[id] = copiarSeedProducts();
            }
          }
          return { ...current, productsByModelo };
        }

        // Formato antigo: catálogo único global. Duplica para cada modelo-semente já
        // conhecido, para não perder nada do que o usuário já tinha configurado —
        // a partir daqui cada um evolui de forma independente.
        if (persistedState.products) {
          const catalogoAntigo = persistedState.products.map((p) => ({
            ...p,
            tipoVaoAssociado: p.tipoVaoAssociado ?? null,
          }));
          return {
            ...current,
            productsByModelo: Object.fromEntries(
              SEED_MODELO_IDS.map((id) => [id, catalogoAntigo.map((p) => ({ ...p }))])
            ),
          };
        }

        return current;
      },
    }
  )
);

const SEED_MODELOS: Modelo[] = [
  { id: "slim", nome: "Divisória Slim", valorM2: 950 },
  { id: "slim8mm", nome: "Divisória Slim 8mm", valorM2: 950 },
  { id: "miterglass", nome: "Divisória MiterGlass", valorM2: 1270 },
  { id: "blindglass", nome: "Divisória BlindGlass", valorM2: 2185 },
  // valorM2 é só um placeholder — a Sacada não é precificada por m² fechado (vidro por
  // cor + kit por largura, ver lib/calculators/sacada.ts), então esse número praticamente
  // não se aplica no Simplificado. Ajuste manual em Modelos se for usar a Sacada lá.
  { id: "sacada", nome: "Sacada", valorM2: 0 },
  // Box, Box Flex e Espelho: mesma ressalva da Sacada acima — preço fechado (Box),
  // fórmula proprietária própria (Box Flex) ou por m² com regras próprias (Espelho),
  // nenhum tem "preço por m² fechado" de verdade. Só existem no Orçamento Detalhado
  // (ver lib/calculators/box.ts, boxFlex.ts e espelho.ts).
  { id: "box", nome: "Box Padrão", valorM2: 0 },
  { id: "boxFlex", nome: "Box Flex", valorM2: 0 },
  { id: "espelho", nome: "Espelhos", valorM2: 0 },
];

interface ModeloStore {
  modelos: Modelo[];
  modeloSelecionadoId: string;
  addModelo: (nome: string, valorM2: number) => void;
  updateModelo: (id: string, dados: Omit<Modelo, "id">) => void;
  deleteModelo: (id: string) => void;
  selecionarModelo: (id: string) => void;
}

export const useModeloStore = create<ModeloStore>()(
  persist(
    (set) => ({
      modelos: SEED_MODELOS,
      modeloSelecionadoId: SEED_MODELOS[0].id,
      addModelo: (nome, valorM2) =>
        set((state) => {
          const novo: Modelo = { id: crypto.randomUUID(), nome, valorM2 };
          return { modelos: [...state.modelos, novo], modeloSelecionadoId: novo.id };
        }),
      updateModelo: (id, dados) =>
        set((state) => ({
          modelos: state.modelos.map((m) => (m.id === id ? { ...m, ...dados } : m)),
        })),
      deleteModelo: (id) =>
        set((state) => {
          const modelos = state.modelos.filter((m) => m.id !== id);
          const modeloSelecionadoId =
            state.modeloSelecionadoId === id ? (modelos[0]?.id ?? "") : state.modeloSelecionadoId;
          return { modelos, modeloSelecionadoId };
        }),
      selecionarModelo: (id) => set({ modeloSelecionadoId: id }),
    }),
    {
      name: "autocalculo-conceito:modelos",
      skipHydration: true,
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ModeloStore> | undefined;
        if (!persistedState?.modelos) return { ...current, ...persistedState };
        return {
          ...current,
          ...persistedState,
          modelos: [
            ...persistedState.modelos.map((m) => ({
              ...m,
              valorM2: m.valorM2 ?? SEED_MODELOS.find((s) => s.id === m.id)?.valorM2 ?? 0,
            })),
            ...SEED_MODELOS.filter(
              (s) => !persistedState.modelos!.some((m) => m.id === s.id)
            ),
          ],
        };
      },
    }
  )
);

export function criarVaoPadrao(): Vao {
  return { id: crypto.randomUUID(), largura: 1, altura: 2.1, tipo: "Fixo" };
}

export function criarVaoSimples(): VaoSimples {
  return { id: crypto.randomUUID(), largura: 1, altura: 2.1 };
}

/** Inputs padrão de UM item novo do carrinho — vale pra Divisória, Box ou Espelho (ver ProjectInputs). */
const INPUTS_ITEM_INICIAL: ProjectInputs = {
  vaos: [{ id: "vao-1", largura: 1, altura: 2.1, tipo: "Fixo" }],
  qtdPuxadores: 0,
  qtdFechaduras: 0,
  incluirPelicula: false,
  incluirLaDeVidro: false,
  qtdPortaPremium: 0,
  qtdNoitesInstalacao: 0,
  qtdKitPortaSimples: 0,
  qtdKitPortaDupla: 0,
  corVidroSacada: "incolor",
  incluirArtEngenheiro: false,
  qtdCaixaArCondicionado: 0,
  m2RespiroAluminio: 0,
  medidaFrontalBox: null,
  tipoPagamentoBox: "vista",
  larguraEspelho: 1,
  alturaEspelho: 1,
  espelhoModeloBase: null,
  espelhoModeloEspecial: null,
  incluirDesembacadorEspelho: false,
  qtdRecorteCxLuzEspelho: 0,
  qtdChassisPerfilUEspelho: 0,
  qtdTouchScreenEspelho: 0,
  incluirJuncaoRevestimentoEspelho: false,
  quantidade: 1,
  larguraBoxFlex: 1,
  alturaBoxFlex: 1,
  dobradicaAvulsa: false,
};

function nomeItemPadrao(modeloId: string, indice: number) {
  if (modeloId === "box") return `Box ${indice}`;
  if (modeloId === "espelho") return `Espelho ${indice}`;
  return `Item ${indice}`;
}

/** Versão dinâmica (id aleatório) — usada em ações do usuário (addItem, reset). */
function criarItemCarrinho(modeloId = "slim", ambiente = "Item 1"): ItemOrcamentoDetalhado {
  return {
    id: crypto.randomUUID(),
    ambiente,
    modeloId,
    inputs: { ...INPUTS_ITEM_INICIAL, vaos: [criarVaoPadrao()] },
  };
}

/** Versão estática (id fixo) — segura pra rodar no carregamento do módulo (SSR incluso). */
function criarItemCarrinhoInicial(): ItemOrcamentoDetalhado {
  return {
    id: "item-1",
    ambiente: "Item 1",
    modeloId: "slim",
    inputs: { ...INPUTS_ITEM_INICIAL, vaos: [{ id: "vao-1", largura: 1, altura: 2.1, tipo: "Fixo" }] },
  };
}

/**
 * Rascunho do Orçamento Detalhado — desde a reforma "Carrinho" (2026-09-01), um
 * projeto tem múltiplos itens independentes (Divisória/Box/Espelho), cada um com seu
 * próprio modelo e inputs. A Reserva Técnica deixou de ser por item e passou a ser do
 * PROJETO INTEIRO (tipoRT/valorRT aqui no nível do draft, não mais dentro de cada
 * `inputs`) — ver `calcularResumoCarrinho` em lib/useCalculator.ts.
 */
interface OrcamentoDetalhadoDraftStore {
  itens: ItemOrcamentoDetalhado[];
  itemAtivoId: string;
  tipoRT: TipoRT;
  valorRT: number;
  addItem: (modeloId?: string) => void;
  removeItem: (id: string) => void;
  renomearItem: (id: string, ambiente: string) => void;
  trocarModeloItem: (id: string, modeloId: string) => void;
  selecionarItem: (id: string) => void;
  setInputsItem: (id: string, inputs: ProjectInputs) => void;
  addVaoItem: (id: string) => void;
  updateVaoItem: (id: string, vaoId: string, vao: Vao) => void;
  removeVaoItem: (id: string, vaoId: string) => void;
  setRT: (tipoRT: TipoRT, valorRT: number) => void;
  /** Substitui o carrinho inteiro — usado ao "Abrir" um orçamento salvo (Meus Orçamentos). */
  setDraft: (dados: OrcamentoDetalhadoDados) => void;
  reset: () => void;
}

export const useOrcamentoDetalhadoDraft = create<OrcamentoDetalhadoDraftStore>()(
  persist(
    (set) => ({
      itens: [criarItemCarrinhoInicial()],
      itemAtivoId: "item-1",
      tipoRT: "fixo",
      valorRT: 0,
      addItem: (modeloId = "slim") =>
        set((state) => {
          const novo = criarItemCarrinho(modeloId, nomeItemPadrao(modeloId, state.itens.length + 1));
          return { itens: [...state.itens, novo], itemAtivoId: novo.id };
        }),
      removeItem: (id) =>
        set((state) => {
          if (state.itens.length <= 1) return state; // sempre sobra pelo menos 1 item
          const itens = state.itens.filter((i) => i.id !== id);
          const itemAtivoId = state.itemAtivoId === id ? itens[0].id : state.itemAtivoId;
          return { itens, itemAtivoId };
        }),
      renomearItem: (id, ambiente) =>
        set((state) => ({ itens: state.itens.map((i) => (i.id === id ? { ...i, ambiente } : i)) })),
      trocarModeloItem: (id, modeloId) =>
        set((state) => ({ itens: state.itens.map((i) => (i.id === id ? { ...i, modeloId } : i)) })),
      selecionarItem: (id) => set({ itemAtivoId: id }),
      setInputsItem: (id, inputs) =>
        set((state) => ({ itens: state.itens.map((i) => (i.id === id ? { ...i, inputs } : i)) })),
      addVaoItem: (id) =>
        set((state) => ({
          itens: state.itens.map((i) =>
            i.id === id ? { ...i, inputs: { ...i.inputs, vaos: [...i.inputs.vaos, criarVaoPadrao()] } } : i
          ),
        })),
      updateVaoItem: (id, vaoId, vao) =>
        set((state) => ({
          itens: state.itens.map((i) =>
            i.id === id
              ? { ...i, inputs: { ...i.inputs, vaos: i.inputs.vaos.map((v) => (v.id === vaoId ? vao : v)) } }
              : i
          ),
        })),
      removeVaoItem: (id, vaoId) =>
        set((state) => ({
          itens: state.itens.map((i) =>
            i.id === id
              ? { ...i, inputs: { ...i.inputs, vaos: i.inputs.vaos.filter((v) => v.id !== vaoId) } }
              : i
          ),
        })),
      setRT: (tipoRT, valorRT) => set({ tipoRT, valorRT }),
      setDraft: (dados) =>
        set({
          itens: dados.itens.length > 0 ? dados.itens : [criarItemCarrinho()],
          itemAtivoId: dados.itens[0]?.id ?? "",
          tipoRT: dados.tipoRT,
          valorRT: dados.valorRT,
        }),
      reset: () => {
        const novo = criarItemCarrinho();
        set({ itens: [novo], itemAtivoId: novo.id, tipoRT: "fixo", valorRT: 0 });
      },
    }),
    {
      name: "autocalculo-conceito:rascunho-detalhado",
      skipHydration: true,
      // Rascunhos salvos antes da reforma "Carrinho" tinham um único `inputs` (sem
      // array de itens, sem RT no nível do draft — RT vinha dentro do próprio inputs).
      // Aqui migramos ambos os formatos com cuidado pra não perder nada já salvo.
      merge: (persisted, current) => {
        const persistedState = persisted as
          | {
              itens?: ItemOrcamentoDetalhado[];
              itemAtivoId?: string;
              tipoRT?: TipoRT;
              valorRT?: number;
              inputs?: (Partial<ProjectInputs> & { tipoRT?: TipoRT; valorRT?: number }) | undefined;
            }
          | undefined;
        if (!persistedState) return current;

        // Já no formato de carrinho: backfill de campos novos em cada item (Box/Espelho,
        // se ainda não existiam) sem perder nada do que já foi customizado.
        if (Array.isArray(persistedState.itens)) {
          const itens = persistedState.itens.map((item) => ({
            ...item,
            inputs: { ...INPUTS_ITEM_INICIAL, ...item.inputs },
          }));
          const itensFinal = itens.length > 0 ? itens : current.itens;
          return {
            ...current,
            itens: itensFinal,
            itemAtivoId:
              persistedState.itemAtivoId && itensFinal.some((i) => i.id === persistedState.itemAtivoId)
                ? persistedState.itemAtivoId
                : itensFinal[0].id,
            tipoRT: persistedState.tipoRT === "percentual" ? "percentual" : "fixo",
            valorRT: typeof persistedState.valorRT === "number" ? persistedState.valorRT : 0,
          };
        }

        // Formato antigo (pré-carrinho, "single-item"): o único `inputs` salvo vira o
        // primeiro item da lista, e a RT que morava dentro dele sobe pro nível do draft.
        // O modelo usado antigamente vivia só no useModeloStore (global, fora deste
        // draft) — não dá pra recuperar com certeza aqui, então assume "slim" (era o
        // padrão original da tela) como fallback; o usuário troca o modelo do item pelo
        // seletor, se precisar.
        if (persistedState.inputs) {
          const antigo = persistedState.inputs;
          const item: ItemOrcamentoDetalhado = {
            id: "item-1",
            ambiente: "Item 1",
            modeloId: "slim",
            inputs: { ...INPUTS_ITEM_INICIAL, ...antigo },
          };
          return {
            ...current,
            itens: [item],
            itemAtivoId: item.id,
            tipoRT: antigo.tipoRT === "percentual" ? "percentual" : "fixo",
            valorRT: typeof antigo.valorRT === "number" ? antigo.valorRT : 0,
          };
        }

        return current;
      },
    }
  )
);

const INPUTS_SIMPLIFICADO_INICIAL: SimplifiedInputs = {
  vaos: [{ id: "vao-simples-1", largura: 1, altura: 2.1 }],
  opcionaisPorModelo: {},
  tipoRT: "fixo",
  valorRT: 0,
  // Sacada, Box e Espelho não têm cálculo por m² de verdade (valorM2 é placeholder 0) —
  // ficam de fora do comparador por padrão. Usuário pode reativar qualquer um a
  // qualquer momento no Painel de Seleção.
  modelosDesmarcados: ["sacada", "box", "boxFlex", "espelho"],
};

/** Ids de modelo sem m² de verdade, adicionados depois de usuários já terem um rascunho
 * salvo — sempre unidos ao array persistido no merge(), pra não aparecerem de surpresa
 * no comparador de quem já usava o Simplificado antes deles existirem (mesmo raciocínio
 * já aplicado à Sacada). Nunca reintroduz um id que o usuário já tenha reativado, porque
 * não dá pra ter removido da lista algo que ainda não existia. */
const MODELOS_SEM_M2_RETROATIVOS = ["box", "boxFlex", "espelho"];

interface OrcamentoSimplificadoDraftStore {
  inputs: SimplifiedInputs;
  setInputs: (inputs: SimplifiedInputs) => void;
  addVao: () => void;
  updateVao: (id: string, vao: VaoSimples) => void;
  removeVao: (id: string) => void;
  setOpcionaisModelo: (modeloId: string, opcionais: Partial<OpcionaisSimplificado>) => void;
  reset: () => void;
}

export const useOrcamentoSimplificadoDraft = create<OrcamentoSimplificadoDraftStore>()(
  persist(
    (set) => ({
      inputs: INPUTS_SIMPLIFICADO_INICIAL,
      setInputs: (inputs) => set({ inputs }),
      addVao: () =>
        set((state) => ({
          inputs: { ...state.inputs, vaos: [...state.inputs.vaos, criarVaoSimples()] },
        })),
      updateVao: (id, vao) =>
        set((state) => ({
          inputs: { ...state.inputs, vaos: state.inputs.vaos.map((v) => (v.id === id ? vao : v)) },
        })),
      removeVao: (id) =>
        set((state) => ({
          inputs: { ...state.inputs, vaos: state.inputs.vaos.filter((v) => v.id !== id) },
        })),
      setOpcionaisModelo: (modeloId, opcionais) =>
        set((state) => ({
          inputs: {
            ...state.inputs,
            opcionaisPorModelo: {
              ...state.inputs.opcionaisPorModelo,
              [modeloId]: {
                ...(state.inputs.opcionaisPorModelo[modeloId] ?? OPCIONAIS_PADRAO),
                ...opcionais,
              },
            },
          },
        })),
      reset: () => set({ inputs: { ...INPUTS_SIMPLIFICADO_INICIAL, vaos: [criarVaoSimples()] } }),
    }),
    {
      name: "autocalculo-conceito:rascunho-simplificado",
      skipHydration: true,
      merge: (persisted, current) => {
        const persistedState = persisted as { inputs?: Record<string, unknown> } | undefined;
        const raw = persistedState?.inputs;
        if (!raw) return current;

        // Formatos antigos tinham largura/altura únicos (pré-vãos múltiplos) em vez de vaos[].
        const vaos: VaoSimples[] = Array.isArray(raw.vaos)
          ? (raw.vaos as VaoSimples[])
          : [
              {
                id: "vao-simples-1",
                largura: typeof raw.largura === "number" ? raw.largura : 1,
                altura: typeof raw.altura === "number" ? raw.altura : 2.1,
              },
            ];

        // Formato anterior tinha opcionais únicos (globais) em vez de por modelo.
        // Migra aplicando a mesma seleção anterior a todos os modelos já cadastrados.
        let opcionaisPorModelo: Record<string, OpcionaisSimplificado>;
        if (raw.opcionaisPorModelo && typeof raw.opcionaisPorModelo === "object") {
          // Preenche com o padrão qualquer campo ausente (ex.: qtdNoitesInstalacao, adicionado
          // depois) em entradas salvas antes dele existir.
          opcionaisPorModelo = Object.fromEntries(
            Object.entries(raw.opcionaisPorModelo as Record<string, Partial<OpcionaisSimplificado>>).map(
              ([modeloId, o]) => [modeloId, { ...OPCIONAIS_PADRAO, ...o }]
            )
          );
        } else {
          const opcionaisGlobaisAntigos: OpcionaisSimplificado = {
            ...OPCIONAIS_PADRAO,
            incluirPelicula: Boolean(raw.incluirPelicula),
            incluirLaDeVidro: Boolean(raw.incluirLaDeVidro),
            qtdPortaPremium: typeof raw.qtdPortaPremium === "number" ? raw.qtdPortaPremium : 0,
          };
          opcionaisPorModelo = Object.fromEntries(
            SEED_MODELOS.map((m) => [m.id, opcionaisGlobaisAntigos])
          );
        }

        const tipoRT: TipoRT = raw.tipoRT === "percentual" ? "percentual" : "fixo";
        const valorRT = typeof raw.valorRT === "number" ? raw.valorRT : 0;
        const modelosDesmarcadosBase = Array.isArray(raw.modelosDesmarcados)
          ? (raw.modelosDesmarcados as string[])
          : INPUTS_SIMPLIFICADO_INICIAL.modelosDesmarcados;
        // Box/Espelho nunca podem ter sido removidos deliberadamente de uma lista que
        // ainda não os conhecia — sempre seguro unir.
        const modelosDesmarcados = Array.from(
          new Set([...modelosDesmarcadosBase, ...MODELOS_SEM_M2_RETROATIVOS])
        );

        return { ...current, inputs: { vaos, opcionaisPorModelo, tipoRT, valorRT, modelosDesmarcados } };
      },
    }
  )
);

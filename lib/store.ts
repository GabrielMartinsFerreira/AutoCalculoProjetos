import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OPCIONAIS_PADRAO } from "./types";
import type {
  Modelo,
  OpcionaisSimplificado,
  Product,
  ProductKey,
  ProjectInputs,
  SimplifiedInputs,
  TipoRT,
  Vao,
  VaoSimples,
} from "./types";

const SEED_MODELO_IDS = ["slim", "slim8mm", "miterglass", "blindglass", "sacada"];

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

const INPUTS_DETALHADO_INICIAL: ProjectInputs = {
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
  tipoRT: "fixo",
  valorRT: 0,
  incluirArtEngenheiro: false,
  qtdCaixaArCondicionado: 0,
  m2RespiroAluminio: 0,
};

interface OrcamentoDetalhadoDraftStore {
  inputs: ProjectInputs;
  setInputs: (inputs: ProjectInputs) => void;
  addVao: () => void;
  updateVao: (id: string, vao: Vao) => void;
  removeVao: (id: string) => void;
  reset: () => void;
}

export const useOrcamentoDetalhadoDraft = create<OrcamentoDetalhadoDraftStore>()(
  persist(
    (set) => ({
      inputs: INPUTS_DETALHADO_INICIAL,
      setInputs: (inputs) => set({ inputs }),
      addVao: () =>
        set((state) => ({
          inputs: { ...state.inputs, vaos: [...state.inputs.vaos, criarVaoPadrao()] },
        })),
      updateVao: (id, vao) =>
        set((state) => ({
          inputs: { ...state.inputs, vaos: state.inputs.vaos.map((v) => (v.id === id ? vao : v)) },
        })),
      removeVao: (id) =>
        set((state) => ({
          inputs: { ...state.inputs, vaos: state.inputs.vaos.filter((v) => v.id !== id) },
        })),
      reset: () => set({ inputs: { ...INPUTS_DETALHADO_INICIAL, vaos: [criarVaoPadrao()] } }),
    }),
    {
      name: "autocalculo-conceito:rascunho-detalhado",
      skipHydration: true,
      // Rascunhos salvos antes do campo "Lã de Vidro" existir não o têm — preenche com o padrão.
      merge: (persisted, current) => {
        const persistedState = persisted as { inputs?: Partial<ProjectInputs> } | undefined;
        if (!persistedState?.inputs) return current;
        return {
          ...current,
          inputs: { ...INPUTS_DETALHADO_INICIAL, ...persistedState.inputs },
        };
      },
    }
  )
);

const INPUTS_SIMPLIFICADO_INICIAL: SimplifiedInputs = {
  vaos: [{ id: "vao-simples-1", largura: 1, altura: 2.1 }],
  opcionaisPorModelo: {},
  tipoRT: "fixo",
  valorRT: 0,
  // Sacada não tem cálculo por m² de verdade (valorM2 é placeholder 0) — fica de fora do
  // comparador por padrão. Usuário pode reativá-la a qualquer momento no Painel de Seleção.
  modelosDesmarcados: ["sacada"],
};

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
        const modelosDesmarcados = Array.isArray(raw.modelosDesmarcados)
          ? (raw.modelosDesmarcados as string[])
          : INPUTS_SIMPLIFICADO_INICIAL.modelosDesmarcados;

        return { ...current, inputs: { vaos, opcionaisPorModelo, tipoRT, valorRT, modelosDesmarcados } };
      },
    }
  )
);

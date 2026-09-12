import type { MarketplaceSlug } from "@/lib/marketplace";

export type TipoConversao = "shopee" | "tag_url" | "awin" | "manual";

export type LojaConfig = {
  id: MarketplaceSlug;
  nome: string;
  tipo: TipoConversao;
  labelIdentificador: string;
  labelIdentificador2?: string;
  temSecret: boolean;
  labelSecret?: string;
  arriscado?: boolean;
  avisoArriscado?: string;
  descricao: string;
};

/**
 * Registro central de lojas suportadas -- alimenta os cards do painel admin
 * E a conversão de afiliado em resolverAfiliacao(). Adicionar uma loja nova
 * é só adicionar uma entrada aqui (mais o `case` correspondente em
 * resolverAfiliacao se o tipo de conversão for novo).
 */
export const LOJAS: LojaConfig[] = [
  {
    id: "shopee",
    nome: "Shopee",
    tipo: "shopee",
    labelIdentificador: "App ID",
    temSecret: true,
    labelSecret: "App Secret",
    descricao: "API oficial de afiliados. Converte o link e busca imagem/preço/título automaticamente.",
  },
  {
    id: "amazon",
    nome: "Amazon",
    tipo: "tag_url",
    labelIdentificador: "Tag de afiliado (Amazon Associates)",
    temSecret: false,
    arriscado: true,
    avisoArriscado:
      "Os termos do Amazon Associates restringem o uso da sua tag em links colados por outra pessoa (o criador da lista, não você). Ativar isso é uma decisão sua -- pode colocar a conta de afiliado em risco perante a Amazon.",
    descricao: "Anexa sua tag de afiliado ao link do produto (?tag=...).",
  },
  {
    id: "mercado_livre",
    nome: "Mercado Livre",
    tipo: "manual",
    labelIdentificador: "Código/identificador de afiliado",
    temSecret: false,
    descricao:
      "O Mercado Livre não tem uma API pública de afiliados documentada. O campo fica salvo, mas a conversão automática só entra quando soubermos o mecanismo exato.",
  },
  {
    id: "shein",
    nome: "SHEIN",
    tipo: "awin",
    labelIdentificador: "Publisher ID (Awin)",
    labelIdentificador2: "Merchant ID da SHEIN na Awin",
    temSecret: false,
    descricao: "Via rede de afiliados Awin -- link de redirecionamento (deep link), sem API.",
  },
  {
    id: "temu",
    nome: "Temu",
    tipo: "awin",
    labelIdentificador: "Publisher ID (Awin)",
    labelIdentificador2: "Merchant ID da Temu na Awin",
    temSecret: false,
    descricao: "Via rede de afiliados Awin -- link de redirecionamento (deep link), sem API.",
  },
  {
    id: "magalu",
    nome: "Magazine Luiza",
    tipo: "awin",
    labelIdentificador: "Publisher ID (Awin)",
    labelIdentificador2: "Merchant ID da Magalu na Awin",
    temSecret: false,
    descricao: "Via rede de afiliados Awin -- link de redirecionamento (deep link), sem API.",
  },
];

export function lojaPorId(id: string): LojaConfig | undefined {
  return LOJAS.find((l) => l.id === id);
}

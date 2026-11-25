// Catálogo de itens. `name` não leva artigo: entra direto em frases com {item}.
// scope: "general" (bebê em diante) ou o id do estágio ("baby", "pup").
// A arte (grade + âncora por estágio) entra aos poucos: T10 prova com 3 itens, T11 a T13 completam.

// Deslocamento vertical da cabeça em cada estágio, em relação ao adulto.
const STAGE_DY = { adult: 0, young: 0, pup: 3, baby: 6 };

// Arte por estágio, a partir da grade e da posição (x, y) no adulto. `overrides`
// troca grade ou posição de um estágio (y absoluto), para itens que não cabem
// entre as orelhas do bebê, por exemplo.
function art(grid, x, y, overrides = {}) {
  return Object.fromEntries(
    Object.entries(STAGE_DY).map(([stage, dy]) => [stage, { grid, x, y: y + dy, ...overrides[stage] }]),
  );
}

export const CATALOG = [
  // gerais: cabeça
  {
    id: "festa", name: "chapéu de festa", slot: "head", scope: "general",
    art: art(["..yy..", "..oo..", ".orro.", "orbrbo"], 5, 0, {
      baby: { grid: [".yy.", ".oo.", "orro", "orbo"], x: 6, y: 6 },
    }),
  },
  {
    id: "coroa", name: "coroa", slot: "head", scope: "general",
    art: art(["y.yy.y", "yyyyyy", "yryyry"], 5, 1, {
      baby: { grid: ["y..y", "yyyy", "yrry"], x: 6, y: 7 },
    }),
  },
  {
    id: "gorro", name: "gorro de lã", slot: "head", scope: "general",
    art: art(["..yy..", ".bbbb.", "bbbbbb", "rrrrrr"], 5, 1, {
      baby: { grid: [".yy.", "bbbb", "bbbb", "rrrr"], x: 6, y: 7 },
    }),
  },
  {
    id: "bone", name: "boné", slot: "head", scope: "general",
    art: art(["..rrrr..", ".rrrrrr.", "yyyyyyyy"], 4, 2, {
      baby: { grid: [".rrrr.", ".rrrr.", "yyyyyy"], x: 5, y: 8 },
    }),
  },
  {
    id: "pirata", name: "chapéu de pirata", slot: "head", scope: "general",
    art: art(["...kkkk...", "..kkkkkk..", ".kkkwwkkk.", "kkkkkkkkkk"], 3, 1, {
      baby: { grid: ["..kkkk..", "..kwwk..", "kkkkkkkk"], x: 4, y: 8 },
    }),
  },
  {
    // Fica na base da orelha direita, no mesmo lugar em todos os estágios.
    id: "laco", name: "laço", slot: "head", scope: "general",
    art: art(["rr.rr", "rryrr", "rr.rr"], 9, 2),
  },
  {
    id: "flor", name: "flor", slot: "head", scope: "general",
    art: art([".p.", "pyp", ".p."], 11, 2),
  },

  // gerais: rosto
  {
    id: "oculos-sol", name: "óculos de sol", slot: "face", scope: "general",
    art: art(["kwkkkkkkwk", "kkk....kkk"], 3, 6),
  },
  {
    // Lentes 4x4 em aro fino e dourado: o olho aparece dentro. Com lentes de 3x3, ou com
    // aro preto, o aro engolia o olho e o item virava um bloco preto, igual ao óculos de sol.
    id: "oculos-redondos", name: "óculos redondos", slot: "face", scope: "general",
    art: art([".yy....yy.", "y..yyyy..y", "y..y..y..y", ".yy....yy."], 3, 5),
  },
  {
    // Fica logo abaixo do nariz; no bebê o nariz é uma linha mais perto dos olhos.
    id: "bigode", name: "bigode", slot: "face", scope: "general",
    art: art(["k......k", ".kkkkkk."], 4, 8, { baby: { y: 13 } }),
  },
  {
    id: "mascara", name: "máscara de herói", slot: "face", scope: "general",
    art: art(["bbbbbbbbbb", "b.bbbbbb.b", ".bb....bb."], 3, 5),
  },
  {
    id: "monoculo", name: "monóculo", slot: "face", scope: "general",
    art: art(["yyy", "y.y", "yyy", "..y"], 10, 5),
  },

  // gerais: mão
  {
    id: "balao", name: "balão", slot: "hold", scope: "general",
    art: art([".bb.", "blbb", "bbbb", ".bb.", "..b.", ".k.."], -2, 10, {
      pup: { grid: [".bb.", "blbb", ".bb.", ".k.."], y: 12 },
      baby: { grid: [".bb.", "blbb", ".bb.", ".k.."], y: 12 },
    }),
  },
  {
    id: "pirulito", name: "pirulito", slot: "hold", scope: "general",
    // Fica na margem esquerda, ao lado do corpo (a cauda do adulto ocupa o lado direito).
    art: art([".oo.", "oyro", "orro", ".oo.", ".o..", ".o.."], -2, 10, {
      pup: { grid: [".oo.", "oyro", ".oo.", ".o.."], x: -2, y: 12 },
      baby: { grid: [".oo.", "oyro", ".oo.", ".o.."], x: -2, y: 12 },
    }),
  },
  {
    id: "livro", name: "livro", slot: "hold", scope: "general",
    // Capa vermelha com detalhe dourado. Borda marrom se fundia com o contorno do corpo.
    art: art(["rrrr", "ryyr", "ryyr", "rrrr"], -2, 11, {
      pup: { grid: ["rrrr", "ryyr", "rrrr"], y: 13 },
      baby: { grid: ["rrrr", "ryyr", "rrrr"], y: 13 },
    }),
  },
  {
    id: "cafe", name: "xícara de café", slot: "hold", scope: "general",
    art: art([".g..", "..g.", "bbb.", "bbbo", "bbb."], -2, 11, {
      pup: { grid: ["g...", "bbb.", "bbbo", "bbb."], y: 12 },
      baby: { grid: ["g...", "bbb.", "bbbo", "bbb."], y: 12 },
    }),
  },
  {
    id: "estrelinha", name: "estrelinha", slot: "hold", scope: "general",
    art: art([".y.", "yyy", ".y."], -2, 11, { pup: { y: 12 }, baby: { y: 12 } }),
  },

  // só no bebê
  // Itens de estágio têm arte só no estágio deles, então a posição é absoluta.
  {
    id: "touquinha", name: "touquinha", slot: "head", scope: "baby",
    art: { baby: { grid: ["...pp...", "..pppp..", "pppppppp"], x: 4, y: 9 } },
  },
  {
    // O escudo fica logo abaixo do nariz e a argola pende sobre o contorno do queixo.
    id: "chupeta", name: "chupeta", slot: "face", scope: "baby",
    art: { baby: { grid: ["pppp", ".yy."], x: 6, y: 14 } },
  },
  {
    id: "chocalho", name: "chocalho", slot: "hold", scope: "baby",
    art: { baby: { grid: [".y..", ".pp.", "pypp", ".pp."], x: -2, y: 12 } },
  },
  {
    id: "ursinho", name: "ursinho", slot: "hold", scope: "baby",
    art: { baby: { grid: ["t..t", "tkkt", "tttt", "tttt"], x: -2, y: 12 } },
  },

  // só no filhote
  {
    id: "fita", name: "fita de cabeça", slot: "head", scope: "pup",
    art: { pup: { grid: [".........rr.", "rrrrrrrrryrr"], x: 2, y: 7 } },
  },
  {
    // Branco sobre o creme quase some, então leva uma borda azul clara embaixo (a
    // sombra cinza lia como bigode cinza, não como leite).
    id: "bigode-leite", name: "bigode de leite", slot: "face", scope: "pup",
    art: { pup: { grid: ["m..m", "mmmm", "llll"], x: 6, y: 11 } },
  },
  {
    id: "bola", name: "bola", slot: "hold", scope: "pup",
    art: { pup: { grid: [".rr.", "yyyy", "bbbb", ".bb."], x: -2, y: 12 } },
  },
  {
    id: "osso", name: "ossinho de borracha", slot: "hold", scope: "pup",
    art: { pup: { grid: ["y..y", "yyyy", "y..y"], x: -2, y: 13 } },
  },
];

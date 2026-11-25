// Sprites 16x16 como grades de texto. '.' = transparente; outras letras = PALETTE.
export const PALETTE = {
  o: "#3b2a20", // contorno
  f: "#ee8a2f", // laranja
  w: "#fff1dc", // creme
  k: "#1b1b1b", // olhos e nariz
  r: "#e0405a",
  y: "#ffd23f",
  b: "#3a7bd5",
  p: "#f06292", // rosa
  g: "#9e9e9e", // cinza (vapor)
  l: "#90caf9", // azul claro (brilho)
  t: "#c68642", // bege escuro (ursinho)
  m: "#ffffff", // branco puro (leite)
};

const ADULT = [
  "................",
  "..oo........oo..",
  ".offo......offo.",
  ".offfo....offfo.",
  ".offfoooooofffo.",
  "offffffffffffffo",
  "offfkffffffkfffo",
  "owwwffffffffwwwo",
  "owwwwwwkkwwwwwwo",
  ".owwwwwwwwwwwwo.",
  "..oowwwwwwwwoo..",
  "..offfwwwwfffoo.",
  "..offfwwwwfffofo",
  "..offffffffffowo",
  "..ooooooooooooo.",
  "................",
];

// Jovem: igual ao adulto, sem a cauda (colunas 14 e 15 das linhas 11 a 14).
const YOUNG = ADULT.map((row, i) => (i >= 11 && i <= 14 ? row.slice(0, 14) + ".." : row));

// Filhote: cabeça do adulto com um corpinho.
const PUP = [
  ...Array(4).fill("................"),
  ...ADULT.slice(1, 11),
  "...offwwwwffo...",
  "...oooooooooo...",
];

const BABY = [
  ...Array(8).fill("................"),
  "....oo....oo....",
  "...offo..offo...",
  "..offooooooffo..",
  "..offffffffffo..",
  "..ofkffffffkfo..",
  "..owwwwkkwwwwo..",
  "...owwwwwwwwo...",
  "....oooooooo....",
];

const EGG = [
  "................",
  "................",
  "................",
  "......oooo......",
  ".....owwwwo.....",
  "....owwfwwwo....",
  "...owwwwwwwwo...",
  "...owwwwwffwo...",
  "..owwwwwwwwwwo..",
  "..owwfwwwwwwwo..",
  "..owwwwwwwwwwo..",
  "...owwwffwwwo...",
  "...owwwwwwwwo...",
  "....owwwwwwo....",
  ".....oooooo.....",
  "................",
];

export const SPRITES = { egg: EGG, baby: BABY, pup: PUP, young: YOUNG, adult: ADULT };

export const STAGE_LABEL = {
  egg: "ovo",
  baby: "bebê",
  pup: "filhote",
  young: "jovem",
  adult: "adulto",
};

export function spriteFor(stageId) {
  return SPRITES[stageId];
}

// Desenha a grade no canvas, do tamanho da própria grade (o CSS escala com pixels nítidos).
export function drawSprite(canvas, grid) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
}

// Camadas de baixo para cima: a mão fica atrás do rosto, e a cabeça por cima de tudo.
const LAYER_ORDER = ["hold", "face", "head"];

// O quadro tem uma margem lateral para itens de mão ficarem ao lado do corpo.
// A raposa ocupa as colunas FRAME_MARGIN a FRAME_MARGIN + 15.
export const FRAME_MARGIN = 2;
export const FRAME_WIDTH = 16 + 2 * FRAME_MARGIN;

// Junta o sprite base com a arte dos itens ativos. `active` = { head, face, hold }
// com itens do catálogo (ou null). O x da arte é relativo à raposa (0 a 15), então
// itens de mão podem usar x de -FRAME_MARGIN a 15 + FRAME_MARGIN. O que passar disso
// é cortado.
//
// options.asleep: olhos fechados (traços de 2 pixels) e um Z na margem direita.
export function composeFrame(stageId, active = {}, options = {}) {
  const pad = ".".repeat(FRAME_MARGIN);
  const rows = SPRITES[stageId].map((row) => [...(pad + row + pad)]);
  if (options.asleep) closeEyes(rows, stageId);
  for (const slot of LAYER_ORDER) {
    const art = active[slot]?.art?.[stageId];
    if (!art) continue;
    art.grid.forEach((line, dy) => {
      [...line].forEach((ch, dx) => {
        const x = art.x + FRAME_MARGIN + dx;
        const y = art.y + dy;
        if (ch === "." || x < 0 || x >= FRAME_WIDTH || y < 0 || y >= 16) return;
        rows[y][x] = ch;
      });
    });
  }
  if (options.asleep) drawZ(rows);
  return rows.map((row) => row.join(""));
}

// Linha dos olhos em cada estágio com rosto (o ovo não tem olhos).
const EYE_ROW = { baby: 12, pup: 9, young: 6, adult: 6 };

// Olho aberto vira traço: o pixel preto some e dois pixels escuros formam a pálpebra.
function closeEyes(rows, stageId) {
  const y = EYE_ROW[stageId];
  if (y === undefined) return;
  for (const x of [4, 5, 10, 11]) rows[y][x + FRAME_MARGIN] = "o";
}

// Um Z azul no canto superior direito, na margem. Com 3 linhas viraria um "I";
// precisa de 5 para a diagonal.
const SLEEP_Z = ["bbb", "..b", ".b.", "b..", "bbb"];
const SLEEP_Z_X = 15;

function drawZ(rows) {
  SLEEP_Z.forEach((line, dy) => {
    [...line].forEach((ch, dx) => {
      if (ch !== ".") rows[dy][SLEEP_Z_X + FRAME_MARGIN + dx] = ch;
    });
  });
}

export function drawPet(canvas, stageId, active = {}, options = {}) {
  drawSprite(canvas, composeFrame(stageId, active, options));
}

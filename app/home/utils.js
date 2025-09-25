const suits = ["♠", "♥", "♦", "♣"];
const values = [
  "3", "4", "5", "6", "7", "8", "9", "10",
  "J", "Q", "K", "A", "2"
];

export const createDeck = () => {
  let deck = [];
  for (let s of suits) {
    for (let v of values) {
      deck.push({ suit: s, value: v, id: v + s });
    }
  }
  return deck;
};

export const shuffle = (deck) => [...deck].sort(() => Math.random() - 0.5);

export const compareCards = (a, b) => {
  return values.indexOf(a.value) - values.indexOf(b.value);
};

// ==== Detect bộ bài ====
export const detectCombo = (cards) => {
  if (!cards || cards.length === 0) return null;

  // sort
  const sorted = [...cards].sort(compareCards);

  // 1 lá
  if (cards.length === 1) return { type: "single", rank: values.indexOf(sorted[0].value) };

  // đôi
  if (cards.length === 2 && sorted[0].value === sorted[1].value) {
    return { type: "pair", rank: values.indexOf(sorted[0].value) };
  }

  // bộ ba
  if (cards.length === 3 && new Set(sorted.map(c => c.value)).size === 1) {
    return { type: "triple", rank: values.indexOf(sorted[0].value) };
  }

  // tứ quý
  if (cards.length === 4 && new Set(sorted.map(c => c.value)).size === 1) {
    return { type: "quad", rank: values.indexOf(sorted[0].value) };
  }

  // sảnh (>=3 liên tiếp, không có 2)
  const idxs = sorted.map(c => values.indexOf(c.value));
  const isStraight = idxs.every((val, i) => i === 0 || val - idxs[i - 1] === 1);
  if (cards.length >= 3 && isStraight && !sorted.some(c => c.value === "2")) {
    return { type: "straight", rank: idxs[idxs.length - 1], length: cards.length };
  }

  // đôi thông (>=3 đôi liên tiếp, không chứa 2)
  if (cards.length >= 6 && cards.length % 2 === 0) {
    let valid = true;
    for (let i = 0; i < cards.length; i += 2) {
      if (sorted[i].value !== sorted[i + 1].value) {
        valid = false;
        break;
      }
    }
    const pairIdxs = [];
    for (let i = 0; i < cards.length; i += 2) {
      pairIdxs.push(values.indexOf(sorted[i].value));
    }
    const isSeq = pairIdxs.every((v, i) => i === 0 || v - pairIdxs[i - 1] === 1);
    if (valid && isSeq && !sorted.some(c => c.value === "2")) {
      return { type: "pairSeq", rank: pairIdxs[pairIdxs.length - 1], length: pairIdxs.length };
    }
  }

  return null;
};

// ==== So sánh nước đi ====
export const isValidMove = (newCards, tableCards) => {
  const combo = detectCombo(newCards);
  if (!combo) return false;

  if (tableCards.length === 0) return true;

  const lastCombo = detectCombo(tableCards);
  if (!lastCombo) return true;

  if (combo.type !== lastCombo.type) return false;
  if (combo.type === "straight" && combo.length !== lastCombo.length) return false;
  if (combo.type === "pairSeq" && combo.length !== lastCombo.length) return false;

  return combo.rank > lastCombo.rank;
};

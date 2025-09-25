import { detectCombo, isValidMove } from "./utils";

export const botPlay = (hand, tableCards) => {
  // thử từng lá nhỏ nhất hợp lệ
  for (let i = 0; i < hand.length; i++) {
    const card = [hand[i]];
    if (isValidMove(card, tableCards)) {
      return card;
    }
  }

  // thử đôi
  for (let i = 0; i < hand.length - 1; i++) {
    const pair = [hand[i], hand[i + 1]];
    if (isValidMove(pair, tableCards)) {
      return pair;
    }
  }

  // nếu không có → bỏ
  return null;
};

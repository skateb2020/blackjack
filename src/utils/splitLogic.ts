// src/utils/splitLogic.ts

// If you already have a shared types file, import CardType from there.
// Otherwise, define it here:
export interface CardType {
    suit: string;
    rank: string;
  }
  
  // Returns the numeric value of a card.
  export function getCardValue(card: CardType): number {
    if (card.rank === "A") return 11;
    if (["K", "Q", "J"].includes(card.rank)) return 10;
    return parseInt(card.rank, 10);
  }
  
  // Checks if a hand can be split (i.e. exactly 2 cards with equal numeric value)
  export function canSplit(hand: CardType[]): boolean {
    if (hand.length !== 2) return false;
    return getCardValue(hand[0]) === getCardValue(hand[1]);
  }
  
  // Creates two split hands from a given hand and returns them along with the bet.
  export function createSplitHands(hand: CardType[], bet: number): { splitHands: [CardType[], CardType[]], newBet: number } {
    return {
      splitHands: [[hand[0]], [hand[1]]],
      newBet: bet,
    };
  }
  
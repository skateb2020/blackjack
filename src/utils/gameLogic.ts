// src/utils/gameLogic.ts

const suits = ["♠️", "♥️", "♦️", "♣️"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

/**
 * Generates a deck containing numDecks decks (default: 6 decks) and shuffles it.
 */
export const generateDeck = (numDecks = 6) => {
  let deck = [];
  for (let d = 0; d < numDecks; d++) {
    suits.forEach((suit) => {
      ranks.forEach((rank) => {
        deck.push({ suit, rank });
      });
    });
  }
  return deck.sort(() => Math.random() - 0.5);
};

// **Hi-Lo Card Counting System**
const hiLoValues: { [key: string]: number } = {
  "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, // Low cards = +1
  "7": 0, "8": 0, "9": 0,                   // Neutral cards = 0
  "10": -1, "J": -1, "Q": -1, "K": -1, "A": -1 // High cards = -1
};

/**
 * Calculates the running count based on the current deck.
 * @param deck - The array of cards (each card must have a 'rank').
 * @param runningCount - The current running count.
 * @returns The updated running count.
 */
export function updateRunningCount(deck: { rank: string }[], runningCount: number): number {
  let countChange = 0;
  deck.forEach((card) => {
    countChange += hiLoValues[card.rank] || 0;
  });
  return runningCount + countChange;
}

/**
 * Calculates the true count.
 * @param runningCount - The current running count.
 * @param decksRemaining - The number of decks remaining.
 * @returns The true count (rounded to the nearest integer).
 */
export function calculateTrueCount(runningCount: number, decksRemaining: number): number {
  return decksRemaining > 0 ? Math.round(runningCount / decksRemaining) : runningCount;
}

/**
 * Returns the number of full decks remaining in the current shoe.
 * (Assumes 52 cards per deck.)
 */
export function getDecksRemaining(deck: { rank: string }[]): number {
  return Math.floor(deck.length / 52);
}

/**
 * Checks if there are enough cards left to play another hand.
 * If not (i.e. if there are fewer than one full deck left), returns a new shoe of 6 decks.
 */
export function resetDeckIfNeeded(currentDeck: { rank: string }[]): { rank: string }[] {
  if (currentDeck.length < 52) {
    return generateDeck(6);
  }
  return currentDeck;
}

/**
 * Basic Strategy Table
 */
export const basicStrategy: { [key: string]: string } = {
  "5_any": "hit",
  "6_any": "hit",
  "7_any": "hit",
  "8_any": "hit",
  "9_2": "hit",
  "9_3": "double_or_hit",
  "9_4": "double_or_hit",
  "9_5": "double",
  "9_6": "double",
  "9_7": "hit",
  "10_any": "double_or_hit",
  "11_any": "double",
  "12_2": "hit",
  "12_3": "hit",
  "12_4": "stand",
  "12_5": "stand",
  "12_6": "stand",
  "12_7": "hit",
  "13_2": "stand",
  "13_3": "stand",
  "13_4": "stand",
  "13_5": "stand",
  "13_6": "stand",
  "15_10": "surrender_or_hit",
  "16_10": "surrender_or_hit",
  "17_any": "stand",
  "18_any": "stand",
  "19_any": "stand",
  "20_any": "stand",
  "21_any": "stand"
};

/**
 * Determines the optimal move based on basic strategy and true count.
 * @param playerTotal - The player's hand total.
 * @param dealerUpcard - The dealer's upcard.
 * @param runningCount - The current running count.
 * @param decksRemaining - The number of decks remaining.
 * @returns The recommended move.
 */
export function getOptimalMove(
  playerTotal: number,
  dealerUpcard: string,
  runningCount: number,
  decksRemaining: number
): string {
  let move =
    basicStrategy[`${playerTotal}_${dealerUpcard}`] ||
    basicStrategy[`${playerTotal}_any`] ||
    "hit";
  
  // We no longer display running or true count info,
  // but we still use it to adjust the strategy:
  const trueCount = calculateTrueCount(runningCount, decksRemaining);
  
  if (trueCount >= 2 && move === "hit") {
    move = "stand";
  }
  if (trueCount <= -2 && move === "stand") {
    move = "hit";
  }
  
  return move;
}

/**
 * Helper function to return an approximate bust probability based on the player's hand total.
 * Typical probabilities (in percentage) when hitting:
 * 12: ~31%, 13: ~39%, 14: ~56%, 15: ~58%, 16: ~62%, 17: ~69%, 18: ~77%, 19: ~85%, 20: ~92%, 21: 100%
 */
function getBustProbability(total: number): number {
  if (total >= 21) return 100;
  if (total <= 11) return 0;
  const bustMap: { [key: number]: number } = {
    12: 31,
    13: 39,
    14: 56,
    15: 58,
    16: 62,
    17: 69,
    18: 77,
    19: 85,
    20: 92,
    21: 100,
  };
  return bustMap[total] || 0;
}

/**
 * Produces an analysis string for the player's move.
 * This version no longer displays running count, true count, or decks remaining.
 * Instead, it explains your hand total, the dealer's upcard, and the approximate bust probability.
 * @param playerTotal - The player's hand total.
 * @param dealerUpcard - The dealer's upcard.
 * @param playerAction - The action the player took.
 * @param runningCount - The current running count (used only for strategy adjustment).
 * @param decksRemaining - The number of decks remaining (used only for strategy adjustment).
 * @returns A multi-line analysis string.
 */
export function analyzeMove(
  playerTotal: number,
  dealerUpcard: string,
  playerAction: string,
  runningCount: number,
  decksRemaining: number
): string {
  const optimalMove = getOptimalMove(playerTotal, dealerUpcard, runningCount, decksRemaining);
  const bustProbability = getBustProbability(playerTotal);
  
  let analysis = `
=== Hand Analysis ===
Your Hand Total: ${playerTotal}
Dealer's Upcard: ${dealerUpcard}
Probability of Busting if you hit: ${bustProbability}%

Recommended Action: `;
  
  switch(optimalMove) {
    case "hit":
      analysis += "Hit\n  • Your hand total is low enough that hitting gives you a chance to improve without a high risk of busting.";
      break;
    case "stand":
      analysis += "Stand\n  • Your hand is strong, and taking another card might result in a bust.";
      break;
    case "double_or_hit":
      analysis += "Double Down if available; otherwise, Hit\n  • You have a favorable chance to improve significantly.";
      break;
    case "surrender_or_hit":
      analysis += "Surrender if allowed; otherwise, Hit\n  • Your hand is statistically weak compared to the dealer.";
      break;
    default:
      analysis += "Hit (default)";
  }
  
  if (playerAction === optimalMove || (playerAction === "double" && optimalMove === "double_or_hit")) {
    analysis = "✅ Correct Choice!\n" + analysis;
  } else {
    analysis = `❌ Incorrect Choice: You chose ${playerAction} instead of ${optimalMove}.\n` + analysis;
  }
  
  // Additional explanation on the bust probability statistic:
  analysis += `
  
Additional Explanation:
- A hand total of ${playerTotal} has about a ${bustProbability}% chance of busting if you take a hit.
- This statistic is crucial for understanding the risk of drawing another card.
- The lower this probability, the safer it is to hit; a high probability suggests you should stand to avoid busting.
`;
  
  return analysis;
}
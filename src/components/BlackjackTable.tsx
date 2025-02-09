// BlackjackTable.tsx
"use client";
import React, { useState, useEffect } from "react";
import Card from "./Card";
import BettingPanel from "./BettingPanel";
import { generateDeck, getOptimalMove, analyzeMove } from "../utils/gameLogic";
import { canSplit, createSplitHands, getCardValue } from "../utils/splitLogic";

// -----------------
// Interfaces
// -----------------
interface CardType {
  suit: string;
  rank: string;
}

interface Player {
  id: number;
  name: string;
  hand: CardType[];
  chips: number;
  bet: number;
  isBot: boolean;
}

interface HandHistory {
  playerName: string;
  playerTotal: number;
  dealerTotal: number;
  outcome: string;
}

interface ChatEntry {
  order: number;
  sender: string;
  message: string;
}

// For splitting:
interface SplitHand {
  hand: CardType[];
  bet: number;
  completed: boolean;
}

// -----------------
// Helper Functions
// -----------------
const calculateTotal = (hand: CardType[]): number => {
  let total = 0;
  let aces = 0;
  hand.forEach((card) => {
    if (card.rank === "A") {
      aces += 1;
      total += 11;
    } else if (["K", "Q", "J"].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank, 10);
    }
  });
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
};

const computeOutcome = (playerTotal: number, dealerTotal: number): string => {
  if (playerTotal > 21) return "Bust";
  if (dealerTotal > 21) return "Win";
  if (dealerTotal > playerTotal) return "Lose";
  if (dealerTotal < playerTotal) return "Win";
  return "Push";
};

// -----------------
// Bot Functions
// -----------------
const calculateBotBet = (bot: Player, runningCount: number): number => {
  const baseBet = 50;
  return runningCount >= 2 ? Math.min(bot.chips, baseBet * 2) : Math.min(bot.chips, baseBet);
};

const bot1Play = (hand: CardType[], dealerUpcard: string, runningCount: number): string => {
  const total = calculateTotal(hand);
  if (hand.length === 2 && (total === 10 || total === 11)) return "double";
  if (runningCount >= 2) return total < 18 ? "hit" : "stand";
  if (runningCount <= -2) return total < 15 ? "hit" : "stand";
  return total < 17 ? "hit" : "stand";
};

const bot2Play = (
  hand: CardType[],
  dealerUpcard: string,
  deck: CardType[],
  runningCount: number
): string => {
  const total = calculateTotal(hand);
  if (hand.length === 2 && (total === 10 || total === 11)) return "double";
  let highCards = 0;
  let lowCards = 0;
  deck.forEach((card) => {
    if (["2", "3", "4", "5", "6"].includes(card.rank)) lowCards++;
    if (["10", "J", "Q", "K", "A"].includes(card.rank)) highCards++;
  });
  if (runningCount > 0) return total < 16 ? "hit" : "stand";
  if (runningCount < 0) return total < 14 ? "hit" : "stand";
  return total < 16 ? "hit" : "stand";
};

const bot3Play = (hand: CardType[], dealerUpcard: string, runningCount: number): string => {
  const total = calculateTotal(hand);
  if (hand.length === 2 && (total === 10 || total === 11)) return "double";
  const baseProbability = runningCount > 0 ? 0.4 : 0.6;
  return Math.random() < baseProbability ? (total < 17 ? "hit" : "stand") : (total < 15 ? "hit" : "stand");
};

// -----------------
// Main Component
// -----------------
const BlackjackTable: React.FC = () => {
  // Standard state declarations
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: "Bot 1", hand: [], chips: 1000, bet: 0, isBot: true },
    { id: 2, name: "Bot 2", hand: [], chips: 1000, bet: 0, isBot: true },
    { id: 3, name: "You", hand: [], chips: 1000, bet: 0, isBot: false },
    { id: 4, name: "Bot 3", hand: [], chips: 1000, bet: 0, isBot: true },
  ]);
  const [deck, setDeck] = useState<CardType[]>(generateDeck());
  const [dealerHand, setDealerHand] = useState<CardType[]>([]);
  const [message, setMessage] = useState<string>("");
  const [analysisMessage, setAnalysisMessage] = useState<string>("");
  const [sessionAnalysis, setSessionAnalysis] = useState<string>("");
  const [handHistory, setHandHistory] = useState<HandHistory[]>([]);
  const [handCount, setHandCount] = useState<number>(0);
  const [dealerRevealed, setDealerRevealed] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [runningCount, setRunningCount] = useState<number>(0);
  const [bettingPhase, setBettingPhase] = useState<boolean>(true);
  const [chatLog, setChatLog] = useState<ChatEntry[]>([]);
  const [dealComplete, setDealComplete] = useState<boolean>(false);
  const [humanWins, setHumanWins] = useState<number>(0);
  const [humanLosses, setHumanLosses] = useState<number>(0);
  const [humanPushes, setHumanPushes] = useState<number>(0);

  // ----- SPLIT-RELATED STATE -----
  const [splitHands, setSplitHands] = useState<SplitHand[] | null>(null);
  const [activeSplitIndex, setActiveSplitIndex] = useState<number>(0);

  // -----------------
  // Chat Log Helper
  // -----------------
  const updateChatLog = (entry: ChatEntry) => {
    setChatLog((prev) => [...prev, entry]);
  };

  const clearChatLog = () => {
    setChatLog([]);
  };

  // -----------------
  // Effects
  // -----------------
  useEffect(() => {
    if (!bettingPhase) {
      clearChatLog();
      startNewHand();
      setDealComplete(true);
    }
  }, [bettingPhase]);

  useEffect(() => {
    if (dealComplete) {
      handleBotsTurn();
      setDealComplete(false);
    }
  }, [dealComplete]);

  // -----------------
  // Running Count Updater
  // -----------------
  const updateRunningCountForCards = (cards: CardType[]): void => {
    let countChange = 0;
    cards.forEach((card) => {
      if (["2", "3", "4", "5", "6"].includes(card.rank)) {
        countChange += 1;
      } else if (["10", "J", "Q", "K", "A"].includes(card.rank)) {
        countChange -= 1;
      }
    });
    setRunningCount((prev) => prev + countChange);
  };
  const updateRunningCount = updateRunningCountForCards;

  // -----------------
  // Dealer Resolution
  // -----------------
  const revealDealerHand = () => {
    setDealerRevealed(true);
    let newDealerHand = [...dealerHand];
    let newDeck = [...deck];
    let dealerTotal = calculateTotal(newDealerHand);

    while (dealerTotal < 17 && newDeck.length > 0) {
      const card = newDeck.shift();
      if (card) {
        newDealerHand.push(card);
        updateRunningCount([card]);
        dealerTotal = calculateTotal(newDealerHand);
      }
    }
    setDealerHand(newDealerHand);
    setDeck(newDeck);

    const playerTotal = calculateTotal(players[2].hand);
    let outcome = "";
    if (playerTotal > 21) outcome = "Bust";
    else if (dealerTotal > 21) outcome = "Dealer busts, you win!";
    else if (dealerTotal > playerTotal) outcome = "Dealer wins!";
    else if (dealerTotal < playerTotal) outcome = "You win!";
    else outcome = "Push!";
    setMessage(outcome);

    const humanIndex = 2;
    const currentBet = players[humanIndex].bet;
    let updatedPlayers = [...players];
    if (outcome === "You win!" || outcome === "Dealer busts, you win!") {
      if (playerTotal === 21) {
        updatedPlayers[humanIndex].chips += currentBet * 2.5;
      } else {
        updatedPlayers[humanIndex].chips += currentBet * 2;
      }
      setHumanWins((prev) => prev + 1);
    } else if (outcome === "Push!") {
      updatedPlayers[humanIndex].chips += currentBet;
      setHumanPushes((prev) => prev + 1);
    } else {
      setHumanLosses((prev) => prev + 1);
    }
    setPlayers(updatedPlayers);
    setGameOver(true);
    setHandHistory([]);
    setHandCount((prev) => prev + 1);
  };

  // -----------------
  // Bot Moves
  // -----------------
  const handleBotsTurn = () => {
    let newPlayers = [...players];
    const dealerUpcard = dealerHand[0]?.rank || "";

    // Bot 1
    const bot1 = newPlayers.find((p) => p.id === 1);
    if (bot1) {
      let action = bot1Play(bot1.hand, dealerUpcard, runningCount);
      let botMsg = "";
      if (action === "double") {
        if (bot1.chips >= bot1.bet) {
          bot1.chips -= bot1.bet;
          bot1.bet *= 2;
          const newDeck = [...deck];
          const newCard = newDeck.shift();
          if (newCard) {
            bot1.hand.push(newCard);
            updateRunningCount([newCard]);
            setDeck(newDeck);
          }
          botMsg = "Bot 1 doubled down.";
        } else {
          action = "stand";
          botMsg = "Bot 1 stood (insufficient chips to double down).";
        }
      } else if (action === "hit") {
        const newDeck = [...deck];
        const newCard = newDeck.shift();
        if (newCard) {
          bot1.hand.push(newCard);
          updateRunningCount([newCard]);
          setDeck(newDeck);
          botMsg = "Bot 1 hit.";
        }
      } else {
        botMsg = "Bot 1 stood.";
      }
      updateChatLog({ order: 1, sender: "Bot 1", message: botMsg });
    }

    // Bot 2
    const bot2 = newPlayers.find((p) => p.id === 2);
    if (bot2) {
      let action = bot2Play(bot2.hand, dealerUpcard, deck, runningCount);
      let botMsg = "";
      if (action === "double") {
        if (bot2.chips >= bot2.bet) {
          bot2.chips -= bot2.bet;
          bot2.bet *= 2;
          const newDeck = [...deck];
          const newCard = newDeck.shift();
          if (newCard) {
            bot2.hand.push(newCard);
            updateRunningCount([newCard]);
            setDeck(newDeck);
          }
          botMsg = "Bot 2 doubled down.";
        } else {
          action = "stand";
          botMsg = "Bot 2 stood (insufficient chips to double down).";
        }
      } else if (action === "hit") {
        const newDeck = [...deck];
        const newCard = newDeck.shift();
        if (newCard) {
          bot2.hand.push(newCard);
          updateRunningCount([newCard]);
          setDeck(newDeck);
          botMsg = "Bot 2 hit.";
        }
      } else {
        botMsg = "Bot 2 stood.";
      }
      updateChatLog({ order: 2, sender: "Bot 2", message: botMsg });
    }
    setPlayers(newPlayers);
    setMessage("Your Turn");
  };

  const handleBotsTurnAfterHuman = () => {
    let newPlayers = [...players];
    const dealerUpcard = dealerHand[0]?.rank || "";
    const bot3 = newPlayers.find((p) => p.id === 4);
    if (bot3) {
      let action = bot3Play(bot3.hand, dealerUpcard, runningCount);
      let botMsg = "";
      if (action === "double") {
        if (bot3.chips >= bot3.bet) {
          bot3.chips -= bot3.bet;
          bot3.bet *= 2;
          const newDeck = [...deck];
          const newCard = newDeck.shift();
          if (newCard) {
            bot3.hand.push(newCard);
            updateRunningCount([newCard]);
            setDeck(newDeck);
          }
          botMsg = "Bot 3 doubled down.";
        } else {
          action = "stand";
          botMsg = "Bot 3 stood (insufficient chips to double down).";
        }
      } else if (action === "hit") {
        const newDeck = [...deck];
        const newCard = newDeck.shift();
        if (newCard) {
          bot3.hand.push(newCard);
          updateRunningCount([newCard]);
          setDeck(newDeck);
          botMsg = "Bot 3 hit.";
        }
      } else {
        botMsg = "Bot 3 stood.";
      }
      updateChatLog({ order: 7, sender: "Bot 3", message: botMsg });
    }
    setPlayers(newPlayers);
    setMessage("Dealer's Turn...");
    revealDealerHand();
  };

  // -----------------
  // New Hand Setup
  // -----------------
  const startNewHand = () => {
    const newDeck = generateDeck();
    const newPlayers = players.map((player) => ({ ...player, hand: [] }));
    setSplitHands(null);
    newPlayers.forEach((player) => {
      if (player.isBot) {
        const botBet = calculateBotBet(player, runningCount);
        player.bet = botBet;
        player.chips -= botBet;
      }
    });
    for (let round = 0; round < 2; round++) {
      newPlayers.forEach((player) => {
        const card = newDeck.shift();
        if (card) {
          player.hand.push(card);
          updateRunningCount([card]);
        }
      });
    }
    let newDealerHand: CardType[] = [];
    for (let round = 0; round < 2; round++) {
      const dealerCard = newDeck.shift();
      if (dealerCard) {
        newDealerHand.push(dealerCard);
        updateRunningCount([dealerCard]);
      }
    }
    setPlayers(newPlayers);
    setDealerHand(newDealerHand);
    setDealerRevealed(false);
    setMessage("Bots' Turn...");
    setGameOver(false);
    setAnalysisMessage("");
    setDeck(newDeck);
  };

  // -----------------
  // Splitting Logic
  // -----------------
  const handleSplit = () => {
    const human = players[2];
    if (human.hand.length === 2 && canSplit(human.hand)) {
      if (human.chips < human.bet) {
        setAnalysisMessage("Not enough chips to split.");
        return;
      }
      const extraBet = human.bet;
      let newPlayers = [...players];
      newPlayers[2].chips -= extraBet;
      const { splitHands: newSplitHands, newBet } = createSplitHands(human.hand, human.bet);
      setSplitHands([
        { hand: newSplitHands[0], bet: newBet, completed: false },
        { hand: newSplitHands[1], bet: newBet, completed: false },
      ]);
      newPlayers[2].hand = [];
      setPlayers(newPlayers);
      setActiveSplitIndex(0);
      updateChatLog({ order: 5, sender: "You", message: "Hand split into two hands." });
    } else {
      setAnalysisMessage("Cannot split: Your two cards do not have the same value.");
    }
  };

  const handleSplitMove = (action: "hit" | "stand" | "double") => {
    if (!splitHands) return;
    const currentHand = splitHands[activeSplitIndex].hand;
    const currentBet = splitHands[activeSplitIndex].bet;
    const playerTotal = calculateTotal(currentHand);
    const moveAnalysis = analyzeMove(playerTotal, dealerHand[0]?.rank || "", action);
    const orderForSplit = activeSplitIndex === 0 ? 5 : 6;
    updateChatLog({
      order: orderForSplit,
      sender: "You (split)",
      message: `Hand ${activeSplitIndex + 1}: ${action}`,
    });
    
    if (action === "hit") {
      const newDeck = [...deck];
      const newCard = newDeck.shift();
      if (newCard) {
        currentHand.push(newCard);
        updateRunningCount([newCard]);
        setDeck(newDeck);
      }
      if (calculateTotal(currentHand) > 21) {
        splitHands[activeSplitIndex].completed = true;
        updateChatLog({
          order: orderForSplit,
          sender: "You (split)",
          message: `Hand ${activeSplitIndex + 1}: Bust`,
        });
        if (activeSplitIndex < splitHands.length - 1) {
          setActiveSplitIndex(activeSplitIndex + 1);
          setAnalysisMessage("");
          return;
        } else {
          handleBotsTurnAfterHuman();
          return;
        }
      }
    } else if (action === "stand") {
      splitHands[activeSplitIndex].completed = true;
      updateChatLog({
        order: orderForSplit,
        sender: "You (split)",
        message: `Hand ${activeSplitIndex + 1}: Stand`,
      });
      if (activeSplitIndex < splitHands.length - 1) {
        setActiveSplitIndex(activeSplitIndex + 1);
        setAnalysisMessage("");
        return;
      } else {
        handleBotsTurnAfterHuman();
        return;
      }
    } else if (action === "double") {
      if (currentHand.length === 1) {
        if (players[2].chips < currentBet) {
          setAnalysisMessage("Not enough chips to double down on this hand.");
          return;
        }
        let newPlayers = [...players];
        newPlayers[2].chips -= currentBet;
        setPlayers(newPlayers);
        splitHands[activeSplitIndex].bet *= 2;
        const newDeck = [...deck];
        const newCard = newDeck.shift();
        if (newCard) {
          currentHand.push(newCard);
          updateRunningCount([newCard]);
          setDeck(newDeck);
        }
        splitHands[activeSplitIndex].completed = true;
        updateChatLog({
          order: orderForSplit,
          sender: "You (split)",
          message: `Hand ${activeSplitIndex + 1}: Doubled down`,
        });
        if (activeSplitIndex < splitHands.length - 1) {
          setActiveSplitIndex(activeSplitIndex + 1);
          setAnalysisMessage("");
          return;
        } else {
          handleBotsTurnAfterHuman();
          return;
        }
      } else {
        setAnalysisMessage("Doubling down is only allowed on your initial card in a split hand.");
        return;
      }
    }
    setSplitHands([...splitHands]);
  };

  // -----------------
  // Human Normal Move Handler
  // -----------------
  const handlePlayerMove = (action: "hit" | "stand" | "double" | "split") => {
    if (action === "split") {
      handleSplit();
      return;
    }
    if (splitHands) {
      handleSplitMove(action as "hit" | "stand" | "double");
      return;
    }
    let newPlayers = [...players];
    let playerHand = newPlayers[2].hand;
    const playerTotal = calculateTotal(playerHand);
    const moveAnalysis = analyzeMove(playerTotal, dealerHand[0]?.rank || "", action);
    updateChatLog({
      order: 5,
      sender: "You",
      message:
        action === "hit"
          ? "You hit."
          : action === "stand"
          ? "You stood."
          : "You doubled down.",
    });
    setAnalysisMessage(moveAnalysis);

    if (action === "hit") {
      const newDeck = [...deck];
      const newCard = newDeck.shift();
      if (newCard) {
        playerHand.push(newCard);
        updateRunningCount([newCard]);
        setDeck(newDeck);
        setPlayers(newPlayers);
        if (calculateTotal(playerHand) > 21) {
          setMessage("❌ You Bust!");
          setAnalysisMessage(moveAnalysis + " You Bust!");
          revealDealerHand();
          return;
        }
      }
    } else if (action === "stand") {
      setMessage("Dealer's Turn...");
      handleBotsTurnAfterHuman();
      return;
    } else if (action === "double") {
      if (playerHand.length === 2) {
        const extraBet = players[2].bet;
        if (players[2].chips < extraBet) {
          setAnalysisMessage("Not enough chips to double down.");
          return;
        }
        let updatedPlayers = [...players];
        updatedPlayers[2].chips -= extraBet;
        updatedPlayers[2].bet *= 2;
        setPlayers(updatedPlayers);
        const newDeck = [...deck];
        const newCard = newDeck.shift();
        if (newCard) {
          playerHand.push(newCard);
          updateRunningCount([newCard]);
          setDeck(newDeck);
          setPlayers(updatedPlayers);
        }
        handleBotsTurnAfterHuman();
        return;
      } else {
        setAnalysisMessage("Doubling down is only allowed on your initial 2 cards.");
        return;
      }
    }
    setPlayers(newPlayers);
  };

  // -----------------
  // Session Analysis
  // -----------------
  const nextHand = () => {
    if (handCount >= 5) {
      const analysisSummary = `Cumulative Results: Wins: ${humanWins}, Losses: ${humanLosses}, Pushes: ${humanPushes}`;
      setSessionAnalysis(analysisSummary);
      setHandHistory([]);
      setHandCount(0);
      setRunningCount(0);
    } else {
      setBettingPhase(true);
    }
  };

  if (bettingPhase) {
    return (
      <div className="flex flex-col items-center p-5">
        <h1 className="text-3xl font-bold mb-4">BlackJack Xpert</h1>
        <BettingPanel
          chips={players[2].chips}
          onConfirmBet={(betAmount) => {
            let newPlayers = [...players];
            newPlayers[2].bet = betAmount;
            newPlayers[2].chips -= betAmount;
            setPlayers(newPlayers);
            setBettingPhase(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-row w-full">
      {/* Chat Panel */}
      <div className="w-1/4 p-2 border-r text-white">
        <h3 className="font-bold mb-2">Chat Log</h3>
        {chatLog.sort((a, b) => a.order - b.order).map((entry, index) => (
          <p key={index}>
            <strong>{entry.sender}:</strong> {entry.message}
          </p>
        ))}
      </div>
      {/* Main Game UI */}
      <div className="w-3/4 p-4">
        <h1 className="text-3xl font-bold mb-4">BlackJack Xpert</h1>

        {/* Players' Hands */}
        <div className="grid grid-cols-2 gap-4">
          {players.map((player, index) => (
            <div key={index} className="p-4 border rounded bg-gray-700 text-white">
              <h2 className="text-xl mb-2">{player.name}</h2>
              <div className="flex gap-2">
                {player.hand.map((card, idx) => (
                  <Card key={idx} suit={card.suit} rank={card.rank} />
                ))}
              </div>
              <p>Chips: {player.chips}</p>
              {player.name === "You" && <p>Current Bet: {player.bet}</p>}
            </div>
          ))}
        </div>

        {/* Split UI: Show a Split button if the hand is splittable */}
        {!splitHands &&
          players[2].hand.length === 2 &&
          canSplit(players[2].hand) && (
            <div className="mt-4">
              <button
                onClick={() => handlePlayerMove("split")}
                className="bg-yellow-500 text-white px-4 py-2 rounded"
              >
                Split
              </button>
            </div>
          )}

        {/* If Human has split, display split-hand boxes side by side */}
        {splitHands && (
          <div className="mt-4 flex gap-4">
            {splitHands.map((hand, index) => (
              <div
                key={index}
                className={`p-4 border rounded ${
                  activeSplitIndex === index ? "bg-green-700" : "bg-gray-700"
                } text-white flex flex-col items-center`}
              >
                <h2 className="text-xl mb-2">Split Hand {index + 1}</h2>
                <div className="flex gap-2">
                  {hand.hand.map((card, idx) => (
                    <Card key={idx} suit={card.suit} rank={card.rank} />
                  ))}
                </div>
                <p className="mt-2">Bet: {hand.bet}</p>
                {/* Show control buttons only for the active split hand */}
                {activeSplitIndex === index && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSplitMove("hit")}
                      className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                      Hit
                    </button>
                    <button
                      onClick={() => handleSplitMove("stand")}
                      className="bg-green-500 text-white px-4 py-2 rounded"
                    >
                      Stand
                    </button>
                    <button
                      onClick={() => handleSplitMove("double")}
                      className="bg-purple-500 text-white px-4 py-2 rounded"
                    >
                      Double Down
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dealer's Hand */}
        <h2 className="text-xl mt-4 mb-2">Dealer's Hand:</h2>
        <div className="flex gap-2">
          {dealerHand.length > 0 && (
            <Card suit={dealerHand[0].suit} rank={dealerHand[0].rank} />
          )}
          {dealerRevealed ? (
            dealerHand.slice(1).map((card, index) => (
              <Card key={index} suit={card.suit} rank={card.rank} />
            ))
          ) : (
            <Card suit="?" rank="?" />
          )}
        </div>

        {/* Running Count */}
        <h2 className="text-xl mt-4 mb-2">Running Count: {runningCount}</h2>

        {/* Move Analysis */}
        {analysisMessage && (
          <p className="text-lg mb-2 text-white">{analysisMessage}</p>
        )}

        {/* Session Analysis */}
        {sessionAnalysis && (
          <p className="text-lg mb-2 text-white">{sessionAnalysis}</p>
        )}

        {/* Cumulative Results */}
        <div className="mt-4 text-white">
          <h3 className="font-bold">Cumulative Results:</h3>
          <p>
            Wins: {humanWins} | Losses: {humanLosses} | Pushes: {humanPushes}
          </p>
        </div>

        {/* Outcome Message */}
        {message && (
          <h2 className="text-xl mt-4 mb-2 font-bold">Outcome: {message}</h2>
        )}

        {/* Control Buttons for Human (if not splitting) */}
        <div className="mt-4 flex gap-4">
          {!gameOver && !splitHands ? (
            <>
              <button
                onClick={() => handlePlayerMove("hit")}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Hit
              </button>
              <button
                onClick={() => handlePlayerMove("stand")}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Stand
              </button>
              <button
                onClick={() => handlePlayerMove("double")}
                className="bg-purple-500 text-white px-4 py-2 rounded"
              >
                Double Down
              </button>
            </>
          ) : (
            <button
              onClick={nextHand}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Next Hand
            </button>
          )}
        </div>

        {/* Hand History */}
        {handHistory.length > 0 && (
          <div className="mt-6 text-white">
            <h2 className="text-xl mb-2 font-bold">Hand History:</h2>
            <ul className="list-disc pl-5">
              {handHistory.map((hand, index) => (
                <li key={index}>
                  {hand.playerName}: {hand.outcome} (Total: {hand.playerTotal}, Dealer: {hand.dealerTotal})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlackjackTable;

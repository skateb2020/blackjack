// BettingPanel.tsx
"use client";
import React, { useState } from "react";

interface BettingPanelProps {
  chips: number;
  onConfirmBet: (betAmount: number) => void;
}

const BettingPanel: React.FC<BettingPanelProps> = ({ chips, onConfirmBet }) => {
  // Use a string state so the input displays exactly what is typed.
  const [betAmount, setBetAmount] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBet = parseInt(betAmount, 10);
    // Validate that the bet is a valid number, greater than 0 and not exceeding the available chips.
    if (!isNaN(parsedBet) && parsedBet > 0 && parsedBet <= chips) {
      onConfirmBet(parsedBet);
    } else {
      alert(
        "Please enter a valid bet amount. It must be greater than 0 and not more than your available chips."
      );
    }
  };

  return (
    <div className="betting-panel p-5">
      <h2 className="text-2xl font-bold mb-4">Place Your Bet</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="betAmount" className="mr-2">
          Bet Amount:
        </label>
        {/* The input uses text with inputMode="numeric" and the class "text-black" to ensure that typed numbers appear in black */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          id="betAmount"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          className="border p-1 mr-2 text-black"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Confirm Bet
        </button>
      </form>
      <p className="mt-2">
        You have {chips} chips available.{" "}
        {chips < 1000
          ? "Any number less than 1000 is fair."
          : "You can bet as many chips as you have."}
      </p>
    </div>
  );
};

export default BettingPanel;

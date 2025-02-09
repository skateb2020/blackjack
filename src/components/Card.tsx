import React from "react";

interface CardProps {
  suit: string;
  rank: string;
}

const Card: React.FC<CardProps> = ({ suit, rank }) => {
  return (
    <div className="w-16 h-24 flex items-center justify-center border rounded bg-white text-black">
      {rank} {suit}
    </div>
  );
};

export default Card;

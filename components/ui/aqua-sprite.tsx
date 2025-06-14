"use client";

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface AquaSpriteProps {
  isLoading: boolean;
  isThinking: boolean;
  onClick: () => void;
  className?: string;
}

export const AquaSprite: React.FC<AquaSpriteProps> = ({ isLoading, isThinking, onClick, className }) => {
  const spriteSrc = useMemo(() => {
    if (isLoading) {
      return isThinking ? '/sprites/aqua_think.png' : '/sprites/aqua_talk.png';
    }
    return '/sprites/aqua_rest.png';
  }, [isLoading, isThinking]);

  return (
    <button
      onClick={onClick}
      className={cn("focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full", className)}
      // CHANGE: Updated aria-label since it's always visible now
      aria-label="Chat agent actions"
    >
      <img
        src={spriteSrc}
        alt="Chat Agent Status"
        className={cn(
          "h-[7rem] w-[7rem]",
          "scale-x-[-1]",
          "cursor-pointer",
          "transition-transform duration-200",
          "hover:scale-110 hover:scale-x-[-1]"
        )}
      />
    </button>
  );
};
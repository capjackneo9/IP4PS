export const PILLARS = [
  {
    id: "synergy",
    n: 1,
    name: "Synergy",
    tech: "Smart contract",
    emoji: "⚙️",
    color: "#6366F1",
    summary: "Orchestrates the other three pillars and runs self-executing license agreements.",
    points: ["Automated orchestration of every protection layer", "Self-executing licensing agreements", "Tamper-proof rules enforcement"],
  },
  {
    id: "time",
    n: 2,
    name: "Time",
    tech: "Blockchain timestamp",
    emoji: "⏰",
    color: "#8B5CF6",
    summary: "An immutable proof of when your work existed. It cannot be backdated or altered.",
    points: ["Immutable proof of creation date", "Cannot be backdated or altered", "Permanent timeline record"],
  },
  {
    id: "elements",
    n: 3,
    name: "Elements",
    tech: "NFT",
    emoji: "💎",
    color: "#F59E0B",
    summary: "A token that represents your work: transferable ownership with royalties built in.",
    points: ["Digital representation of your IP", "Transferable ownership rights", "Built-in royalty information (ERC-2981)"],
  },
  {
    id: "celestialBodies",
    n: 4,
    name: "Celestial Bodies",
    tech: "Verified identity",
    emoji: "🌟",
    color: "#10B981",
    summary: "Your wallet signs the registration, cryptographically linking you to the work.",
    points: ["Cryptographic link to the creator", "Solves the “who created this” problem", "Wallet signature plus declared profiles"],
  },
] as const;

export type PillarId = (typeof PILLARS)[number]["id"];

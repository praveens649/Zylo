import level1Badge from "@/assets/badges/level1.jpeg";
import level2Badge from "@/assets/badges/level2.jpeg";
import level3Badge from "@/assets/badges/level3.jpeg";
import diamondBadge from "@/assets/badges/diamond.jpeg";

export interface BadgeDefinition {
  code: string;
  name: string;
  tier: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  image: string;
  subtitle: string;
  description: string;
  unlockCondition: string;
  perks: string;
  borderColor: string;
  glowColor: string;
  rarityColor: string;
  accentBg: string;
}

export const BADGE_CATALOG: Record<string, BadgeDefinition> = {
  LEVEL_1_ROOKIE: {
    code: "LEVEL_1_ROOKIE",
    name: "Rookie Explorer",
    tier: "BRONZE",
    rarity: "Common",
    image: level1Badge,
    subtitle: "Level 1 Initiate Insignia",
    description:
      "Awarded to new recruits stepping into the Zylo Data Questverse. Proves your commitment to intelligent telecom management.",
    unlockCondition: "Unlocked on account activation & first daily check-in",
    perks: "Unlocks weekly quest participation & spendable pack XP earning.",
    borderColor: "border-amber-600/60 dark:border-amber-500/60",
    glowColor: "shadow-amber-500/30 shadow-lg",
    rarityColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    accentBg: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  LEVEL_2_DATA_EXPLORER: {
    code: "LEVEL_2_DATA_EXPLORER",
    name: "Data Explorer",
    tier: "SILVER",
    rarity: "Rare",
    image: level2Badge,
    subtitle: "Level 2 Vault Navigator",
    description:
      "A seasoned explorer of data conservation. Mastered deposit habits into the Data Bank to eliminate wasted megabytes.",
    unlockCondition: "Earn 500+ XP in active pack quests or claim in Rewards Vault",
    perks: "+5% bonus chance on weekly milestone XP chest rolls.",
    borderColor: "border-blue-500/60 dark:border-blue-400/60",
    glowColor: "shadow-blue-500/30 shadow-lg",
    rarityColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    accentBg: "from-blue-500/20 via-cyan-500/10 to-transparent",
  },
  LEVEL_3_CYBER_MASTER: {
    code: "LEVEL_3_CYBER_MASTER",
    name: "Cyber Master",
    tier: "GOLD",
    rarity: "Epic",
    image: level3Badge,
    subtitle: "Level 3 High-Voltage Legend",
    description:
      "High-voltage telecom cyber wizard. Dominates streaks, community data transfers, and multi-week campaign objectives.",
    unlockCondition: "Earn 850+ XP in pack quests or claim in Voucher Marketplace",
    perks: "Exclusive animated profile aura & priority customer care badge.",
    borderColor: "border-purple-500/70 dark:border-purple-400/70",
    glowColor: "shadow-purple-500/40 shadow-xl",
    rarityColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    accentBg: "from-purple-500/25 via-pink-500/15 to-transparent",
  },
  DIAMOND_VIP_SAVER: {
    code: "DIAMOND_VIP_SAVER",
    name: "Diamond VIP Saver",
    tier: "DIAMOND",
    rarity: "Legendary",
    image: diamondBadge,
    subtitle: "Apex Diamond Prestige",
    description:
      "The pinnacle of Zylo subscriber achievement. Worn only by elite subscribers who achieve flawless quest streaks and grand finales.",
    unlockCondition: "Earn 950+ XP or unlock in the Exclusive VIP Marketplace",
    perks: "Permanent Diamond avatar halo & maximum discount coupon multipliers.",
    borderColor: "border-cyan-400/80 dark:border-cyan-300/80",
    glowColor: "shadow-cyan-400/50 shadow-2xl",
    rarityColor: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-400/40",
    accentBg: "from-cyan-500/30 via-teal-400/20 to-transparent",
  },
};

export const ORDERED_BADGES = [
  BADGE_CATALOG.LEVEL_1_ROOKIE,
  BADGE_CATALOG.LEVEL_2_DATA_EXPLORER,
  BADGE_CATALOG.LEVEL_3_CYBER_MASTER,
  BADGE_CATALOG.DIAMOND_VIP_SAVER,
];

/**
 * Returns badge definition or fallback for a code.
 */
export function getBadge(code: string): BadgeDefinition | null {
  return BADGE_CATALOG[code] ?? null;
}

/**
 * Finds highest rank badge among user's unlocked badges.
 */
export function getHighestBadge(unlockedBadges: string[] = []): BadgeDefinition {
  const set = new Set(unlockedBadges);
  if (set.has("DIAMOND_VIP_SAVER")) return BADGE_CATALOG.DIAMOND_VIP_SAVER;
  if (set.has("LEVEL_3_CYBER_MASTER")) return BADGE_CATALOG.LEVEL_3_CYBER_MASTER;
  if (set.has("LEVEL_2_DATA_EXPLORER")) return BADGE_CATALOG.LEVEL_2_DATA_EXPLORER;
  return BADGE_CATALOG.LEVEL_1_ROOKIE;
}

// Mock game data for the test MCP server
// In a real game, this would be loaded from the actual game state

export const gameState = {
  player: {
    name: "TestPlayer",
    level: 15,
    health: 85,
    mana: 120,
    gold: 1250,
    experience: 8750,
    location: "Mystic Forest",
  },
  inventory: [],
  quests: [
    {
      id: 1,
      title: "Defeat the Forest Guardian",
      description: "The ancient guardian blocks the path to the Crystal Cave",
      status: "active",
      progress: "2/3 guardians defeated",
      reward: "500 gold + Mystic Blade",
    },
    {
      id: 2,
      title: "Collect Rare Herbs",
      description: "Gather 10 moonflower petals for the village healer",
      status: "completed",
      progress: "10/10 petals collected",
      reward: "200 gold + Healing Knowledge",
    },
    {
      id: 3,
      title: "Find the Lost Artifact",
      description: "Search for the legendary Crown of Wisdom",
      status: "available",
      progress: "0/1 artifact found",
      reward: "1000 gold + Crown of Wisdom",
    },
  ],
};

export const gameTips = {
  combat: [
    "Use health potions before your health drops below 30%",
    "Magic shields are most effective against spell-casting enemies",
    "Combine different spell scrolls for devastating combo attacks",
  ],
  exploration: [
    "Check every corner of the Mystic Forest for hidden treasures",
    "Some areas are only accessible at certain times of day",
    "Talk to NPCs multiple times - they often have additional dialogue",
  ],
  questing: [
    "Complete side quests for extra experience and unique rewards",
    "Some quest items can be found in unexpected places",
    "Group similar quests together to be more efficient",
  ],
  "character-building": [
    "Balance your spending between equipment and consumables",
    "Experience points are gained faster by completing quests than grinding",
    "Different areas have enemies weak to different spell types",
  ],
  general: [
    "Explore thoroughly and experiment with different strategies",
    "Save your game frequently, especially before difficult encounters",
    "Don't hesitate to retreat and regroup if a fight isn't going well",
  ],
};

export const gameStore = {
  "iron-sword": {
    name: "Iron Sword",
    type: "weapon",
    damage: 25,
    price: 0.1,
  },
  "health-potion": {
    name: "Health Potion",
    type: "consumable",
    healing: 50,
    price: 0.05,
  },
  "magic-shield": {
    name: "Magic Shield",
    type: "armor",
    defense: 15,
    price: 0.2,
  },
  "spell-scroll": {
    name: "Spell Scroll",
    type: "consumable",
    effect: "Fireball",
    price: 0.1,
  },
};

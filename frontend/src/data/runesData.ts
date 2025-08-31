// Runes Reforged data structure for U.GG style display
export const runesData = {
  // Precision
  8000: {
    name: 'Precision',
    slots: [
      [8005, 8008, 8021, 8010], // Keystones
      [9101, 9111, 8009], // Slot 1
      [9104, 9105, 9103], // Slot 2
      [8014, 8017, 8299]  // Slot 3
    ]
  },
  // Domination
  8100: {
    name: 'Domination',
    slots: [
      [8112, 8124, 8128, 9923], // Keystones
      [8126, 8139, 8143], // Slot 1
      [8136, 8120, 8138], // Slot 2
      [8135, 8105, 8106] // Slot 3
    ]
  },
  // Sorcery
  8200: {
    name: 'Sorcery',
    slots: [
      [8214, 8229, 8230], // Keystones
      [8224, 8226, 8275], // Slot 1
      [8210, 8234, 8233], // Slot 2
      [8237, 8232, 8236]  // Slot 3
    ]
  },
  // Resolve
  8400: {
    name: 'Resolve',
    slots: [
      [8437, 8439, 8465], // Keystones
      [8446, 8463, 8401], // Slot 1
      [8429, 8444, 8473], // Slot 2
      [8451, 8453, 8242]  // Slot 3
    ]
  },
  // Inspiration
  8300: {
    name: 'Inspiration',
    slots: [
      [8351, 8360, 8369], // Keystones
      [8306, 8304, 8313], // Slot 1
      [8321, 8316, 8345], // Slot 2
      [8347, 8410, 8352]  // Slot 3
    ]
  }
}

// Stat shards structure (Updated for 2025/Patch 25.16)
export const statShards = {
  // Row 1: Offense
  offense: [5008, 5005, 5007], // Adaptive Force, Attack Speed, Ability Haste
  // Row 2: Flex
  flex: [5008, 5010, 5001],    // Adaptive Force, Move Speed (2%), Health scaling (10-180)
  // Row 3: Defense
  defense: [5011, 5013, 5001]  // Health flat (65), Tenacity & Slow Resist (10%), Health scaling (10-180)
}

// Stat shard details for tooltips
export const statShardDetails = {
  5008: {
    name: 'Adaptive Force',
    description: '+9 Attack Damage or +15 Ability Power (Adaptive)',
    icon: 'StatModsAdaptiveForceIcon'
  },
  5005: {
    name: 'Attack Speed', 
    description: '+10% Attack Speed',
    icon: 'StatModsAttackSpeedIcon'
  },
  5007: {
    name: 'Ability Haste',
    description: '+8 Ability Haste',
    icon: 'StatModsAbilityHasteIcon'
  },
  5001: {
    name: 'Health Scaling',
    description: '+10-180 Health (based on level)',
    icon: 'StatModsHealthScalingIcon'
  },
  5010: {
    name: 'Move Speed',
    description: '+2% Movement Speed',
    icon: 'StatModsMoveSpeedIcon'
  },
  5011: {
    name: 'Health',
    description: '+65 Health',
    icon: 'StatModsHealthPlusIcon'
  },
  5013: {
    name: 'Tenacity',
    description: '+10% Tenacity and Slow Resist',
    icon: 'StatModsTenacityIcon'
  }
}
/* =============================================================================
   Medieval Quest - game content
   Every race, class, background, location, NPC, item, enemy, quest and recipe
   lives here as plain data. The rules that act on it are in system.js.
   ============================================================================= */
'use strict';

const DATA = {};

/* ---------------------------------------------------------------------------
   Core tables
   --------------------------------------------------------------------------- */

DATA.STATS = {
    str: { name: 'Strength', short: 'STR', hint: 'Melee damage and carrying heavy armour.' },
    dex: { name: 'Dexterity', short: 'DEX', hint: 'Bow and dagger damage, accuracy, dodging and critical hits.' },
    con: { name: 'Constitution', short: 'CON', hint: 'Maximum health.' },
    int: { name: 'Intellect', short: 'INT', hint: 'Staff and spell damage, plus a larger pool of energy.' },
    cha: { name: 'Charisma', short: 'CHA', hint: 'Better prices and more persuasive dialogue.' }
};

DATA.LEVEL_XP = [0, 80, 200, 380, 600, 880, 1220, 1620, 2100, 2700];
DATA.MAX_LEVEL = DATA.LEVEL_XP.length;
DATA.POINTS_PER_LEVEL = 2;
DATA.BASE_ATTRIBUTE = 8;
DATA.START_TIME = 8 * 60;              // Day 1, 08:00 (minutes since the start of day 1)

DATA.EQUIPMENT_SLOTS = {
    weapon: { name: 'Weapon', icon: '⚔️' },
    head: { name: 'Head', icon: '⛑️' },
    chest: { name: 'Body', icon: '🛡️' },
    trinket: { name: 'Trinket', icon: '💍' }
};

DATA.DIFFICULTY = {
    easy: { name: 'Gentle', enemyDamage: 0.75, enemyHealth: 0.85, hint: 'Enemies hit softer. Good for a relaxed story.' },
    normal: { name: 'Adventurer', enemyDamage: 1, enemyHealth: 1, hint: 'The intended experience.' },
    hard: { name: 'Veteran', enemyDamage: 1.25, enemyHealth: 1.15, hint: 'Enemies hit harder and last longer.' }
};

DATA.FACTIONS = {
    the_crown: { name: 'The Crown', icon: '👑', description: 'The regency that governs Aethelgard in the name of the young heir.' },
    merchants_guild: { name: "Merchants' Guild", icon: '⚖️', description: 'Traders who keep the roads, the stalls and the coffers full. Friends get better prices.' },
    common_folk: { name: 'Common Folk', icon: '🌾', description: 'Farmers, soldiers and townsfolk. They remember who helped them.' }
};

/* ---------------------------------------------------------------------------
   Character creation: races, classes, backgrounds
   --------------------------------------------------------------------------- */

DATA.races = {
    human: {
        id: 'human', name: 'Human', icon: '🧑',
        description: 'Adaptable and ambitious, the people of the realm learn faster than any other folk.',
        stats: { str: 1, dex: 1, con: 1, int: 1, cha: 1 },
        trait: { name: 'Quick Study', text: 'Gain 10% more experience.' },
        mods: { xpMult: 0.1 }
    },
    elf: {
        id: 'elf', name: 'Elf', icon: '🧝',
        description: 'Graceful wanderers of the old forests, with eyes that miss nothing.',
        stats: { dex: 3, int: 1, cha: 1 },
        trait: { name: 'Keen Sight', text: '+6% critical hit chance.' },
        mods: { crit: 0.06 }
    },
    dwarf: {
        id: 'dwarf', name: 'Dwarf', icon: '🧔',
        description: 'Stout mountain-folk whose bones are said to be older than the hills they dig in.',
        stats: { con: 3, str: 2 },
        trait: { name: 'Stoneblood', text: '+2 armour at all times.' },
        mods: { armor: 2 }
    },
    orc: {
        id: 'orc', name: 'Orc', icon: '💪',
        description: 'Warriors of the northern clans, feared for their strength and respected for their honour.',
        stats: { str: 4, con: 2, int: -1 },
        trait: { name: 'Bloodrage', text: 'Deal 25% more damage while below 40% health.' },
        mods: { rage: 0.25 }
    }
};

DATA.classes = {
    knight: {
        id: 'knight', name: 'Knight', icon: '🛡️',
        description: 'Armoured and unyielding. A knight wins by standing firm and hitting harder than the enemy.',
        stats: { str: 4, con: 3, dex: 1 },
        hp: 8, energy: 10,
        primary: 'str',
        ability: { id: 'shield_bash', name: 'Shield Bash', icon: '🛡️', cost: 4, text: 'A sure blow that deals 120% weapon damage and stuns the enemy for a turn.' },
        start: { weapon: 'arming_sword', chest: 'padded_gambeson', items: [['healing_potion', 1]] }
    },
    ranger: {
        id: 'ranger', name: 'Ranger', icon: '🏹',
        description: 'A hunter of the wild places who strikes from a distance and rarely misses.',
        stats: { dex: 4, con: 2, str: 1, int: 1 },
        hp: 4, energy: 10,
        primary: 'dex',
        ability: { id: 'aimed_shot', name: 'Aimed Shot', icon: '🎯', cost: 4, text: 'A patient shot that never misses, deals 170% weapon damage and crits far more often.' },
        start: { weapon: 'hunting_bow', head: 'leather_cap', items: [['healing_potion', 1], ['bread', 2]] }
    },
    arcanist: {
        id: 'arcanist', name: 'Arcanist', icon: '🔮',
        description: 'A scholar of forbidden fire and quiet words. Fragile, but their magic ignores armour.',
        stats: { int: 5, cha: 1, con: 1, dex: 1 },
        hp: 0, energy: 14,
        primary: 'int',
        ability: { id: 'firebolt', name: 'Firebolt', icon: '🔥', cost: 5, text: 'Hurl flame that ignores armour and sets the target ablaze.' },
        start: { weapon: 'oak_staff', chest: 'scholars_robe', items: [['energy_tonic', 1], ['healing_potion', 1]] }
    },
    rogue: {
        id: 'rogue', name: 'Rogue', icon: '🗡️',
        description: 'A cutpurse and duellist who lives by speed, cunning and the opening that others miss.',
        stats: { dex: 4, cha: 2, str: 1, int: 1 },
        hp: 2, energy: 10,
        primary: 'dex',
        ability: { id: 'backstab', name: 'Backstab', icon: '🩸', cost: 4, text: 'Deal 190% weapon damage and open a bleeding wound. Deadlier against stunned foes.' },
        start: { weapon: 'plain_dagger', chest: 'dark_leathers', items: [['healing_potion', 1], ['smoke_bomb', 1]] }
    }
};

DATA.backgrounds = {
    soldier: {
        id: 'soldier', name: 'Veteran Soldier', icon: '🎖️',
        description: 'You carried a pike for the Crown through the Winter War and learned to take a hit.',
        stats: { str: 1, con: 2 },
        gold: 30,
        perk: { name: 'Drilled', text: '+1 armour at all times.' },
        mods: { armor: 1 },
        items: [['bread', 2]]
    },
    scholar: {
        id: 'scholar', name: 'Wandering Scholar', icon: '📜',
        description: 'You studied in the great libraries of the east before curiosity set you on the road.',
        stats: { int: 2, cha: 1 },
        gold: 40,
        perk: { name: 'Deep Reserves', text: '+3 maximum energy.' },
        mods: { energy: 3 },
        items: [['energy_tonic', 1]]
    },
    outlaw: {
        id: 'outlaw', name: 'Reformed Outlaw', icon: '🪙',
        description: 'You ran with a gang of road thieves once. You still know where the best pockets are.',
        stats: { dex: 2, cha: 1 },
        gold: 25,
        perk: { name: 'Light Fingers', text: '+30% gold from loot and +3% critical chance.' },
        mods: { goldMult: 0.3, crit: 0.03 },
        items: [['smoke_bomb', 1]]
    },
    merchant: {
        id: 'merchant', name: "Merchant's Heir", icon: '💰',
        description: 'You grew up among ledgers and caravans. The family fortune is gone, but the haggling stayed.',
        stats: { cha: 2, int: 1 },
        gold: 90,
        perk: { name: 'Silver Tongue', text: '10% better prices in every shop.' },
        mods: { discount: 0.1 },
        items: [['healing_potion', 1]]
    }
};

/* ---------------------------------------------------------------------------
   Items
   --------------------------------------------------------------------------- */

(function defineItems() {
    const I = {};
    const add = (id, data) => { I[id] = Object.assign({ id, rarity: 'common', value: 0 }, data); };

    // Weapons
    add('plain_dagger', { name: 'Plain Dagger', type: 'weapon', icon: '🗡️', damage: [3, 6], scale: 'dex', value: 20, desc: 'A balanced knife with a worn leather grip.' });
    add('hunting_bow', { name: 'Hunting Bow', type: 'weapon', icon: '🏹', damage: [4, 8], scale: 'dex', value: 70, desc: 'A yew bow strung with waxed sinew.' });
    add('oak_staff', { name: 'Oak Staff', type: 'weapon', icon: '🪄', damage: [3, 6], scale: 'int', value: 40, desc: 'A staff of seasoned oak, humming faintly when held.' });
    add('arming_sword', { name: "Soldier's Arming Sword", type: 'weapon', image: 'images/items/arming-sword.jpg', icon: '⚔️', damage: [4, 8], scale: 'str', value: 60, desc: 'Plain, reliable steel. The kind of blade that wins wars quietly.' });
    add('iron_sword', { name: 'Iron Sword', type: 'weapon', icon: '⚔️', damage: [5, 9], scale: 'str', value: 85, rarity: 'uncommon', desc: 'A sturdy blade hammered out at the forge.' });
    add('battle_axe', { name: 'Battle Axe', type: 'weapon', image: 'images/items/battle-axe.jpg', icon: '🪓', damage: [8, 13], scale: 'str', value: 190, rarity: 'uncommon', req: { str: 13 }, desc: 'A heavy single-bit axe that bites deep.' });
    add('steel_longsword', { name: 'Steel Longsword', type: 'weapon', image: 'images/items/steel-longsword.jpg', icon: '⚔️', damage: [7, 12], scale: 'str', value: 220, rarity: 'uncommon', req: { str: 12 }, desc: 'A long, true blade with a golden pommel.' });
    add('yew_longbow', { name: 'Yew Longbow', type: 'weapon', icon: '🏹', damage: [6, 11], scale: 'dex', value: 180, rarity: 'uncommon', req: { dex: 12 }, desc: 'Tall as a man and twice as patient.' });
    add('ember_staff', { name: 'Ember Staff', type: 'weapon', icon: '🔥', damage: [5, 9], scale: 'int', value: 200, rarity: 'uncommon', req: { int: 12 }, desc: 'The head of this staff glows like a banked coal.' });
    add('sapphire_blade', { name: 'Sapphire-Pommel Blade', type: 'weapon', image: 'images/items/sapphire-blade.jpg', icon: '⚔️', damage: [9, 15], scale: 'str', value: 480, rarity: 'rare', req: { str: 11 }, bonus: { cha: 1 }, desc: 'An heirloom of the lords of Oakvale. The blue stone is cold to the touch.' });

    // Armour
    add('leather_cap', { name: 'Leather Cap', type: 'armor', slot: 'head', icon: '🎩', armor: 1, value: 20, desc: 'Boiled leather, stitched twice.' });
    add('steel_sallet', { name: 'Steel Sallet', type: 'armor', slot: 'head', image: 'images/items/steel-sallet.jpg', icon: '⛑️', armor: 3, value: 90, rarity: 'uncommon', desc: 'A polished steel helm with a leather lining.' });
    add('padded_gambeson', { name: 'Padded Gambeson', type: 'armor', slot: 'chest', icon: '🧥', armor: 2, value: 35, desc: 'Quilted linen that blunts a blow.' });
    add('scholars_robe', { name: "Scholar's Robe", type: 'armor', slot: 'chest', icon: '👘', armor: 1, bonus: { int: 1 }, value: 40, desc: 'Ink-stained wool, embroidered with tiny sigils.' });
    add('dark_leathers', { name: 'Dark Leathers', type: 'armor', slot: 'chest', icon: '🥋', armor: 2, bonus: { dex: 1 }, value: 55, desc: 'Supple dark leather that makes no sound.' });
    add('leather_armor', { name: 'Leather Armour', type: 'armor', slot: 'chest', icon: '🧥', armor: 3, value: 70, desc: 'Hardened leather plates over a linen shirt.' });
    add('chainmail_hauberk', { name: 'Chainmail Hauberk', type: 'armor', slot: 'chest', icon: '⛓️', armor: 5, value: 150, rarity: 'uncommon', req: { str: 11 }, desc: 'Thousands of riveted rings. Heavy, but it turns a blade.' });
    add('steel_cuirass', { name: 'Steel Cuirass', type: 'armor', slot: 'chest', image: 'images/items/steel-cuirass.jpg', icon: '🛡️', armor: 8, value: 260, rarity: 'uncommon', req: { con: 12 }, desc: 'A breastplate of folded steel with articulated shoulders.' });
    add('crimson_cuirass', { name: 'Crimson Eagle Cuirass', type: 'armor', slot: 'chest', image: 'images/items/crimson-cuirass.jpg', icon: '🦅', armor: 10, bonus: { cha: 1 }, value: 450, rarity: 'rare', req: { con: 12 }, desc: 'A parade cuirass of the royal guard, with a gilded eagle on the crimson tabard.' });

    // Trinkets
    add('wolf_tooth_charm', { name: 'Wolf-Tooth Charm', type: 'trinket', slot: 'trinket', icon: '🦷', bonus: { dex: 1 }, value: 45, rarity: 'uncommon', desc: 'A tooth on a leather cord. Hunters swear it sharpens the reflexes.' });
    add('bear_claw_amulet', { name: 'Bear-Claw Amulet', type: 'trinket', slot: 'trinket', icon: '🐾', bonus: { str: 2 }, value: 120, rarity: 'uncommon', desc: 'Carved bone, polished by many hands.' });
    add('amulet_of_vigor', { name: 'Amulet of Vigor', type: 'trinket', slot: 'trinket', icon: '❤️', bonus: { con: 2 }, value: 120, rarity: 'uncommon', desc: 'A warm red stone that seems to beat in time with your pulse.' });
    add('scholars_pendant', { name: "Scholar's Pendant", type: 'trinket', slot: 'trinket', icon: '🔷', bonus: { int: 2 }, value: 120, rarity: 'uncommon', desc: 'A crystal lens that sharpens the thoughts.' });
    add('crown_signet', { name: "Regent's Signet Ring", type: 'trinket', slot: 'trinket', icon: '💍', bonus: { cha: 2, con: 1 }, value: 300, rarity: 'rare', desc: 'A ring bearing the royal stag. Doors open for the one who wears it.' });

    // Consumables
    add('bread', { name: 'Loaf of Bread', type: 'consumable', icon: '🍞', effect: { heal: 8 }, value: 3, desc: 'Coarse, fresh and filling. Restores 8 health.' });
    add('ale', { name: 'Tankard of Ale', type: 'consumable', icon: '🍺', effect: { heal: 6, energy: 2 }, value: 4, desc: 'Restores 6 health and 2 energy.' });
    add('hearty_stew', { name: 'Hearty Stew', type: 'consumable', icon: '🍲', effect: { heal: 25 }, value: 10, desc: "Marta's famous mutton stew. Restores 25 health." });
    add('healing_potion', { name: 'Healing Potion', type: 'consumable', icon: '🧪', effect: { heal: 40 }, value: 25, rarity: 'uncommon', desc: 'A red tincture that knits wounds. Restores 40 health.' });
    add('greater_healing_potion', { name: 'Greater Healing Potion', type: 'consumable', icon: '⚗️', effect: { heal: 90 }, value: 70, rarity: 'rare', desc: 'A thick, luminous draught. Restores 90 health.' });
    add('energy_tonic', { name: 'Energy Tonic', type: 'consumable', icon: '💧', effect: { energy: 8 }, value: 30, rarity: 'uncommon', desc: 'A bitter blue tonic. Restores 8 energy.' });
    add('fire_flask', { name: 'Fire Flask', type: 'consumable', icon: '🔥', effect: { damage: [14, 22], status: 'burn' }, combatOnly: true, value: 35, rarity: 'uncommon', desc: 'Resin and spirits in a clay flask. Deals 14-22 damage and ignites the target.' });
    add('venom_flask', { name: 'Venom Flask', type: 'consumable', icon: '☠️', effect: { damage: [8, 12], status: 'poison' }, combatOnly: true, value: 40, rarity: 'uncommon', desc: 'Spider venom, stoppered tight. Deals 8-12 damage and poisons the target.' });
    add('smoke_bomb', { name: 'Smoke Bomb', type: 'consumable', icon: '💨', effect: { escape: true }, combatOnly: true, value: 40, rarity: 'uncommon', desc: 'Guarantees your escape from any fight that is not against a boss.' });

    // Materials
    add('iron_ore', { name: 'Iron Ore', type: 'material', icon: '🪨', value: 6, desc: 'Rusty red lumps, ready for the furnace.' });
    add('leather_strips', { name: 'Leather Strips', type: 'material', icon: '🟤', value: 5, desc: 'Cured leather cut for stitching.' });
    add('healing_herb', { name: 'Healing Herb', type: 'material', icon: '🌿', value: 6, desc: 'Silvery leaves with a sharp, clean scent.' });
    add('empty_vial', { name: 'Empty Vial', type: 'material', icon: '🫙', value: 3, desc: 'A small stoppered glass bottle.' });
    add('pine_resin', { name: 'Pine Resin', type: 'material', icon: '🍯', value: 4, desc: 'Sticky, golden and highly flammable.' });
    add('wolf_pelt', { name: 'Wolf Pelt', type: 'material', icon: '🐺', value: 12, desc: 'A thick grey pelt.' });
    add('venom_sac', { name: 'Venom Sac', type: 'material', icon: '🟢', value: 15, desc: 'Swollen and heavy with spider venom.' });
    add('bone_dust', { name: 'Grave Dust', type: 'material', icon: '🦴', value: 8, desc: 'Fine grey powder ground from ancient bones.' });

    // Trade goods
    add('tarnished_locket', { name: 'Tarnished Locket', type: 'junk', icon: '📿', value: 30, desc: 'Inside is a portrait too faded to recognise.' });
    add('silver_buckle', { name: 'Silver Buckle', type: 'junk', icon: '🔘', value: 35, desc: 'Cut from an officer\'s belt.' });
    add('jeweled_goblet', { name: 'Jewelled Goblet', type: 'junk', icon: '🏆', value: 60, rarity: 'uncommon', desc: 'A noble\'s drinking cup, dented but still dazzling.' });

    // Quest items
    add('dog_tag', { name: 'Soldier\'s Tag', type: 'quest', icon: '🏷️', value: 0, desc: 'A stamped tin tag from a fallen soldier of the Ninth Company.' });
    add('bandit_ledger', { name: "Captain Varrick's Ledger", type: 'quest', icon: '📒', value: 0, rarity: 'uncommon', desc: 'A greasy ledger listing every stolen cargo and every buyer.' });
    add('oakvale_seal', { name: 'The Oakvale Seal', type: 'quest', icon: '🔱', value: 0, rarity: 'rare', desc: 'A heavy bronze seal engraved with an oak and three stars. It hums with a low, patient power.' });

    DATA.items = I;
}());

/* ---------------------------------------------------------------------------
   Recipes
   --------------------------------------------------------------------------- */

DATA.STATIONS = {
    forge: { name: 'Forge', icon: '🔨' },
    alchemy: { name: 'Alchemy Table', icon: '⚗️' }
};

DATA.recipes = {
    iron_sword: { id: 'iron_sword', result: 'iron_sword', station: 'forge', materials: { iron_ore: 4, leather_strips: 2 } },
    leather_armor: { id: 'leather_armor', result: 'leather_armor', station: 'forge', materials: { leather_strips: 6, wolf_pelt: 2 } },
    steel_cuirass: { id: 'steel_cuirass', result: 'steel_cuirass', station: 'forge', materials: { iron_ore: 12, leather_strips: 4 } },
    healing_potion: { id: 'healing_potion', result: 'healing_potion', station: 'alchemy', materials: { healing_herb: 3, empty_vial: 1 } },
    greater_healing_potion: { id: 'greater_healing_potion', result: 'greater_healing_potion', station: 'alchemy', materials: { healing_herb: 5, healing_potion: 1 } },
    fire_flask: { id: 'fire_flask', result: 'fire_flask', station: 'alchemy', materials: { empty_vial: 1, pine_resin: 3 } },
    venom_flask: { id: 'venom_flask', result: 'venom_flask', station: 'alchemy', materials: { empty_vial: 1, venom_sac: 1 } },
    smoke_bomb: { id: 'smoke_bomb', result: 'smoke_bomb', station: 'alchemy', materials: { pine_resin: 2, bone_dust: 1 } }
};

/* ---------------------------------------------------------------------------
   Enemies
   --------------------------------------------------------------------------- */

DATA.enemies = {
    wolf: {
        id: 'wolf', name: 'Grey Wolf', icon: '🐺', hp: 42, damage: [4, 8], armor: 0, dex: 12, xp: 24, gold: [0, 2],
        intro: 'A grey wolf slinks out of the undergrowth, lips curled back from its teeth.',
        abilities: [{ name: 'Savage Bite', chance: 0.25, mult: 1.2, status: { id: 'bleed', turns: 3, dmg: 2 } }],
        loot: [{ item: 'wolf_pelt', chance: 0.7 }, { item: 'wolf_tooth_charm', chance: 0.05 }]
    },
    dire_wolf: {
        id: 'dire_wolf', name: 'Dire Wolf', icon: '🐺', hp: 72, damage: [6, 10], armor: 1, dex: 11, xp: 48, gold: [0, 4],
        intro: 'A wolf the size of a pony pads into the clearing. Its eyes glow amber.',
        abilities: [{ name: 'Rending Bite', chance: 0.3, mult: 1.3, status: { id: 'bleed', turns: 3, dmg: 3 } }],
        loot: [{ item: 'wolf_pelt', chance: 1, qty: [1, 2] }, { item: 'wolf_tooth_charm', chance: 0.15 }]
    },
    giant_spider: {
        id: 'giant_spider', name: 'Giant Spider', icon: '🕷️', hp: 54, damage: [5, 9], armor: 0, dex: 13, xp: 40, gold: [0, 0],
        intro: 'Something large drops from the branches on a thread of silk. Eight eyes glitter.',
        abilities: [{ name: 'Venomous Bite', chance: 0.4, mult: 1, status: { id: 'poison', turns: 3, dmg: 3 } }],
        loot: [{ item: 'venom_sac', chance: 0.65 }, { item: 'empty_vial', chance: 0.2 }]
    },
    cutthroat: {
        id: 'cutthroat', name: 'Bandit Cutthroat', icon: '🔪', hp: 62, damage: [6, 10], armor: 2, dex: 10, xp: 40, gold: [6, 16],
        intro: '"Your purse or your life, friend," a bandit sneers, drawing a notched knife.',
        abilities: [{ name: 'Dirty Trick', chance: 0.2, mult: 0.8, status: { id: 'stun', turns: 1 } }],
        loot: [{ item: 'silver_buckle', chance: 0.12 }, { item: 'healing_potion', chance: 0.12 }, { item: 'leather_strips', chance: 0.3 }]
    },
    bandit_archer: {
        id: 'bandit_archer', name: 'Bandit Archer', icon: '🏹', hp: 48, damage: [6, 11], armor: 1, dex: 14, xp: 40, gold: [6, 16],
        intro: 'An arrow thuds into the dirt at your feet. The archer reaches for another.',
        abilities: [{ name: 'Pinning Shot', chance: 0.25, mult: 1.1, status: { id: 'bleed', turns: 2, dmg: 2 } }],
        loot: [{ item: 'leather_strips', chance: 0.4 }, { item: 'healing_potion', chance: 0.1 }]
    },
    bandit_captain: {
        id: 'bandit_captain', name: 'Captain Varrick', icon: '🏴', hp: 150, damage: [10, 16], armor: 5, dex: 10, xp: 200, gold: [60, 90], boss: true,
        intro: 'Captain Varrick rises from his chair, a scarred giant with a cleaver in one hand. "You should have stayed in the city."',
        abilities: [
            { name: 'Brutal Cleave', chance: 0.3, mult: 1.5 },
            { name: 'Throat Punch', chance: 0.15, mult: 0.7, status: { id: 'stun', turns: 1 } }
        ],
        enrage: { below: 0.5, mult: 1.25, text: 'Varrick roars and fights with reckless fury!' },
        loot: [
            { item: 'bandit_ledger', chance: 1, requiresQuest: 'm3' },
            { item: 'steel_longsword', chance: 0.35 },
            { item: 'jeweled_goblet', chance: 0.6 },
            { item: 'greater_healing_potion', chance: 0.5 }
        ]
    },
    skeleton: {
        id: 'skeleton', name: 'Restless Skeleton', icon: '💀', hp: 58, damage: [5, 10], armor: 3, dex: 7, xp: 36, gold: [0, 6],
        intro: 'Bones rattle together as a skeleton in rusted mail lurches to its feet.',
        abilities: [{ name: 'Rusty Slash', chance: 0.25, mult: 1.2, status: { id: 'bleed', turns: 2, dmg: 2 } }],
        loot: [{ item: 'bone_dust', chance: 0.6, qty: [1, 2] }, { item: 'iron_ore', chance: 0.35 }, { item: 'tarnished_locket', chance: 0.1 }]
    },
    ghost: {
        id: 'ghost', name: 'Wailing Spirit', icon: '👻', hp: 46, damage: [5, 9], armor: 0, dex: 12, xp: 38, gold: [0, 0], spectral: true,
        intro: 'The air turns bitterly cold. A pale figure drifts through the broken wall, mouth open in a silent scream.',
        abilities: [{ name: 'Terrifying Wail', chance: 0.3, mult: 0.6, status: { id: 'stun', turns: 1 } }],
        loot: [{ item: 'bone_dust', chance: 0.5 }, { item: 'tarnished_locket', chance: 0.18 }]
    },
    barrow_knight: {
        id: 'barrow_knight', name: 'The Barrow Knight', icon: '🗿', hp: 200, damage: [11, 17], armor: 7, dex: 9, xp: 300, gold: [80, 120], boss: true,
        intro: 'In the heart of the crypt, an armoured figure rises from its stone bier. Its visor is empty, but it turns to look at you. "None... shall... take... the Seal."',
        abilities: [
            { name: 'Grave Strike', chance: 0.3, mult: 1.6 },
            { name: 'Shield Slam', chance: 0.2, mult: 0.8, status: { id: 'stun', turns: 1 } }
        ],
        enrage: { below: 0.4, mult: 1.2, text: 'Cold blue fire blazes in the knight\'s helm!' },
        loot: [
            { item: 'oakvale_seal', chance: 1, requiresQuest: 'm4' },
            { item: 'sapphire_blade', chance: 0.4 },
            { item: 'greater_healing_potion', chance: 0.6 },
            { item: 'bone_dust', chance: 1, qty: [2, 3] }
        ]
    },
    deserter: {
        id: 'deserter', name: 'Crown Deserter', icon: '🏃', hp: 68, damage: [6, 11], armor: 3, dex: 9, xp: 44, gold: [8, 20],
        intro: 'A ragged soldier in a torn tabard stumbles out of the mist, sword raised. "I am not going back!"',
        abilities: [{ name: 'Desperate Swing', chance: 0.25, mult: 1.4 }],
        loot: [{ item: 'silver_buckle', chance: 0.2 }, { item: 'bread', chance: 0.4 }, { item: 'healing_potion', chance: 0.12 }]
    },
    carrion_crows: {
        id: 'carrion_crows', name: 'Carrion Crows', icon: '🐦', hp: 34, damage: [3, 6], armor: 0, dex: 16, xp: 20, gold: [0, 0],
        intro: 'A black cloud of crows lifts from the dead and wheels toward you, shrieking.',
        abilities: [{ name: 'Pecking Frenzy', chance: 0.3, mult: 1.5, status: { id: 'bleed', turns: 2, dmg: 1 } }],
        loot: [{ item: 'silver_buckle', chance: 0.1 }]
    },
    marauder: {
        id: 'marauder', name: 'Battlefield Marauder', icon: '⚔️', hp: 92, damage: [8, 13], armor: 4, dex: 9, xp: 60, gold: [12, 28],
        intro: 'A scavenger in looted plate straightens from a corpse and hefts a mace. "Finders keepers."',
        abilities: [{ name: 'Skull Crusher', chance: 0.25, mult: 1.5, status: { id: 'stun', turns: 1 } }],
        loot: [{ item: 'jeweled_goblet', chance: 0.12 }, { item: 'chainmail_hauberk', chance: 0.06 }, { item: 'healing_potion', chance: 0.2 }]
    }
};

DATA.STATUSES = {
    bleed: { name: 'Bleeding', icon: '🩸', dot: true },
    poison: { name: 'Poisoned', icon: '☠️', dot: true },
    burn: { name: 'Burning', icon: '🔥', dot: true },
    stun: { name: 'Stunned', icon: '💫', dot: false }
};

/* ---------------------------------------------------------------------------
   NPCs
   --------------------------------------------------------------------------- */

DATA.npcs = {
    aldric: {
        id: 'aldric', name: 'Chancellor Aldric Vane', title: 'Voice of the Regency', location: 'throne_room',
        portrait: 'images/portraits/aldric.jpg', icon: '👑',
        greeting: [
            'The chancellor does not look up from his maps. "Ah. The adventurer. Good. Time is short."',
            '"Speak plainly. I have little patience and fewer allies," Aldric says, steepling his gauntleted fingers.'
        ],
        rumors: [
            'The old king is gone, and the heir is only nine. The regency holds the realm together with ink, iron and a great deal of prayer.',
            'The Oakvale Seal was the signet of the lords of Oakvale. Whoever holds it can claim their lands, their banners and, some whisper, the loyalty of the northern keeps.',
            'Bandits have grown bold in the Frostfang foothills. They do not steal grain. They steal secrets.'
        ]
    },
    marta: {
        id: 'marta', name: 'Marta Hollis', title: "Keeper of the Serpent's Cup", location: 'tavern',
        portrait: null, icon: '🍺', shop: 'tavern',
        greeting: [
            '"Sit, sit! You look like you have walked a long way. The stew is hot and the ale is only half water."',
            'Marta wipes her hands on her apron. "What will it be, traveller?"'
        ],
        rumors: [
            '"Wolves have been taking sheep from the northern farms. Come dusk, the whole woods howl."',
            '"Harlan at the forge was a knight once, they say. Do not ask him about it. He will give you that look."',
            '"Silas Quill sells most things. Do not ask where he gets them. Everyone does, and he never says."',
            '"Sergeant Dorn sits out on the battlefield every night, talking to the dead. I leave a bowl of stew at the road. It is always empty in the morning."'
        ]
    },
    silas: {
        id: 'silas', name: 'Silas Quill', title: 'Merchant and Fence', location: 'market',
        portrait: 'images/portraits/silas.jpg', icon: '💰', shop: 'silas',
        greeting: [
            '"Welcome, welcome, friend! If it can be bought, I have it. If it cannot, I can find it for a modest fee."',
            'Silas grins and pats a bulging coin pouch. "Business is good. Let us make it better."'
        ],
        rumors: [
            '"The Merchants\' Guild pays well for a calm road. Calm roads do not happen by accident."',
            '"A good alchemist can turn a handful of herbs and a bottle into a month\'s wages. I keep an alembic here you may use."',
            '"Heard of the Oakvale Seal? I could name a dozen noble houses who would pay in gold or in blood for that trinket."'
        ]
    },
    harlan: {
        id: 'harlan', name: 'Harlan Ironhand', title: 'Master Smith', location: 'forge',
        portrait: 'images/portraits/harlan.jpg', icon: '🔨', shop: 'harlan',
        greeting: [
            'The old smith does not stop hammering. "If you want something shiny, buy it. If you want something good, bring me ore."',
            '"Mind the sparks," Harlan grunts, plunging a blade into the quench barrel with a hiss of steam.'
        ],
        rumors: [
            '"A blade is only as good as the arm that swings it. Bring me iron and I will show you how to turn ore into steel."',
            '"I forged for the Ninth Company once. Good lads. Most did not come home from the Fields of Sorrow."',
            '"Whatever the Barrow Knight guards, it is not worth the bones that already lie around it."'
        ]
    },
    dorn: {
        id: 'dorn', name: 'Sergeant Dorn', title: 'Last of the Ninth Company', location: 'battlefield',
        portrait: 'images/portraits/dorn.jpg', icon: '🎖️',
        greeting: [
            'The old soldier stares across the mud. "They are still out there, you know. Waiting for someone to bring them home."',
            '"Keep your voice down, friend," Dorn murmurs. "The ground here has long ears."'
        ],
        rumors: [
            '"We held this ridge for three days. The Crown\'s relief column never came. Some say it was never sent."',
            '"Deserters hide in the mist. I cannot blame them. But they prey on the grieving, and that I will not forgive."',
            '"The crows know where the dead lie. Follow them, and you will find what the scavengers missed."'
        ]
    },
    wren: {
        id: 'wren', name: 'Hermit Wren', title: 'Keeper of the Green', location: 'whispering_woods',
        portrait: null, icon: '🌿', shop: 'wren',
        greeting: [
            'An old woman peers from a hut woven of roots and moss. "You walk loudly. The trees do not mind. The wolves do."',
            '"Herbs, vials, a warm fire," Wren cackles. "Everything a wanderer needs and nothing he deserves."'
        ],
        rumors: [
            '"The spiders came with the first frost. Something in the deep wood is driving them out."',
            '"Healing herb grows by the stream beds. Gather it before dusk, when the wolves wake."',
            '"The ruins to the east were once Oakvale. The dead there do not rest well."'
        ]
    }
};

/* ---------------------------------------------------------------------------
   Shops
   --------------------------------------------------------------------------- */

DATA.shops = {
    silas: {
        id: 'silas', title: "Silas Quill's Stall", npc: 'silas', faction: 'merchants_guild',
        quote: '"Every coin spent here is a coin well spent. Mostly."',
        stock: ['healing_potion', 'greater_healing_potion', 'energy_tonic', 'fire_flask', 'smoke_bomb', 'bread', 'empty_vial', 'healing_herb', 'leather_strips', 'leather_cap', 'leather_armor', 'bear_claw_amulet', 'amulet_of_vigor', 'scholars_pendant']
    },
    harlan: {
        id: 'harlan', title: "Harlan's Forge", npc: 'harlan', faction: 'merchants_guild',
        quote: '"Good steel does not come cheap. Neither does a funeral."',
        stock: ['plain_dagger', 'hunting_bow', 'oak_staff', 'arming_sword', 'battle_axe', 'steel_longsword', 'yew_longbow', 'ember_staff', 'chainmail_hauberk', 'steel_sallet', 'steel_cuirass', 'iron_ore']
    },
    tavern: {
        id: 'tavern', title: "Marta's Kitchen", npc: 'marta', faction: 'common_folk',
        quote: '"Eat up. Dead heroes do not tip."',
        stock: ['bread', 'ale', 'hearty_stew', 'healing_herb']
    },
    wren: {
        id: 'wren', title: "Wren's Hut", npc: 'wren', faction: 'common_folk',
        quote: '"Take what you need. The forest provides, and I charge."',
        stock: ['healing_herb', 'empty_vial', 'pine_resin', 'healing_potion', 'bread']
    }
};

/* ---------------------------------------------------------------------------
   Locations
   region: 'city' places are one hour apart; wild places are 'distance' hours from the city.
   --------------------------------------------------------------------------- */

DATA.locations = {
    market: {
        id: 'market', name: 'Aethelgard Market', region: 'city', distance: 0, icon: '🏘️',
        image: 'images/scenes/market.jpg',
        summary: 'Stalls, shouting and sunlight in the beating heart of the capital.',
        description: 'Canvas awnings snap in the breeze above a river of shoppers. Merchants bellow prices, children dart between the crates, and somewhere a minstrel is murdering a ballad. Beyond the rooftops, the white spires of the palace catch the light.',
        stations: ['alchemy'],
        npcs: ['silas'],
        actions: [
            { id: 'talk_silas', type: 'talk', npc: 'silas', label: 'Speak with Silas Quill' },
            { id: 'shop_silas', type: 'shop', shop: 'silas', label: "Browse Silas's Stall" },
            { id: 'stalls', type: 'explore', label: 'Wander the Stalls', icon: '🧺', hours: 1 },
            { id: 'alchemy', type: 'craft', label: 'Use the Alchemy Table' }
        ],
        events: [
            { id: 'market_coin', weight: 3, title: 'A Dropped Coin Purse', text: 'A coin purse lies half hidden beneath a cart wheel. No one is looking for it.', effects: { gold: [6, 18] } },
            { id: 'market_gossip', weight: 3, title: 'Overheard Gossip', text: 'Two fishmongers argue loudly about taxes. Between insults, you pick up useful scraps: the regent trusts nobody, the forge is hiring, and the roads north are not safe after dark.', effects: { xp: 8 } },
            { id: 'market_herbs', weight: 2, title: 'An Herbalist\'s Gift', text: 'A kindly herb-seller presses a bundle of leaves into your hand. "For the road. You look like you will need it."', effects: { items: [{ item: 'healing_herb', qty: [1, 2] }] } },
            { id: 'market_thief', weight: 2, title: 'A Quick-Fingered Thief',
              text: 'A boy in a patched cloak bumps into you. Your hand drops to your belt and finds his wrist.',
              choices: [
                  { label: 'Let him go with a warning', text: 'The boy blinks, then bolts. A woman nearby smiles at you.', effects: { rep: { common_folk: 4 }, xp: 10 } },
                  { label: 'Drag him to the guards', text: 'The guards thank you with a few coins and a lecture about civic duty.', effects: { gold: [8, 14], rep: { the_crown: 4 } } },
                  { label: 'Charm a story out of him', requires: { stat: 'cha', min: 11 }, text: 'You coax a tale out of him: a hideout, a ring of pickpockets. He leads you to a stash of loot and begs you not to tell.', effects: { gold: [15, 30], items: [{ item: 'silver_buckle', chance: 0.5 }], xp: 14 } }
              ] },
            { id: 'market_pickpocket', weight: 1, title: 'Light Fingers', text: 'The crowd closes in, and when it parts your coin purse is a little lighter.', effects: { gold: -8 } },
            { id: 'market_trader', weight: 2, title: 'A Generous Trader', text: 'A caravan master, delighted by your honesty in settling a dispute, rewards you with a small gift.', effects: { gold: [10, 20], rep: { merchants_guild: 5 } } }
        ]
    },

    tavern: {
        id: 'tavern', name: "The Serpent's Cup", region: 'city', distance: 0, icon: '🍺',
        image: 'images/scenes/tavern.jpg',
        summary: 'A smoky inn where every traveller has a story and half are true.',
        description: 'A low-beamed taproom smelling of woodsmoke, spilled ale and roasting meat. A fire roars in the great stone hearth. Sailors, soldiers and scoundrels share crowded tables, and none of them look directly at the stranger by the door.',
        npcs: ['marta'],
        actions: [
            { id: 'talk_marta', type: 'talk', npc: 'marta', label: 'Speak with Marta Hollis' },
            { id: 'rest', type: 'rest', label: 'Rent a Bed for the Night', cost: 10, hours: 8 },
            { id: 'shop_marta', type: 'shop', shop: 'tavern', label: 'Order Food and Drink' },
            { id: 'dice', type: 'explore', label: 'Join the Dice Game', icon: '🎲', hours: 1, eventPool: ['dice_game'] }
        ],
        events: [
            { id: 'dice_game', weight: 1, title: 'The Dice Table',
              text: 'A grizzled dockhand shakes a leather cup. "Two dice, friend. Call high or low, and the house pays double on a lucky guess."',
              choices: [
                  { label: 'Bet 10 gold', requires: { gold: 10 }, roll: { chance: 0.48, win: { text: 'The dice clatter and fall in your favour! The dockhand curses and pays up.', effects: { gold: 10 } }, lose: { text: 'The dice betray you. The dockhand scoops up your coin with a gap-toothed grin.', effects: { gold: -10 } } } },
                  { label: 'Bet 30 gold', requires: { gold: 30 }, roll: { chance: 0.48, win: { text: 'A triumphant roll! The whole table groans and a few patrons applaud.', effects: { gold: 30, xp: 5 } }, lose: { text: 'A miserable roll. The dockhand pats your shoulder. "Better luck next time."', effects: { gold: -30 } } } },
                  { label: 'Walk away', text: 'You leave the dice to those who enjoy losing.', effects: {} }
              ] }
        ]
    },

    throne_room: {
        id: 'throne_room', name: 'The Royal Palace', region: 'city', distance: 0, icon: '🏰',
        image: 'images/scenes/throne-room.jpg',
        summary: 'Stained glass, crimson carpets and a throne with no king upon it.',
        description: 'Sunlight pours through towering stained-glass windows and pools on a long crimson carpet. The golden throne stands empty. Guards in crimson tabards line the walls like statues, and the hush is thick enough to cut.',
        npcs: ['aldric'],
        actions: [
            { id: 'talk_aldric', type: 'talk', npc: 'aldric', label: 'Approach Chancellor Aldric' },
            { id: 'library', type: 'explore', label: 'Study in the Royal Library', icon: '📚', hours: 2 }
        ],
        events: [
            { id: 'library_lore', weight: 3, max: 3, title: 'The Winter War', text: 'A dusty chronicle recounts the Winter War: the fall of Oakvale, the Ninth Company\'s last stand, and the rise of the regency. You read until the candles gutter.', effects: { xp: 20 } },
            { id: 'library_seal', weight: 2, max: 2, title: 'The Lords of Oakvale', text: 'A genealogy bound in green leather. The lords of Oakvale carried a bronze seal that could open the royal vault and legitimise any claim in the north. It vanished with the last lord.', effects: { xp: 20 } },
            { id: 'library_notes', weight: 2, max: 2, title: 'An Alchemist\'s Notes', text: 'Between the pages of a heavy tome lies a sheet of crabbed alchemical notes. You copy the useful parts.', effects: { xp: 15, items: [{ item: 'energy_tonic', qty: 1 }] } },
            { id: 'library_quiet', weight: 2, title: 'A Quiet Afternoon', text: 'You spend a peaceful hour with old maps and older stories. Nothing happens, and it is a relief.', effects: { hp: 5 } }
        ]
    },

    forge: {
        id: 'forge', name: 'The Grand Forge', region: 'city', distance: 0, icon: '🔨',
        image: 'images/scenes/forge.jpg',
        summary: 'The roar of the furnace and the ring of hammer on steel.',
        description: 'Heat rolls over you the moment you cross the threshold. Racks of swords, axes and helmets line the walls, and sparks leap from the anvil with every ringing blow. The master smith works without pause.',
        stations: ['forge'],
        npcs: ['harlan'],
        actions: [
            { id: 'talk_harlan', type: 'talk', npc: 'harlan', label: 'Speak with Harlan Ironhand' },
            { id: 'shop_harlan', type: 'shop', shop: 'harlan', label: "Browse Harlan's Wares" },
            { id: 'forge', type: 'craft', label: 'Use the Forge' }
        ],
        events: []
    },

    whispering_woods: {
        id: 'whispering_woods', name: 'Whispering Woods', region: 'wild', distance: 3, icon: '🌲',
        image: 'images/scenes/whispering-woods.jpg',
        summary: 'Ancient trees, shafts of pale light and the sound of something watching.',
        description: 'Shafts of green-gold light slant through the canopy. Moss muffles every footstep, and the wind seems to speak in half-heard words. Paw prints cross the path, and not all of them are small.',
        stations: ['alchemy'],
        npcs: ['wren'],
        enemyPool: [['wolf', 5], ['giant_spider', 3], ['dire_wolf', 1]],
        actions: [
            { id: 'talk_wren', type: 'talk', npc: 'wren', label: 'Visit Hermit Wren' },
            { id: 'forage', type: 'forage', label: 'Forage for Herbs', icon: '🌿', hours: 2 },
            { id: 'hunt', type: 'fight', label: 'Hunt in the Thickets', icon: '⚔️', hours: 1 },
            { id: 'wander', type: 'explore', label: 'Follow the Hidden Paths', icon: '🧭', hours: 2 },
            { id: 'alchemy', type: 'craft', label: "Use Wren's Cauldron" },
            { id: 'camp', type: 'camp', label: 'Make Camp', hours: 6 }
        ],
        forage: { items: [{ item: 'healing_herb', qty: [1, 3], chance: 1 }, { item: 'pine_resin', qty: [1, 2], chance: 0.5 }], ambush: 0.1 },
        events: [
            { id: 'woods_cart', weight: 3, title: 'An Overturned Cart', text: 'Splintered wood and broken crates lie across the track. The cart has been torn apart by claws. Among the debris you find a few untouched goods.', effects: { gold: [4, 12], items: [{ item: 'leather_strips', qty: [1, 2] }] } },
            { id: 'woods_shrine', weight: 2, title: 'A Moss-Covered Shrine', text: 'A small stone shrine, wreathed in ivy. A faint warmth radiates from it. You offer a quiet word, and your wounds ease.', effects: { hp: 15, xp: 8 } },
            { id: 'woods_wolves', weight: 3, title: 'Eyes in the Dark', text: 'The undergrowth falls silent. Then comes the low growl of something that has already decided you are food.', effects: { fight: 'wolf' } },
            { id: 'woods_spider', weight: 2, title: 'A Web Across the Path', text: 'You walk into a sticky strand. Above you, something stirs.', effects: { fight: 'giant_spider' } },
            { id: 'woods_hunter', weight: 2, title: 'The Dead Hunter', text: 'A hunter lies against a tree, long dead. His satchel is still full.', effects: { items: [{ item: 'healing_potion', chance: 0.6 }, { item: 'iron_ore', qty: [1, 2], chance: 0.8 }], gold: [5, 15] } },
            { id: 'woods_traveler', weight: 2, max: 3, title: 'A Wounded Traveller',
              text: 'A pilgrim sits by the road, clutching a bleeding leg. "Please," he whispers. "I was robbed. I have nothing left."',
              choices: [
                  { label: 'Give him a Healing Potion', requires: { item: 'healing_potion' }, effects: { removeItems: [{ item: 'healing_potion', qty: 1 }], rep: { common_folk: 8 }, xp: 30, gold: [10, 20] }, text: 'He weeps with gratitude, and presses a few hidden coins into your hand despite your protests.' },
                  { label: 'Bind his wound with herbs', requires: { item: 'healing_herb' }, effects: { removeItems: [{ item: 'healing_herb', qty: 1 }], rep: { common_folk: 5 }, xp: 18 }, text: 'You do what you can. He thanks you and limps toward the city.' },
                  { label: 'Take his boots and leave', text: 'It is cruel, but practical. He curses you as you go. You feel slightly heavier of conscience.', effects: { gold: [4, 10], rep: { common_folk: -10 } } },
                  { label: 'Walk on', text: 'You pretend not to see him. The forest quietly judges you.', effects: {} }
              ] }
        ]
    },

    ruined_keep: {
        id: 'ruined_keep', name: 'The Ruins of Oakvale', region: 'wild', distance: 4, icon: '🏚️',
        image: 'images/scenes/ruined-keep.jpg',
        summary: 'A shattered keep above a crypt that should have stayed sealed.',
        description: 'The keep of Oakvale rises against a bruised orange sky, its towers cracked and its courtyard choked with weeds. Wind sighs through empty windows. Something cold stirs below, in the barrow beneath the old chapel.',
        npcs: [],
        enemyPool: [['skeleton', 5], ['ghost', 3]],
        actions: [
            { id: 'search', type: 'explore', label: 'Search the Ruins', icon: '🔍', hours: 2 },
            { id: 'hunt', type: 'fight', label: 'Confront the Restless Dead', icon: '⚔️', hours: 1 },
            { id: 'barrow', type: 'boss', enemy: 'barrow_knight', label: 'Descend into the Barrow Crypt', icon: '💀', hours: 1, requiresQuest: 'm4', lockedHint: "Chancellor Aldric's quest 'The Oakvale Seal' will tell you what waits below." },
            { id: 'camp', type: 'camp', label: 'Make Camp', hours: 6 }
        ],
        events: [
            { id: 'keep_rubble', weight: 3, title: 'Collapsed Masonry', text: 'Beneath a fallen beam you spot something glinting: coins, spilled from a broken strongbox centuries ago.', effects: { gold: [10, 28] } },
            { id: 'keep_forge', weight: 2, title: 'The Old Armoury', text: 'A cracked armoury still holds scraps of good metal. You gather what you can carry.', effects: { items: [{ item: 'iron_ore', qty: [2, 4] }] } },
            { id: 'keep_skeleton', weight: 3, title: 'Bones Underfoot', text: 'A pile of bones shifts in the courtyard. Then it stands.', effects: { fight: 'skeleton' } },
            { id: 'keep_ghost', weight: 2, title: 'A Cold Presence', text: 'The temperature plummets. Your breath fogs. Something pale drifts through the arch.', effects: { fight: 'ghost' } },
            { id: 'keep_chapel', weight: 2, title: 'The Broken Chapel', text: 'A cracked altar still bears a few trinkets left by the faithful. A faint peace lingers here.', effects: { hp: 12, items: [{ item: 'tarnished_locket', chance: 0.5 }], xp: 10 } },
            { id: 'keep_inscription', weight: 2, max: 2, title: 'A Carved Inscription', text: 'Letters cut into the great hearth read: "Beneath the oak, the seal. Beneath the seal, the knight. Beneath the knight, the truth." You commit the words to memory.', effects: { xp: 25 } }
        ]
    },

    bandit_camp: {
        id: 'bandit_camp', name: 'Frostfang Bandit Camp', region: 'wild', distance: 5, icon: '⛺',
        image: 'images/scenes/bandit-camp.jpg',
        summary: 'Smoke, tents and the glint of knives beneath a mountain sky.',
        description: 'Campfires gutter beneath the great teeth of the Frostfang Peaks. Ragged tents cluster around a fire, and hard-eyed men sharpen their blades. Stolen goods are stacked in crates under tarpaulins. Every eye in the camp finds you at once.',
        npcs: [],
        enemyPool: [['cutthroat', 5], ['bandit_archer', 4]],
        actions: [
            { id: 'scout', type: 'explore', label: 'Scout the Perimeter', icon: '🔭', hours: 2 },
            { id: 'hunt', type: 'fight', label: 'Ambush a Patrol', icon: '⚔️', hours: 1 },
            { id: 'captain', type: 'boss', enemy: 'bandit_captain', label: "Storm the Captain's Tent", icon: '🏴', hours: 1, requiresQuest: 'm3', lockedHint: "Chancellor Aldric's quest 'The Captain's Ledger' will give you a reason to storm the tent." },
            { id: 'camp', type: 'camp', label: 'Make Camp', hours: 6 }
        ],
        events: [
            { id: 'camp_crate', weight: 3, title: 'Unwatched Crates', text: 'You slip behind the supply tent. Crates stamped with merchant seals hold quite a bit that no longer belongs to its owners.', effects: { gold: [14, 30], items: [{ item: 'leather_strips', qty: [1, 3] }] } },
            { id: 'camp_patrol', weight: 3, title: 'A Patrol Spots You', text: '"Oi! Who goes there?" Steel rasps from sheaths.', effects: { fight: 'cutthroat' } },
            { id: 'camp_archer', weight: 2, title: 'Arrow from the Rocks', text: 'An arrow whistles past your ear. Someone has the high ground.', effects: { fight: 'bandit_archer' } },
            { id: 'camp_map', weight: 2, max: 2, title: 'A Stolen Map', text: 'A stained map of trade routes lies in a tent. Marks show where the bandits plan their next raid.', effects: { xp: 25, rep: { merchants_guild: 6 } } },
            { id: 'camp_prisoner', weight: 2, max: 2, title: 'A Bound Prisoner',
              text: 'A scruffy merchant is tied to a post at the edge of camp. He looks at you with desperate hope.',
              choices: [
                  { label: 'Cut him free', text: 'You slip him loose. In gratitude, he promises word of your kindness to the Guild.', effects: { rep: { merchants_guild: 10, common_folk: 4 }, xp: 25, gold: [15, 30] } },
                  { label: 'Leave him; it is not your fight', text: 'You turn your back on his pleading eyes.', effects: { rep: { merchants_guild: -3 } } }
              ] }
        ]
    },

    battlefield: {
        id: 'battlefield', name: 'The Fields of Sorrow', region: 'wild', distance: 3, icon: '⚰️',
        image: 'images/scenes/battlefield.jpg',
        summary: 'A fog-laden battlefield where the Ninth Company made its last stand.',
        description: 'Torn banners hang from broken spears. Dented helms lie in the mud beside the fallen, and the air tastes of rust and rain. Crows circle overhead. This is where the Ninth Company fell, and the dead have not been collected.',
        npcs: ['dorn'],
        enemyPool: [['deserter', 4], ['carrion_crows', 3], ['marauder', 3]],
        actions: [
            { id: 'talk_dorn', type: 'talk', npc: 'dorn', label: 'Speak with Sergeant Dorn' },
            { id: 'search', type: 'explore', label: 'Search the Fallen', icon: '🔍', hours: 2 },
            { id: 'hunt', type: 'fight', label: 'Challenge the Scavengers', icon: '⚔️', hours: 1 },
            { id: 'camp', type: 'camp', label: 'Make Camp', hours: 6 }
        ],
        events: [
            { id: 'field_tag', weight: 6, title: 'A Soldier\'s Tag', requiresQuest: 'q_dorn', text: 'Half buried in the mud, a stamped tin tag glints dully. You turn it over: the name is still legible.', effects: { items: [{ item: 'dog_tag', qty: 1 }] } },
            { id: 'field_pack', weight: 3, title: 'A Fallen Soldier\'s Pack', text: 'A haversack, long forgotten. The straps have rotted but the contents are intact.', effects: { gold: [8, 22], items: [{ item: 'bread', chance: 0.6 }, { item: 'silver_buckle', chance: 0.3 }] } },
            { id: 'field_crows', weight: 2, title: 'The Crows Descend', text: 'You disturb the crows from their feast. They do not take it kindly.', effects: { fight: 'carrion_crows' } },
            { id: 'field_deserter', weight: 2, title: 'A Shape in the Mist', text: 'A figure stumbles out of the fog, blade in hand.', effects: { fight: 'deserter' } },
            { id: 'field_banner', weight: 2, max: 2, title: 'The Torn Banner', text: 'You straighten a fallen banner of the Ninth Company and plant it upright in the mud. The mist seems to part for a moment, and the field feels a little less lonely.', effects: { xp: 15, rep: { common_folk: 4 } } },
            { id: 'field_marauder', weight: 2, title: 'Looters at Work', text: 'A scavenger turns and sees you. "Find your own corpse," he snarls, reaching for his mace.', effects: { fight: 'marauder' } }
        ]
    }
};

DATA.LOCATION_ORDER = ['market', 'tavern', 'throne_room', 'forge', 'whispering_woods', 'battlefield', 'ruined_keep', 'bandit_camp'];

/* ---------------------------------------------------------------------------
   Quests
   --------------------------------------------------------------------------- */

DATA.quests = {
    m1: {
        id: 'm1', type: 'main', title: 'A Summons from the Crown', giver: null, turnIn: 'aldric', autoStart: true,
        summary: 'Report to Chancellor Aldric at the Royal Palace.',
        offer: '',
        objectives: [{ type: 'talk', npc: 'aldric', text: 'Speak with Chancellor Aldric in the Royal Palace' }],
        complete: 'Aldric studies you for a long moment. "You came. Good. Most would have ignored a royal summons, given what I am about to ask. The realm is fragile, adventurer. I have need of someone who is not already tied to a noble house."',
        reward: { xp: 40, gold: 30 }
    },
    s_wolves: {
        id: 's_wolves', type: 'side', title: 'Wolves in the Woods', giver: 'marta', turnIn: 'marta',
        summary: 'Hunt three wolves in the Whispering Woods for Marta.',
        offer: '"The wolves have been at the northern farms," Marta says, scrubbing a tankard. "Three shepherds have already refused to go back out. Thin the pack in the Whispering Woods and I will make it worth your while."',
        objectives: [{ type: 'kill', target: ['wolf', 'dire_wolf'], count: 3, text: 'Slay wolves in the Whispering Woods' }],
        complete: '"The farmers will sleep tonight. Take this, and eat something. You look like you have been wrestling a bear."',
        reward: { xp: 70, gold: 40, items: [['hearty_stew', 2]], rep: { common_folk: 8 } }
    },
    s_blade: {
        id: 's_blade', type: 'side', title: 'A Blade of Your Own', giver: 'harlan', turnIn: 'harlan',
        summary: 'Forge an Iron Sword at the Grand Forge. Ore and leather are sold by Harlan and Silas.',
        offer: 'Harlan finally sets down his hammer. "You carry that blade like a stranger. Buy the ore, I will let you use my forge. Make an iron sword with your own hands and you will never again trust a shop sword."',
        objectives: [{ type: 'craft', recipe: 'iron_sword', count: 1, text: 'Forge an Iron Sword at the Grand Forge' }],
        complete: 'Harlan runs a thumb along the edge, grunts, and nods. "Crooked at the tang. It will do. I have seen worse from apprentices of five years. Keep at it."',
        reward: { xp: 70, gold: 25, items: [['wolf_tooth_charm', 1]], rep: { merchants_guild: 6 } }
    },
    s_herbs: {
        id: 's_herbs', type: 'side', title: 'Herbs for the Hearth', giver: 'marta', turnIn: 'marta', minLevel: 1, requires: [],
        summary: 'Bring Marta four Healing Herbs from the Whispering Woods.',
        offer: '"The healer\'s apprentice came by twice this week, asking for herbs," Marta sighs. "Gather four healing herbs for me in the woods, and I will send you off with some of the good tonics."',
        objectives: [{ type: 'collect', item: 'healing_herb', count: 4, consume: true, text: 'Gather Healing Herbs' }],
        complete: 'Marta tucks the herbs into her apron. "Bless you. Here are the tonics I promised. Do not drink them all at once."',
        reward: { xp: 60, gold: 20, items: [['healing_potion', 2], ['energy_tonic', 1]], rep: { common_folk: 6 } }
    },
    m2: {
        id: 'm2', type: 'main', title: 'Bones Beneath Oakvale', giver: 'aldric', turnIn: 'aldric', requires: ['m1'], minLevel: 2,
        summary: 'Search the Ruins of Oakvale and destroy four Restless Skeletons.',
        offer: '"Oakvale fell in the Winter War, and with it the seal of its lords. I want to know if the rumours are true: that the dead stir there and that something guards the ruins. Go to Oakvale. Search the ruins. Destroy any of the restless dead that you find. Return and tell me what you saw."',
        objectives: [
            { type: 'explore', location: 'ruined_keep', count: 2, text: 'Search the Ruins of Oakvale' },
            { type: 'kill', target: 'skeleton', count: 4, text: 'Destroy Restless Skeletons' }
        ],
        complete: '"So the rumours are true. Whatever sleeps in Oakvale, it is guarded by the dead of its own lords. A grim business, but you have done well. Take this. You will need it where you are going next."',
        reward: { xp: 130, gold: 60, items: [['steel_sallet', 1]], rep: { the_crown: 8 } }
    },
    s_cart: {
        id: 's_cart', type: 'side', title: "Silas's Stray Cart", giver: 'silas', turnIn: 'silas', requires: ['m1'], minLevel: 2,
        summary: "Find Silas's lost cart in the Whispering Woods and slay two giant spiders.",
        offer: '"I lost a cart on the northern road three days ago," Silas says, wringing his hat. "Silk, spices, a very expensive music box. My driver ran back screaming about spiders. Find the cart, kill whatever lives there, and I will give you a proper reward."',
        objectives: [
            { type: 'explore', location: 'whispering_woods', count: 2, text: 'Search the Whispering Woods for the cart' },
            { type: 'kill', target: 'giant_spider', count: 2, text: 'Kill the spiders guarding the road' }
        ],
        complete: 'Silas almost weeps. "The music box! Still wrapped in oilcloth! You, my friend, are a hero of commerce."',
        reward: { xp: 110, gold: 90, items: [['bear_claw_amulet', 1]], rep: { merchants_guild: 12 } }
    },
    q_dorn: {
        id: 'q_dorn', type: 'side', title: "Dorn's Last Request", giver: 'dorn', turnIn: 'dorn', minLevel: 3,
        summary: "Gather three Soldier's Tags from the Fields of Sorrow for Sergeant Dorn.",
        offer: '"I buried what I could," Dorn whispers. "But the Ninth Company had families. Fathers. Daughters waiting for letters that never came. Bring me three of their tags, and I will see they are named."',
        objectives: [{ type: 'collect', item: 'dog_tag', count: 3, consume: true, text: "Recover Soldier's Tags (search the fallen)" }],
        complete: 'Dorn takes the three tags with trembling fingers. "Names. Only names. But names are what we have left." He looks at you. "What would you do with the rest of what the dead carry?"',
        choices: [
            { id: 'bury', label: 'Bury the dead and return their belongings', text: 'You help Dorn dig graves until dusk. The mud stays on your hands, but the field is quiet.', reward: { xp: 110, gold: 20, rep: { common_folk: 20, the_crown: 5 }, items: [['amulet_of_vigor', 1]] } },
            { id: 'sell', label: 'Keep the valuables for yourself', text: 'Dorn says nothing. His silence is worse than any curse. You take what the fallen carried.', reward: { xp: 80, gold: 140, rep: { common_folk: -12 }, items: [['jeweled_goblet', 1]] } }
        ],
        reward: {}
    },
    s_deserters: {
        id: 's_deserters', type: 'side', title: 'Predators in the Mist', giver: 'dorn', turnIn: 'dorn', requires: ['q_dorn'], minLevel: 3,
        summary: 'Defeat three Crown Deserters or Marauders on the battlefield.',
        offer: '"Deserters and scavengers prey on the grieving," Dorn says darkly. "Three of them took the last coin from a widow yesterday. I am too old to chase them. You are not."',
        objectives: [{ type: 'kill', target: ['deserter', 'marauder'], count: 3, text: 'Defeat deserters and marauders' }],
        complete: '"A good day\'s work. The field will remember it." Dorn hands you a heavy pouch.',
        reward: { xp: 120, gold: 110, rep: { common_folk: 8 } }
    },
    m3: {
        id: 'm3', type: 'main', title: "The Captain's Ledger", giver: 'aldric', turnIn: 'aldric', requires: ['m2'], minLevel: 4,
        summary: "Slay bandits and take Captain Varrick's ledger from the Frostfang camp.",
        offer: '"The bandits in the Frostfang foothills are not mere thieves," Aldric says. "Captain Varrick keeps a ledger of every buyer and every cargo. I want it. Find the camp, break the patrols and take the ledger from Varrick\'s own hand. I suspect a noble name is written in it."',
        objectives: [
            { type: 'kill', target: ['cutthroat', 'bandit_archer'], count: 3, text: 'Defeat bandits at the Frostfang camp' },
            { type: 'kill', target: 'bandit_captain', count: 1, text: 'Defeat Captain Varrick' },
            { type: 'collect', item: 'bandit_ledger', count: 1, consume: true, text: "Take Varrick's Ledger" }
        ],
        complete: 'Aldric turns the ledger\'s pages. His face does not change, but his knuckles whiten. "Lord Corvane. Of course. He has been buying the Oakvale Seal one broken clue at a time. This ends now." He nods to you. "Take the cuirass. It served the royal guard once."',
        reward: { xp: 220, gold: 150, items: [['crimson_cuirass', 1]], rep: { the_crown: 12, merchants_guild: 8 } }
    },
    m4: {
        id: 'm4', type: 'main', title: 'The Oakvale Seal', giver: 'aldric', turnIn: 'aldric', requires: ['m3'], minLevel: 5,
        summary: 'Descend into the Barrow Crypt and take the Oakvale Seal from the Barrow Knight.',
        offer: '"Corvane\'s men were looking for the seal beneath Oakvale. It lies in the barrow crypt, guarded by the last knight of the lords of Oakvale, long dead and long angry. Break his vigil, and bring the seal to me. And adventurer... I should warn you. It is not a trinket."',
        objectives: [
            { type: 'kill', target: 'barrow_knight', count: 1, text: 'Defeat the Barrow Knight' },
            { type: 'collect', item: 'oakvale_seal', count: 1, text: 'Take the Oakvale Seal' }
        ],
        complete: 'The seal sits on Aldric\'s desk, humming softly. For a long moment, nobody speaks. "You have done what armies could not," Aldric says quietly. "Now there is a choice to make, and I will not make it for you."',
        reward: { xp: 320, gold: 200, items: [['greater_healing_potion', 2]], rep: { the_crown: 10 } }
    },
    m5: {
        id: 'm5', type: 'main', title: "The Seal's Fate", giver: 'aldric', turnIn: 'aldric', requires: ['m4'], minLevel: 5,
        summary: 'Decide what becomes of the Oakvale Seal.',
        offer: '"The seal is yours to carry for now," Aldric says. "But it cannot stay in the world as it is. The Crown wants it, the Guild would pay a king\'s ransom, and the people would rather no one had it. Decide what it will be, and bring me your answer."',
        objectives: [{ type: 'collect', item: 'oakvale_seal', count: 1, text: 'Carry the seal to Aldric and decide its fate' }],
        complete: 'Aldric looks at you. "The kingdom holds its breath. Choose, and be ready to live with it."',
        choices: [
            {
                id: 'crown', label: 'Give the seal to the Crown', ending: 'crown', consume: true,
                text: 'You set the seal in Aldric\'s palm. The regency tightens its grip, the northern lords bend the knee, and for a time the realm is quiet.',
                reward: { xp: 400, gold: 300, items: [['crown_signet', 1]], rep: { the_crown: 30, common_folk: -10 } }
            },
            {
                id: 'guild', label: 'Sell it to Silas and the Guild', ending: 'guild', consume: true,
                text: 'Silas\'s eyes gleam like coins. The Guild pays a fortune and sends the seal to a vault no one will ever find.',
                reward: { xp: 400, gold: 800, rep: { merchants_guild: 30, the_crown: -15 } }
            },
            {
                id: 'people', label: 'Destroy it so no one can rule by it', ending: 'people', consume: true,
                text: 'You crush the seal beneath Harlan\'s hammer. A last sigh of power drifts up through the smoke. Nobody will ever claim the north by it again.',
                reward: { xp: 400, gold: 150, items: [['greater_healing_potion', 2]], rep: { common_folk: 35, the_crown: -15, merchants_guild: -8 } }
            },
            {
                id: 'share', label: 'Persuade Aldric to share the seal\'s power with the people', ending: 'balance', requires: { stat: 'cha', min: 13 }, consume: true,
                text: 'Aldric listens. For a long time he says nothing, then he nods. "A council, then. Crown, Guild and commons together." It is a fragile peace, but a true one.',
                reward: { xp: 450, gold: 300, items: [['crown_signet', 1]], rep: { the_crown: 15, merchants_guild: 15, common_folk: 15 } }
            }
        ],
        reward: {}
    }
};

DATA.ENDINGS = {
    crown: { title: 'The Regent\'s Peace', text: 'The seal is locked in the royal vault, and the northern lords kneel one by one. Order returns to the realm, though whispers say freedom paid for it. Bards will sing of you, softly, when the guards are not listening.' },
    guild: { title: 'A Fortune in Silver', text: 'The Guild pays more than you could spend in a lifetime, and the seal vanishes into a vault no one has ever found. Roads are safer, markets are richer, and not a single noble house dares to cross you.' },
    people: { title: 'The Hammer and the Seal', text: 'The seal is dust, and with it the claim of every would-be lord of the north. The common folk raise a toast in the Serpent\'s Cup. Harlan hangs a bent bronze shard above his forge and refuses to say why.' },
    balance: { title: 'The Three Seats', text: 'A council of Crown, Guild and commons rules from the palace. It is quarrelsome, slow and entirely unprecedented. Historians will argue over your choice for centuries, which is as good as a legacy gets.' }
};

/* ---------------------------------------------------------------------------
   Achievements
   --------------------------------------------------------------------------- */

DATA.achievements = {
    first_blood: { name: 'First Blood', icon: '🩸', text: 'Win your first fight.' },
    slayer: { name: 'Monster Slayer', icon: '💀', text: 'Defeat 25 enemies.' },
    rich: { name: 'Dragon\'s Hoard', icon: '💰', text: 'Hold 500 gold at once.' },
    veteran: { name: 'Seasoned', icon: '⭐', text: 'Reach level 5.' },
    quester: { name: 'Oathkeeper', icon: '📜', text: 'Complete 5 quests.' },
    crafter: { name: 'Journeyman', icon: '🔨', text: 'Craft an item.' },
    explorer: { name: 'Cartographer', icon: '🧭', text: 'Visit every location.' },
    hero: { name: 'Hero of Aethelgard', icon: '🏆', text: 'Finish the main story.' }
};

/* ---------------------------------------------------------------------------
   Story text
   --------------------------------------------------------------------------- */

DATA.prologue = [
    'Autumn comes early to the kingdom of Aethelgard. The old king is dead, his heir is a child of nine, and the regency that rules in his name has never been so afraid of its own shadow.',
    'Three nights ago, a courier in royal crimson found you in a roadside tavern and pressed a sealed letter into your hand. It said only: "The Crown has need of someone it cannot own. Come to the palace."',
    'Now the gates of the capital rise before you, golden in the morning light. Somewhere inside waits a chancellor with a secret, and beyond the walls a seal that two kingdoms would kill for.'
];

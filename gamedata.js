// gamedata.js güncellemesi - Crafting tarifleri eklendi
// =================================================================================
// OYUN VERİLERİ - Medieval Quest RPG v5.0: The Age of Kings
// =================================================================================

// PROLOGUE - Geliştirilmiş
const prologue = {
    title: "Küllerin Arasından",
    scenes: [
        {
            text: "Her şey sakin bir sonbahar akşamında başladı. Ocağın sıcaklığında dinlenirken, dışarıdan gelen çığlıklarla irkildin.",
            background: "🔥",
            choices: [
                { text: "Hemen dışarı çık", nextScene: 1, karma: 5 },
                { text: "Önce silahını al", nextScene: 1, karma: 0 },
                { text: "Pencereden göz at", nextScene: 1, karma: -2 }
            ]
        },
        // Diğer sahneler...
    ]
};

// Yeni Irklar
const races = {
    dark_elf: {
        id: "dark_elf",
        name: "Kara Elf",
        icon: "🧝‍♂️",
        description: "Yeraltı dünyasından gelen gizemli ve güçlü bir ırk",
        bonuses: ["+3 Zeka", "+2 Çeviklik", "Karanlıkta Görüş"],
        statBonuses: { int: 3, dex: 2, cha: -2 },
        traits: ['dark_vision', 'shadow_affinity']
    }
};

// Yeni Sınıflar
const characterClasses = {
    paladin: {
        id: "paladin",
        name: "Paladin",
        icon: "⚜️",
        description: "Kutsal güçlerle donanmış, adaletin savunucusu",
        startingStats: { str: 14, dex: 10, end: 14, int: 10, wis: 14, cha: 12 },
        startingSkills: { sword: 10, heavy_armor: 10, healing: 8 },
        startingEquipment: ['blessed_sword', 'chainmail_armor', 'holy_symbol']
    },
    assassin: {
        id: "assassin",
        name: "Suikastçı",
        icon: "🗡️",
        description: "Gölgelerde hareket eden, ölümcül darbeleriyle ünlü",
        startingStats: { str: 12, dex: 16, end: 10, int: 12, wis: 10, cha: 8 },
        startingSkills: { dagger: 12, stealth: 14, poison: 8 },
        startingEquipment: ['poison_dagger', 'shadow_cloak', 'lockpicks']
    }
};

// Yeni Geçmişler
const backgrounds = {
    soldier: {
        id: "soldier",
        name: "Eski Asker",
        icon: "🪖",
        description: "Krallık ordusunda hizmet verdiniz, askeri taktikler ve silah kullanımında ustasınız.",
        statBonuses: { str: 3, end: 2 },
        skillBonuses: { tactics: 10, leadership: 8 },
        startingEquipment: ['veteran_sword', 'soldier_uniform'],
        startingGold: 75
    }
};

// Yeni Lokasyonlar (haritaya göre)
const locations = {
    aethelgard_capital: {
        id: 'aethelgard_capital',
        name: 'Aethelgard Başkenti',
        description: 'Krallığın kalbi. Devasa kale, görkemli katedral ve hareketli pazar yerleriyle dolu.',
        image: '🏰',
        type: 'city',
        faction: 'the_crown',
        actions: ['visit_royal_palace', 'explore_city_districts', 'meet_faction_leaders', 'trade_in_market'],
        connectedLocations: ['aethelgard_gate', 'grand_forge', 'serpent_river_port']
    },
    serpent_river_port: {
        id: 'serpent_river_port',
        name: 'Yılan Nehri Limanı',
        description: 'Nehir ticaretinin merkezi. Gemiler krallığın dört bir yanına mal taşıyor.',
        image: '⛵',
        type: 'port',
        faction: 'merchants_guild',
        actions: ['book_passage', 'trade_with_merchants', 'gather_rumors', 'meet_smugglers'],
        connectedLocations: ['aethelgard_capital', 'port_valoria']
    },
    dragon_peak_fortress: {
        id: 'dragon_peak_fortress',
        name: 'Ejderha Zirvesi Kalesi',
        description: 'Sarp dağların tepesinde stratejik bir kale. Kim kontrol ederse bölgeye hükmeder.',
        image: '🏔️',
        type: 'fortress',
        faction: 'neutral',
        actions: ['siege_fortress', 'negotiate_surrender', 'infiltrate_fortress'],
        connectedLocations: ['frostfang_peaks_base'],
        canBeConquered: true
    },
    oakvale_rebuilt: {
        id: 'oakvale_rebuilt',
        name: 'Yeniden İnşa Edilen Meşevadisi',
        description: 'Eski harabeden yeniden doğan bir köy. Geliştirilmeyi bekliyor.',
        image: '🏡',
        type: 'village',
        faction: 'player',
        actions: ['manage_settlement', 'build_structures', 'recruit_settlers', 'defend_village', 'combat_test', 'trade_in_market'],
        connectedLocations: ['whispering_woods_deep'],
        isSettlement: true,
        developmentLevel: 1
    }
};

// Yeni Faksiyonlar
const factions = {
    the_crown: {
        id: 'the_crown',
        name: 'Kraliyet Tahtı',
        leader: 'Kral Alistair',
        description: 'Aethelgard Krallığının yasal yöneticileri. Geleneksel ve istikrarlı bir yönetim.',
        headquarters: 'aethelgard_capital',
        color: '#d4af37',
        relations: { merchants_guild: 50, common_people: 30, freedom_fighters: -70 }
    },
    freedom_fighters: {
        id: 'freedom_fighters',
        name: 'Özgürlük Savaşçıları',
        leader: 'Kael',
        description: 'Kraliyetin baskıcı yönetimine karşı savaşan isyancı grup.',
        headquarters: 'hidden_camp',
        color: '#c41e3a',
        relations: { the_crown: -70, common_people: 60, merchants_guild: 20 }
    },
    merchants_guild: {
        id: 'merchants_guild',
        name: 'Tüccarlar Loncası',
        leader: 'Elara',
        description: 'Krallığın ekonomisini kontrol eden güçlü tüccar birliği.',
        headquarters: 'serpent_river_port',
        color: '#009688',
        relations: { the_crown: 50, freedom_fighters: 20, common_people: 40 }
    },
    common_people: {
        id: 'common_people',
        name: 'Halk',
        leader: 'Yok (Halkın Sesi)',
        description: 'Krallığın sıradan insanları. Onların desteği uzun vadeli başarı için kritik.',
        headquarters: 'various',
        color: '#795548',
        relations: { the_crown: 30, freedom_fighters: 60, merchants_guild: 40 }
    }
};

// Görevler
const quests = {
    moral_decision_1: {
        id: 'moral_decision_1',
        title: 'Zorlu Seçim: Köylüler veya Askerler',
        description: 'Bir köy isyancıları sakladığı için Kraliyet askerleri tarafından kuşatıldı. Askerler köyü yakmakla tehdit ediyor.',
        type: 'moral_decision',
        location: 'besieged_village',
        decisions: [
            {
                text: "Köylüleri koru - Askerlere karşı savaş",
                outcome: { karma: 20, reputation: { the_crown: -30, common_people: 40, freedom_fighters: 20 }, nextQuest: 'rebel_support' }
            },
            {
                text: "Askerlere yardım et - Köyü ara",
                outcome: { karma: -15, reputation: { the_crown: 30, common_people: -20, freedom_fighters: -40 }, nextQuest: 'royal_favor' }
            },
            {
                text: "Aracı ol - Barışçıl bir çözüm bul",
                outcome: { karma: 10, reputation: { the_crown: 10, common_people: 20, freedom_fighters: 10 }, nextQuest: 'diplomatic_solution', requirement: { skill: 'persuasion', level: 15 } }
            }
        ],
        rewards: { xp: 300 }
    },
    fortress_conquest: {
        id: 'fortress_conquest',
        title: 'Ejderha Zirvesi Kalesini Fethet',
        description: 'Stratejik öneme sahip bu kaleyi kontrol etmek, bölgedeki güç dengesini değiştirecek.',
        type: 'conquest',
        location: 'dragon_peak_fortress',
        objectives: [
            { id: 'gather_intel', description: 'Kale hakkında bilgi topla', required: 1, current: 0, completed: false },
            { id: 'secure_allies', description: 'Saldırı için müttefik bul', required: 1, current: 0, completed: false },
            { id: 'lead_assault', description: 'Kaleye saldırıyı yönet', required: 1, current: 0, completed: false }
        ],
        conquestMethods: [
            { type: 'direct_assault', description: 'Doğrudan saldırı', difficulty: 'hard' },
            { type: 'infiltration', description: 'Sızarak kapıları aç', difficulty: 'medium', requirement: { skill: 'stealth', level: 20 } },
            { type: 'siege', description: 'Kuşatma', difficulty: 'medium', timeRequired: 7 },
            { type: 'diplomacy', description: 'Teslim olmaları için ikna et', difficulty: 'hard', requirement: { skill: 'persuasion', level: 25 } }
        ],
        rewards: { xp: 1000, gold: 500, reputation: { the_crown: -50, freedom_fighters: 50 }, settlement: 'dragon_peak_fortress' },
        onComplete: (method) => {
            const character = getCurrentCharacter();
            if (character) {
                character.ownedSettlements.push('dragon_peak_fortress');
                showToast(`Ejderha Zirvesi Kalesi ${method} yöntemiyle fethedildi!`, "success");
            }
        }
    }
};

// Eşyalar (YENİ Üretim Materyalleri ve Üretilebilir Eşyalar eklendi)
const items = {
    // Materyaller
    iron_ore: { id: 'iron_ore', name: 'Demir Cevheri', type: 'material', value: 5 },
    wood_log: { id: 'wood_log', name: 'Kütük', type: 'material', value: 2 },
    leather_strips: { id: 'leather_strips', name: 'Deri Şerit', type: 'material', value: 4 },
    healing_herb: { id: 'healing_herb', name: 'İyileştirici Bitki', type: 'material', value: 10 },
    empty_vial: { id: 'empty_vial', name: 'Boş Şişe', type: 'material', value: 1 },

    // Üretilebilir Eşyalar
    iron_sword: { id: 'iron_sword', name: 'Demir Kılıç', type: 'weapon', slot: 'weapon', damage: 8, value: 50 },
    healing_potion: { id: 'healing_potion', name: 'İyileştirme İksiri', type: 'consumable', effect: { type: 'heal', amount: 50 }, value: 25 },
    leather_armor: { id: 'leather_armor', name: 'Deri Zırh', type: 'armor', slot: 'chest', defense: 10, value: 70 },

    // Diğer
    ancient_relic: { id: 'ancient_relic', name: 'Antik Kalıntı', type: 'quest', value: 0 }
};

// YENİ: Üretim Tarifleri
const craftingRecipes = {
    'iron_sword': {
        name: 'Demir Kılıç',
        result: 'iron_sword',
        materials: { iron_ore: 5, wood_log: 1, leather_strips: 2 },
        skill: 'blacksmithing',
        level: 1
    },
    'healing_potion': {
        name: 'İyileştirme İksiri',
        result: 'healing_potion',
        materials: { healing_herb: 3, empty_vial: 1 },
        skill: 'alchemy',
        level: 1
    },
    'leather_armor': {
        name: 'Deri Zırh',
        result: 'leather_armor',
        materials: { leather_strips: 10 },
        skill: 'leatherworking',
        level: 1
    }
};
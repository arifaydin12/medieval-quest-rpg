// =================================================================================
// GELİŞMİŞ SİSTEMLER - Medieval Quest RPG v3.0
// =================================================================================

// 1. GELİŞMİŞ GÖREV SİSTEMİ
class QuestSystem {
    constructor() {
        this.quests = {};
        this.activeQuests = [];
        this.completedQuests = [];
        this.failedQuests = [];
    }

    // Yeni görev ekle
    addQuest(questId, questData) {
        this.quests[questId] = {
            ...questData,
            id: questId,
            started: false,
            completed: false,
            failed: false,
            currentStep: 0,
            objectives: questData.objectives || [],
            rewards: questData.rewards || {},
            conditions: questData.conditions || {}
        };
    }

    // Görev başlat
    startQuest(questId) {
        const quest = this.quests[questId];
        if (!quest || quest.started) return false;

        quest.started = true;
        quest.startTime = Date.now();
        this.activeQuests.push(quest);

        // Görev başlangıç olayları
        if (quest.onStart) quest.onStart();
        
        this.showQuestUpdate(quest, "Yeni görev başladı!");
        return true;
    }

    // Görev güncelle
    updateQuestObjective(questId, objectiveIndex, progress = 1) {
        const quest = this.getQuest(questId);
        if (!quest || !quest.started || quest.completed) return false;

        const objective = quest.objectives[objectiveIndex];
        if (!objective) return false;

        objective.current = (objective.current || 0) + progress;
        objective.current = Math.min(objective.current, objective.required);

        // Hedef tamamlandı mı?
        if (objective.current >= objective.required) {
            objective.completed = true;
            this.checkQuestCompletion(questId);
        }

        this.showQuestUpdate(quest, "Görev ilerlemesi güncellendi!");
        return true;
    }

    // Görev tamamlama kontrolü
    checkQuestCompletion(questId) {
        const quest = this.getQuest(questId);
        if (!quest || quest.completed) return false;

        const allCompleted = quest.objectives.every(obj => obj.completed);
        if (allCompleted) {
            this.completeQuest(questId);
        }
    }

    // Görev tamamla
    completeQuest(questId) {
        const quest = this.getQuest(questId);
        if (!quest || quest.completed) return false;

        quest.completed = true;
        quest.completionTime = Date.now();
        
        // Aktif görevlerden kaldır
        this.activeQuests = this.activeQuests.filter(q => q.id !== questId);
        this.completedQuests.push(quest);

        // Ödülleri ver
        this.giveQuestRewards(quest);

        // Sonraki görevleri kontrol et
        if (quest.nextQuest) {
            setTimeout(() => this.startQuest(quest.nextQuest), 2000);
        }

        this.showQuestUpdate(quest, "Görev tamamlandı!");
        return true;
    }

    // Ödülleri verme
    giveQuestRewards(quest) {
        const character = masterState.gameSlots[masterState.activeSlotIndex].character;
        
        if (quest.rewards.xp) {
            addXp(quest.rewards.xp);
        }
        
        if (quest.rewards.gold) {
            character.gold += quest.rewards.gold;
            showToast(`${quest.rewards.gold} altın kazandınız!`, "success");
        }
        
        if (quest.rewards.items) {
            quest.rewards.items.forEach(itemId => {
                character.inventory.push({...items[itemId]});
                showToast(`${items[itemId].name} kazandınız!`, "success");
            });
        }
        
        if (quest.rewards.reputation) {
            Object.entries(quest.rewards.reputation).forEach(([faction, amount]) => {
                changeReputation(faction, amount);
            });
        }
    }

    // Görev güncellemesini göster
    showQuestUpdate(quest, message) {
        const notification = {
            type: 'quest',
            title: quest.title,
            message: message,
            questId: quest.id
        };
        
        showGameNotification(notification);
    }

    getQuest(questId) {
        return this.quests[questId];
    }
}

// 2. GELİŞMİŞ KARAKTER SİSTEMİ
class AdvancedCharacterSystem {
    constructor() {
        this.races = {};
        this.backgrounds = {};
        this.skillTrees = {};
    }

    // Irk tanımları
    defineRace(raceId, raceData) {
        this.races[raceId] = raceData;
    }

    // Geçmiş tanımları
    defineBackground(backgroundId, backgroundData) {
        this.backgrounds[backgroundId] = backgroundData;
    }

    // Beceri ağacı tanımla
    defineSkillTree(treeId, treeData) {
        this.skillTrees[treeId] = treeData;
    }

    // Karakter oluştur
    createCharacter(data) {
        const race = this.races[data.race];
        const background = this.backgrounds[data.background];
        const characterClass = characterClasses[data.class];

        let character = {
            // Temel bilgiler
            id: Date.now(),
            name: data.name,
            race: data.race,
            class: data.class,
            background: data.background,
            
            // Seviye ve ilerleme
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            gold: data.startingGold || 50,
            
            // Temel statlar (ırk ve sınıf bonusları uygulanmış)
            stats: this.calculateBaseStats(race, characterClass, background),
            
            // Gelişmiş sistemler
            skills: this.initializeSkills(characterClass, background),
            perks: [],
            reputation: this.initializeReputation(),
            relationships: {},
            
            // Hayatta kalma
            hunger: 0,
            thirst: 0,
            fatigue: 0,
            diseases: [],
            injuries: [],
            
            // Envanter
            inventory: [],
            equipment: {
                weapon: null,
                offhand: null,
                head: null,
                chest: null,
                hands: null,
                legs: null,
                feet: null,
                accessory1: null,
                accessory2: null
            },
            
            // Görevler ve hikaye
            activeQuests: [],
            completedQuests: [],
            storyFlags: {},
            
            // Meta veriler
            creationTime: Date.now(),
            playTime: 0,
            deathCount: 0
        };

        // Başlangıç ekipmanları
        this.applyStartingGear(character, characterClass, background);
        
        return character;
    }

    calculateBaseStats(race, characterClass, background) {
        let baseStats = { str: 10, dex: 10, end: 10, int: 10, wis: 10, cha: 10 };
        
        // Irk bonusları
        if (race.statBonuses) {
            Object.entries(race.statBonuses).forEach(([stat, bonus]) => {
                baseStats[stat] += bonus;
            });
        }
        
        // Sınıf bonusları
        if (characterClass.startingStats) {
            Object.entries(characterClass.startingStats).forEach(([stat, value]) => {
                baseStats[stat] = value;
            });
        }
        
        // Geçmiş bonusları
        if (background.statBonuses) {
            Object.entries(background.statBonuses).forEach(([stat, bonus]) => {
                baseStats[stat] += bonus;
            });
        }
        
        // Can ve diğer türetilmiş statlar
        baseStats.maxHealth = baseStats.end * 10 + baseStats.str * 2;
        baseStats.health = baseStats.maxHealth;
        baseStats.maxStamina = baseStats.end * 5 + baseStats.dex * 2;
        baseStats.stamina = baseStats.maxStamina;
        baseStats.maxMana = baseStats.int * 8 + baseStats.wis * 4;
        baseStats.mana = baseStats.maxMana;
        
        return baseStats;
    }

    initializeSkills(characterClass, background) {
        let skills = {};
        
        // Sınıf becerileri
        if (characterClass.startingSkills) {
            Object.entries(characterClass.startingSkills).forEach(([skill, level]) => {
                skills[skill] = level;
            });
        }
        
        // Geçmiş becerileri
        if (background.skillBonuses) {
            Object.entries(background.skillBonuses).forEach(([skill, bonus]) => {
                skills[skill] = (skills[skill] || 0) + bonus;
            });
        }
        
        return skills;
    }

    initializeReputation() {
        return {
            the_crown: 0,
            silver_hand: 0,
            sunstone_rebellion: 0,
            common_people: 0,
            merchants_guild: 0,
            mages_circle: 0,
            thieves_guild: 0
        };
    }

    applyStartingGear(character, characterClass, background) {
        // Sınıf başlangıç ekipmanları
        if (characterClass.startingEquipment) {
            characterClass.startingEquipment.forEach(itemId => {
                const item = {...items[itemId]};
                if (item.type === 'equipment') {
                    this.equipItem(character, item);
                } else {
                    character.inventory.push(item);
                }
            });
        }
        
        // Geçmiş ekipmanları
        if (background.startingEquipment) {
            background.startingEquipment.forEach(itemId => {
                character.inventory.push({...items[itemId]});
            });
        }
    }

    equipItem(character, item) {
        if (!item.slot) return false;
        
        // Mevcut ekipmanı çıkar
        if (character.equipment[item.slot]) {
            this.unequipItem(character, item.slot);
        }
        
        character.equipment[item.slot] = item;
        this.updateCharacterStats(character);
        
        return true;
    }

    unequipItem(character, slot) {
        const item = character.equipment[slot];
        if (!item) return false;
        
        character.inventory.push(item);
        character.equipment[slot] = null;
        this.updateCharacterStats(character);
        
        return true;
    }

    updateCharacterStats(character) {
        // Temel statları sıfırla
        let finalStats = {...character.stats};
        
        // Ekipman bonusları
        Object.values(character.equipment).forEach(item => {
            if (item && item.statBonuses) {
                Object.entries(item.statBonuses).forEach(([stat, bonus]) => {
                    finalStats[stat] += bonus;
                });
            }
        });
        
        // Beceri bonusları
        Object.entries(character.skills).forEach(([skill, level]) => {
            const skillBonus = this.calculateSkillBonus(skill, level);
            if (skillBonus) {
                Object.entries(skillBonus).forEach(([stat, bonus]) => {
                    finalStats[stat] += bonus;
                });
            }
        });
        
        character.finalStats = finalStats;
    }

    calculateSkillBonus(skill, level) {
        // Beceri seviyelerine göre stat bonusları
        const bonuses = {
            sword: { str: level * 0.1, dex: level * 0.05 },
            bow: { dex: level * 0.1 },
            // Diğer beceriler...
        };
        
        return bonuses[skill] || {};
    }
}

// 3. GERÇEKÇİ EKONOMİ SİSTEMİ
class EconomySystem {
    constructor() {
        this.markets = {};
        this.priceMultipliers = {};
        this.tradeRoutes = [];
    }

    // Piyasa oluştur
    createMarket(marketId, locationId, basePrices) {
        this.markets[marketId] = {
            id: marketId,
            locationId: locationId,
            basePrices: basePrices,
            currentPrices: {...basePrices},
            supply: {},
            demand: {},
            lastUpdate: Date.now()
        };
    }

    // Fiyat güncelle
    updateMarketPrices(marketId) {
        const market = this.markets[marketId];
        if (!market) return;

        const timePassed = Date.now() - market.lastUpdate;
        const hoursPassed = timePassed / (1000 * 60 * 60);

        // Arz-talep etkisi
        Object.keys(market.basePrices).forEach(itemId => {
            const basePrice = market.basePrices[itemId];
            const supply = market.supply[itemId] || 1;
            const demand = market.demand[itemId] || 1;
            
            // Arz-talek dengesine göre fiyat ayarla
            let priceMultiplier = demand / supply;
            priceMultiplier = Math.max(0.5, Math.min(2.0, priceMultiplier));
            
            // Rastgele dalgalanma
            const fluctuation = 0.9 + Math.random() * 0.2;
            
            market.currentPrices[itemId] = Math.round(basePrice * priceMultiplier * fluctuation);
        });

        market.lastUpdate = Date.now();
    }

    // Eşya satın al
    buyItem(marketId, itemId, quantity, buyer) {
        const market = this.markets[marketId];
        if (!market || !market.currentPrices[itemId]) return false;

        const price = market.currentPrices[itemId] * quantity;
        if (buyer.gold < price) return false;

        buyer.gold -= price;
        
        // Eşyayı envantere ekle
        const item = {...items[itemId]};
        item.quantity = quantity;
        buyer.inventory.push(item);

        // Arz-talep etkisi
        market.demand[itemId] = (market.demand[itemId] || 1) + quantity * 0.1;
        
        this.updateMarketPrices(marketId);
        return true;
    }

    // Eşya sat
    sellItem(marketId, itemId, quantity, seller) {
        const market = this.markets[marketId];
        if (!market || !market.currentPrices[itemId]) return false;

        // Eşya envanterde var mı?
        const itemIndex = seller.inventory.findIndex(item => item.id === itemId);
        if (itemIndex === -1 || seller.inventory[itemIndex].quantity < quantity) return false;

        const price = Math.round(market.currentPrices[itemId] * quantity * 0.8); // %80 fiyatına sat
        seller.gold += price;

        // Eşyayı envanterden çıkar
        seller.inventory[itemIndex].quantity -= quantity;
        if (seller.inventory[itemIndex].quantity <= 0) {
            seller.inventory.splice(itemIndex, 1);
        }

        // Arz-talep etkisi
        market.supply[itemId] = (market.supply[itemId] || 1) + quantity * 0.1;
        
        this.updateMarketPrices(marketId);
        return true;
    }
}

// 4. GELİŞMİŞ SAVAŞ SİSTEMİ
class AdvancedCombatSystem {
    constructor() {
        this.bodyParts = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    }

    // Savaş başlat
    startCombat(attacker, defender, environment = {}) {
        const combatLog = [];
        
        // Savaş turu başlangıcı
        combatLog.push(`${attacker.name}, ${defender.name} ile savaşa girdi!`);
        
        // Çevresel faktörler
        if (environment.weather) {
            combatLog.push(this.getWeatherEffect(environment.weather));
        }
        
        if (environment.terrain) {
            combatLog.push(this.getTerrainEffect(environment.terrain));
        }
        
        // Sıra tabanlı savaş
        let round = 1;
        while (attacker.stats.health > 0 && defender.stats.health > 0 && round <= 20) {
            combatLog.push(`--- Tur ${round} ---`);
            
            // Saldırı sırası
            const attackResult = this.performAttack(attacker, defender, environment);
            combatLog.push(attackResult.message);
            
            if (defender.stats.health <= 0) {
                combatLog.push(`${defender.name} yenildi!`);
                break;
            }
            
            // Karşı saldırı
            const counterResult = this.performAttack(defender, attacker, environment);
            combatLog.push(counterResult.message);
            
            if (attacker.stats.health <= 0) {
                combatLog.push(`${attacker.name} yenildi!`);
                break;
            }
            
            round++;
        }
        
        return {
            winner: attacker.stats.health > 0 ? attacker : defender,
            loser: attacker.stats.health > 0 ? defender : attacker,
            log: combatLog,
            rounds: round
        };
    }

    // Saldırı gerçekleştir
    performAttack(attacker, defender, environment) {
        // Hedef vücut bölgesi seç
        const targetBodyPart = this.selectTargetBodyPart(attacker, defender);
        
        // İsabet şansı hesapla
        const hitChance = this.calculateHitChance(attacker, defender, targetBodyPart, environment);
        const hitRoll = Math.random() * 100;
        
        if (hitRoll > hitChance) {
            return {
                success: false,
                message: `${attacker.name} saldırısı ıskaladı!`,
                damage: 0
            };
        }
        
        // Hasar hesapla
        const damage = this.calculateDamage(attacker, defender, targetBodyPart);
        
        // Kritik vuruş kontrolü
        const isCritical = this.checkCriticalHit(attacker, defender);
        const finalDamage = isCritical ? Math.floor(damage * 1.5) : damage;
        
        // Hasar uygula
        defender.stats.health = Math.max(0, defender.stats.health - finalDamage);
        
        // Ek etkiler (kanama, sersemletme, vb.)
        const additionalEffects = this.applyAdditionalEffects(attacker, defender, targetBodyPart, finalDamage);
        
        let message = `${attacker.name}, ${defender.name}'ın ${this.getBodyPartName(targetBodyPart)} bölgesine `;
        message += isCritical ? `KRİTİK vuruş yaptı (${finalDamage} hasar)!` : `vurdu (${finalDamage} hasar).`;
        
        if (additionalEffects) {
            message += ` ${additionalEffects}`;
        }
        
        return {
            success: true,
            message: message,
            damage: finalDamage,
            critical: isCritical,
            bodyPart: targetBodyPart,
            effects: additionalEffects
        };
    }

    // Vücut bölgesi seç
    selectTargetBodyPart(attacker, defender) {
        const skills = attacker.skills || {};
        const aimingSkill = skills.aiming || 0;
        
        // Beceriye göre hedefleme doğruluğu
        const aimBonus = Math.min(50, aimingSkill / 2);
        const randomRoll = Math.random() * 100;
        
        if (randomRoll < 10 + aimBonus) {
            return 'head'; // Kafa hedefleme
        } else if (randomRoll < 30 + aimBonus) {
            return Math.random() < 0.5 ? 'leftArm' : 'rightArm'; // Kollar
        } else if (randomRoll < 60 + aimBonus) {
            return 'torso'; // Gövde
        } else {
            return Math.random() < 0.5 ? 'leftLeg' : 'rightLeg'; // Bacaklar
        }
    }

    // İsabet şansı hesapla
    calculateHitChance(attacker, defender, targetBodyPart, environment) {
        let baseChance = 80; // Temel isabet şansı
        
        // Saldıranın çevikliği
        baseChance += (attacker.stats.dex - 10) * 2;
        
        // Savunanın çevikliği
        baseChance -= (defender.stats.dex - 10) * 1.5;
        
        // Hedef bölgesi zorluğu
        const bodyPartModifiers = {
            head: -20,
            torso: 0,
            leftArm: -5,
            rightArm: -5,
            leftLeg: -10,
            rightLeg: -10
        };
        baseChance += bodyPartModifiers[targetBodyPart] || 0;
        
        // Çevresel faktörler
        if (environment.visibility === 'poor') baseChance -= 15;
        if (environment.weather === 'rain') baseChance -= 10;
        if (environment.terrain === 'difficult') baseChance -= 5;
        
        return Math.max(10, Math.min(95, baseChance));
    }

    // Hasar hesapla
    calculateDamage(attacker, defender, targetBodyPart) {
        let baseDamage = attacker.stats.str * 0.5;
        
        // Silah hasarı
        if (attacker.equipment.weapon) {
            baseDamage += attacker.equipment.weapon.damage || 0;
        }
        
        // Beceri bonusları
        const weaponSkill = attacker.skills[attacker.equipment.weapon?.skill] || 0;
        baseDamage += weaponSkill * 0.1;
        
        // Savunma azaltması
        const defense = this.calculateDefense(defender, targetBodyPart);
        baseDamage = Math.max(1, baseDamage - defense);
        
        // Vücut bölgesi çarpanları
        const bodyPartMultipliers = {
            head: 1.5,
            torso: 1.0,
            leftArm: 0.7,
            rightArm: 0.7,
            leftLeg: 0.8,
            rightLeg: 0.8
        };
        baseDamage *= bodyPartMultipliers[targetBodyPart] || 1.0;
        
        return Math.floor(baseDamage);
    }

    // Savunma hesapla
    calculateDefense(defender, targetBodyPart) {
        let defense = 0;
        
        // Zırh savunması
        const armor = defender.equipment[this.getArmorSlotForBodyPart(targetBodyPart)];
        if (armor) {
            defense += armor.defense || 0;
        }
        
        // Beceri savunması
        const defenseSkill = defender.skills.defense || 0;
        defense += defenseSkill * 0.1;
        
        return defense;
    }

    // Kritik vuruş kontrolü
    checkCriticalHit(attacker, defender) {
        let critChance = 5; // Temel kritik şansı
        
        // Saldıranın şansı
        critChance += (attacker.stats.dex - 10) * 0.5;
        
        // Savunanın savunması
        critChance -= (defender.stats.dex - 10) * 0.3;
        
        return Math.random() * 100 < critChance;
    }

    // Ek etkiler uygula
    applyAdditionalEffects(attacker, defender, targetBodyPart, damage) {
        const effects = [];
        
        // Kanama efekti
        if (damage > 15 && Math.random() < 0.3) {
            effects.push('kanama');
            defender.conditions = defender.conditions || [];
            defender.conditions.push({
                type: 'bleeding',
                duration: 3,
                damagePerTurn: Math.floor(damage * 0.1)
            });
        }
        
        // Kırık efekti
        if (damage > 25 && targetBodyPart.includes('Arm') && Math.random() < 0.2) {
            effects.push('kırık');
            defender.conditions = defender.conditions || [];
            defender.conditions.push({
                type: 'fracture',
                duration: 5,
                statPenalty: { str: -2, dex: -3 }
            });
        }
        
        // Sersemletme efekti
        if (targetBodyPart === 'head' && damage > 10 && Math.random() < 0.4) {
            effects.push('sersemleme');
            defender.conditions = defender.conditions || [];
            defender.conditions.push({
                type: 'stun',
                duration: 1,
                canAct: false
            });
        }
        
        return effects.length > 0 ? `Etkiler: ${effects.join(', ')}` : null;
    }

    getBodyPartName(part) {
        const names = {
            head: 'kafa',
            torso: 'göğüs',
            leftArm: 'sol kol',
            rightArm: 'sağ kol',
            leftLeg: 'sol bacak',
            rightLeg: 'sağ bacak'
        };
        return names[part] || part;
    }

    getArmorSlotForBodyPart(part) {
        const mapping = {
            head: 'head',
            torso: 'chest',
            leftArm: 'hands',
            rightArm: 'hands',
            leftLeg: 'legs',
            rightLeg: 'legs'
        };
        return mapping[part] || 'chest';
    }

    getWeatherEffect(weather) {
        const effects = {
            rain: 'Yağmur görüşü azaltıyor ve kaygan zemin yaratıyor.',
            fog: 'Sis isabet şansını düşürüyor.',
            snow: 'Kar hareketi yavaşlatıyor.',
            clear: 'Açık hava savaş için ideal.'
        };
        return effects[weather] || '';
    }

    getTerrainEffect(terrain) {
        const effects = {
            forest: 'Ağaçlar savunma için doğal koruma sağlıyor.',
            mountain: 'Yüksek rakım dayanıklılık gerektiriyor.',
            swamp: 'Bataklık hareketi zorlaştırıyor.',
            plain: 'Açık arazi manevra avantajı sağlıyor.'
        };
        return effects[terrain] || '';
    }
}

// 5. DİNAMİK DÜNYA SİSTEMİ
class DynamicWorldSystem {
    constructor() {
        this.time = {
            day: 1,
            hour: 8,
            minute: 0,
            season: 'spring'
        };
        
        this.weather = 'clear';
        this.randomEvents = [];
        this.npcSchedules = {};
    }

    // Zamanı güncelle
    updateTime(minutesPassed) {
        this.time.minute += minutesPassed;
        
        while (this.time.minute >= 60) {
            this.time.minute -= 60;
            this.time.hour += 1;
            
            if (this.time.hour >= 24) {
                this.time.hour = 0;
                this.time.day += 1;
                
                // Mevsim değişikliği kontrolü
                if (this.time.day % 90 === 0) {
                    this.changeSeason();
                }
            }
        }
        
        // Hava durumu güncellemesi
        if (Math.random() < 0.01) { // %1 şans her güncellemede
            this.updateWeather();
        }
        
        // Rastgele olay kontrolü
        if (Math.random() < 0.005) { // %0.5 şans
            this.triggerRandomEvent();
        }
        
        // NPC rutinlerini güncelle
        this.updateNPCSchedules();
    }

    // Mevsim değiştir
    changeSeason() {
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const currentIndex = seasons.indexOf(this.time.season);
        this.time.season = seasons[(currentIndex + 1) % seasons.length];
        
        showGameNotification({
            type: 'world',
            title: 'Mevsim Değişimi',
            message: `${this.getSeasonName(this.time.season)} mevsimi başladı!`
        });
    }

    // Hava durumu güncelle
    updateWeather() {
        const weatherPatterns = {
            spring: ['clear', 'rain', 'clear', 'rain', 'fog'],
            summer: ['clear', 'clear', 'clear', 'rain', 'clear'],
            autumn: ['clear', 'rain', 'fog', 'clear', 'rain'],
            winter: ['clear', 'snow', 'snow', 'clear', 'blizzard']
        };
        
        const possibleWeather = weatherPatterns[this.time.season] || ['clear'];
        const newWeather = possibleWeather[Math.floor(Math.random() * possibleWeather.length)];
        
        if (newWeather !== this.weather) {
            this.weather = newWeather;
            
            showGameNotification({
                type: 'weather',
                title: 'Hava Durumu Değişimi',
                message: `Hava durumu: ${this.getWeatherName(this.weather)}`
            });
        }
    }

    // Rastgele olay tetikle
    triggerRandomEvent() {
        const events = [
            {
                type: 'traveling_merchant',
                title: 'Seyyar Tüccar',
                message: 'Bir seyyar tüccar kasabaya geldi. Nadir eşyalar satıyor olabilir!',
                action: () => this.spawnTravelingMerchant()
            },
            {
                type: 'bandit_attack',
                title: 'Haydut Saldırısı!',
                message: 'Haydutlar bölgeye saldırı düzenliyor! Savunmaya hazır olun.',
                action: () => this.triggerBanditAttack()
            },
            {
                type: 'festival',
                title: 'Yerel Festival',
                message: 'Kasabada bir festival düzenleniyor. Eğlence ve alışveriş fırsatları var!',
                action: () => this.startFestival()
            }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        event.action();
        
        showGameNotification({
            type: 'event',
            title: event.title,
            message: event.message
        });
    }

    // NPC rutinlerini güncelle
    updateNPCSchedules() {
        const currentHour = this.time.hour;
        
        Object.values(this.npcSchedules).forEach(npc => {
            const schedule = npc.schedule[currentHour];
            if (schedule && schedule.location !== npc.currentLocation) {
                npc.currentLocation = schedule.location;
                npc.currentAction = schedule.action;
                
                // NPC hareketini oyuncuya bildir (eğer aynı lokasyondaysa)
                if (masterState.currentLocation === npc.currentLocation) {
                    showToast(`${npc.name} ${schedule.location} geldi.`, 'info');
                }
            }
        });
    }

    getSeasonName(season) {
        const names = {
            spring: 'İlkbahar',
            summer: 'Yaz',
            autumn: 'Sonbahar',
            winter: 'Kış'
        };
        return names[season] || season;
    }

    getWeatherName(weather) {
        const names = {
            clear: 'Açık',
            rain: 'Yağmurlu',
            snow: 'Karlı',
            fog: 'Sisli',
            blizzard: 'Tipi'
        };
        return names[weather] || weather;
    }

    spawnTravelingMerchant() {
        // Seyyar tüccarı oluştur
        const merchant = {
            id: 'traveling_merchant',
            name: 'Seyyar Tüccar',
            type: 'merchant',
            location: 'town_square',
            inventory: this.generateMerchantInventory(),
            specialOffers: this.generateSpecialOffers()
        };
        
        // 6 saat sonra kaybolacak
        setTimeout(() => {
            if (merchant.location === masterState.currentLocation) {
                showToast('Seyyar tüccar kasabayı terk etti.', 'info');
            }
        }, 6 * 60 * 60 * 1000); // 6 saat
    }

    triggerBanditAttack() {
        // Haydut saldırısı senaryosu
        const banditAttack = {
            type: 'combat_event',
            enemies: this.generateBanditGroup(),
            location: 'forest_road',
            duration: 2, // saat
            reward: { gold: 100, reputation: { the_crown: 10 } }
        };
        
        // Oyuncu etkilenen bölgedeyse savaş başlat
        if (masterState.currentLocation === banditAttack.location) {
            startCombatEvent(banditAttack);
        }
    }

    startFestival() {
        // Festival etkinlikleri
        const festival = {
            type: 'festival',
            duration: 24, // saat
            effects: {
                prices: 0.8, // %20 indirim
                reputationGain: 1.5, // %50 daha fazla itibar
                specialQuests: true
            }
        };
        
        // Festival süresince geçerli olacak
        masterState.activeEvents.push(festival);
        
        setTimeout(() => {
            masterState.activeEvents = masterState.activeEvents.filter(e => e !== festival);
            showToast('Festival sona erdi.', 'info');
        }, festival.duration * 60 * 60 * 1000);
    }
}

// 6. GELİŞMİŞ AI SİSTEMİ
class AdvancedAISystem {
    constructor() {
        this.npcBehaviors = {};
        this.factionRelations = {};
        this.relationshipSystem = new RelationshipSystem();
    }

    // NPC davranışı tanımla
    defineNPCBehavior(npcId, behavior) {
        this.npcBehaviors[npcId] = behavior;
    }

    // NPC etkileşimi
    interactWithNPC(npcId, interactionType, player) {
        const npc = this.npcBehaviors[npcId];
        if (!npc) return null;

        const response = {
            success: false,
            message: '',
            options: [],
            consequences: {}
        };

        // NPC ruh hali ve ilişki seviyesi
        const relationship = this.relationshipSystem.getRelationship(npcId, player.id);
        const mood = this.calculateNPCMood(npc, relationship);

        // Etkileşim türüne göre yanıt
        switch (interactionType) {
            case 'greet':
                response.message = this.generateGreeting(npc, relationship, mood);
                response.options = this.generateGreetingOptions(npc, relationship);
                response.success = true;
                break;

            case 'trade':
                if (relationship.level >= npc.tradeThreshold) {
                    response.message = 'Alışveriş yapmak ister misin?';
                    response.options = ['Alışveriş yap', 'Vazgeç'];
                    response.success = true;
                } else {
                    response.message = 'Seninle alışveriş yapmak istemiyorum.';
                    response.success = false;
                }
                break;

            case 'quest':
                response.message = this.generateQuestOffer(npc, relationship);
                response.options = ['Görevi kabul et', 'Sonra sorarım'];
                response.success = true;
                break;

            default:
                response.message = 'Ne yapmak istiyorsun?';
                response.options = ['Konuş', 'Alışveriş', 'Görev sor'];
                response.success = true;
        }

        // İlişki etkisi
        if (response.success) {
            this.relationshipSystem.modifyRelationship(npcId, player.id, 1); // Küçük pozitif etki
        }

        return response;
    }

    // NPC ruh hali hesapla
    calculateNPCMood(npc, relationship) {
        let baseMood = 50; // Nötr ruh hali
        
        // İlişki seviyesi etkisi
        baseMood += relationship.level * 5;
        
        // Günün saati etkisi
        const hour = worldSystem.time.hour;
        if (hour >= 22 || hour <= 6) baseMood -= 10; // Gece saatleri
        
        // Hava durumu etkisi
        if (worldSystem.weather === 'rain') baseMood -= 5;
        if (worldSystem.weather === 'clear') baseMood += 5;
        
        return Math.max(0, Math.min(100, baseMood));
    }

    // Selamlama mesajı oluştur
    generateGreeting(npc, relationship, mood) {
        const greetings = {
            friendly: ['Merhaba dostum!', 'Hoş geldin!', 'Seni görmek güzel!'],
            neutral: ['Merhaba.', 'İyi günler.', 'Buyrun?'],
            unfriendly: ['Ne istiyorsun?', 'Rahatsız etme.', 'Git başımdan.']
        };

        let attitude = 'neutral';
        if (relationship.level >= 30) attitude = 'friendly';
        if (relationship.level <= -10) attitude = 'unfriendly';

        const possibleGreetings = greetings[attitude];
        return possibleGreetings[Math.floor(Math.random() * possibleGreetings.length)];
    }

    // Görev teklifi oluştur
    generateQuestOffer(npc, relationship) {
        if (relationship.level < 10) {
            return 'Senin için henüz bir işim yok. Belki sonra.';
        }

        const availableQuests = Object.values(questSystem.quests).filter(quest => 
            quest.giver === npc.id && 
            !quest.started && 
            relationship.level >= (quest.requiredReputation || 0)
        );

        if (availableQuests.length === 0) {
            return 'Şu anda yardıma ihtiyacım yok, teşekkürler.';
        }

        const quest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
        return quest.offerText || `Bir konuda yardımına ihtiyacım var. ${quest.title} görevini yapabilir misin?`;
    }
}

// İlişki Sistemi
class RelationshipSystem {
    constructor() {
        this.relationships = {}; // { [npcId_playerId]: { level: 0, points: 0, history: [] } }
    }

    getRelationship(npcId, playerId) {
        const key = `${npcId}_${playerId}`;
        if (!this.relationships[key]) {
            this.relationships[key] = {
                level: 0,
                points: 0,
                history: [],
                lastInteraction: Date.now()
            };
        }
        return this.relationships[key];
    }

    modifyRelationship(npcId, playerId, points) {
        const relationship = this.getRelationship(npcId, playerId);
        relationship.points += points;
        
        // Seviye güncellemesi
        const newLevel = Math.floor(relationship.points / 100);
        if (newLevel !== relationship.level) {
            relationship.level = newLevel;
            this.onRelationshipLevelChange(npcId, playerId, newLevel);
        }
        
        relationship.lastInteraction = Date.now();
        relationship.history.push({
            timestamp: Date.now(),
            change: points,
            reason: 'interaction'
        });
        
        // Tarihçeyi sınırla
        if (relationship.history.length > 50) {
            relationship.history = relationship.history.slice(-50);
        }
    }

    onRelationshipLevelChange(npcId, playerId, newLevel) {
        const npc = advancedAISystem.npcBehaviors[npcId];
        if (!npc) return;

        const levelNames = {
            '-3': 'Düşman',
            '-2': 'Düşmanca',
            '-1': 'Olumsuz',
            '0': 'Nötr',
            '1': 'Olumlu',
            '2': 'Dostane',
            '3': 'Sıkı Dost'
        };

        const levelKey = Math.max(-3, Math.min(3, newLevel)).toString();
        const levelName = levelNames[levelKey];
        
        showToast(`${npc.name} ile ilişkiniz: ${levelName}`, 'info');
    }
}

// =================================================================================
// SİSTEM ÖRNEKLERİ VE BAŞLANGIÇ VERİLERİ
// =================================================================================

// Irk tanımları
const races = {
    human: {
        name: "İnsan",
        description: "Uyum yeteneği yüksek, çok yönlü bir ırk",
        statBonuses: { str: 1, dex: 1, end: 1, int: 1, wis: 1, cha: 1 },
        traits: ['adaptable', 'versatile'],
        startingSkills: { persuasion: 5, barter: 5 }
    },
    elf: {
        name: "Elf",
        description: "Doğa ile uyumlu, keskin nişancı",
        statBonuses: { dex: 3, int: 2, end: -1 },
        traits: ['keen_senses', 'nature_affinity'],
        startingSkills: { archery: 10, stealth: 5, nature: 8 }
    },
    dwarf: {
        name: "Cüce",
        description: "Dayanıklı, zanaatkâr ruhlu",
        statBonuses: { str: 2, end: 3, cha: -1 },
        traits: ['stonecunning', 'hardy'],
        startingSkills: { smithing: 10, mining: 8, axe: 8 }
    }
};

// Karakter sınıfları
const characterClasses = {
    warrior: {
        name: "Savaşçı",
        description: "Fiziksel savaşta usta",
        startingStats: { str: 15, dex: 12, end: 14, int: 8, wis: 10, cha: 11 },
        startingSkills: { sword: 10, shield: 8, heavy_armor: 8 },
        startingEquipment: ['iron_sword', 'wooden_shield', 'leather_armor']
    },
    ranger: {
        name: "Korucu",
        description: "Doğada ustalaşmış nişancı",
        startingStats: { str: 12, dex: 16, end: 12, int: 10, wis: 13, cha: 9 },
        startingSkills: { bow: 12, stealth: 10, survival: 10, dual_wield: 8 },
        startingEquipment: ['hunting_bow', 'leather_armor', 'health_potion']
    },
    mage: {
        name: "Büyücü",
        description: "Büyü sanatında uzman",
        startingStats: { str: 8, dex: 10, end: 10, int: 16, wis: 14, cha: 12 },
        startingSkills: { destruction: 12, restoration: 10, alchemy: 8, enchanting: 8 },
        startingEquipment: ['apprentice_robe', 'staff', 'mana_potion']
    }
};

// Geçmişler
const backgrounds = {
    noble: {
        name: "Soylu",
        description: "Asil bir aileden geliyorsunuz",
        statBonuses: { cha: 3, int: 2 },
        skillBonuses: { persuasion: 10, history: 8 },
        startingEquipment: ['fine_clothes', 'gold_ring'],
        startingGold: 100
    },
    commoner: {
        name: "Sıradan",
        description: "Mütevazı bir geçmişiniz var",
        statBonuses: { end: 2, wis: 2 },
        skillBonuses: { survival: 8, barter: 6 },
        startingEquipment: ['simple_clothes', 'bread'],
        startingGold: 25
    },
    criminal: {
        name: "Suçlu",
        description: "Geçmişiniz karanlık sırlarla dolu",
        statBonuses: { dex: 3, cha: -1 },
        skillBonuses: { stealth: 10, lockpicking: 8, pickpocket: 8 },
        startingEquipment: ['thieves_tools', 'dagger'],
        startingGold: 40
    }
};

// Eşya veritabanı
const items = {
    // Silahlar
    iron_sword: {
        id: 'iron_sword',
        name: 'Demir Kılıç',
        type: 'weapon',
        slot: 'weapon',
        damage: 15,
        skill: 'sword',
        value: 50,
        weight: 3.0
    },
    hunting_bow: {
        id: 'hunting_bow',
        name: 'Av Tüfeği',
        type: 'weapon',
        slot: 'weapon',
        damage: 12,
        skill: 'bow',
        value: 40,
        weight: 2.5
    },
    
    // Zırhlar
    leather_armor: {
        id: 'leather_armor',
        name: 'Deri Zırh',
        type: 'armor',
        slot: 'chest',
        defense: 8,
        value: 30,
        weight: 5.0
    },
    
    // Tüketilebilirler
    health_potion: {
        id: 'health_potion',
        name: 'Can İksiri',
        type: 'consumable',
        effect: { health: 30 },
        value: 25,
        weight: 0.5
    },
    
    // Görev eşyaları
    ancient_relic: {
        id: 'ancient_relic',
        name: 'Kadim Kalıntı',
        type: 'quest',
        value: 100,
        weight: 1.0
    }
};

// =================================================================================
// SİSTEM ÖRNEK KULLANIMI
// =================================================================================

// Sistemleri başlat
const questSystem = new QuestSystem();
const characterSystem = new AdvancedCharacterSystem();
const economySystem = new EconomySystem();
const combatSystem = new AdvancedCombatSystem();
const worldSystem = new DynamicWorldSystem();
const advancedAISystem = new AdvancedAISystem();

// Örnek görev tanımla
questSystem.addQuest('rescue_villagers', {
    title: 'Köylüleri Kurtar',
    description: 'Haydutlar köyü basmış. Masum köylüleri kurtarmalısın.',
    giver: 'village_elder',
    requiredLevel: 2,
    objectives: [
        { description: 'Haydut liderini yen', required: 1, current: 0 },
        { description: 'Köylüleri serbest bırak', required: 3, current: 0 }
    ],
    rewards: {
        xp: 200,
        gold: 150,
        items: ['ancient_relic'],
        reputation: { common_people: 20 }
    },
    nextQuest: 'investigate_bandit_camp'
});

// Piyasa oluştur
economySystem.createMarket('riverwood_market', 'riverwood', {
    'health_potion': 25,
    'iron_sword': 50,
    'leather_armor': 30
});

// NPC davranışı tanımla
advancedAISystem.defineNPCBehavior('village_elder', {
    name: 'Köy Yaşlısı',
    type: 'quest_giver',
    tradeThreshold: 20,
    schedule: {
        8: { location: 'village_square', action: 'socializing' },
        14: { location: 'village_hall', action: 'working' },
        20: { location: 'home', action: 'resting' }
    }
});

// =================================================================================
// YARDIMCI FONKSİYONLAR
// =================================================================================

// Oyun bildirimi göster
function showGameNotification(notification) {
    // UI bildirim sistemi buraya entegre edilecek
    console.log(`[${notification.type.toUpperCase()}] ${notification.title}: ${notification.message}`);
}

// Toast mesajı göster
function showToast(message, type = 'info') {
    // UI toast sistemi buraya entegre edilecek
    console.log(`[TOAST:${type.toUpperCase()}] ${message}`);
}

// XP ekle ve seviye atlama kontrolü
function addXp(amount) {
    const character = masterState.gameSlots[masterState.activeSlotIndex].character;
    character.xp += amount;
    
    while (character.xp >= character.xpToNextLevel) {
        levelUpCharacter();
    }
}

// Seviye atlama
function levelUpCharacter() {
    const character = masterState.gameSlots[masterState.activeSlotIndex].character;
    character.xp -= character.xpToNextLevel;
    character.level += 1;
    character.xpToNextLevel = Math.floor(character.xpToNextLevel * 1.2);
    
    // Stat artışları
    character.stats.str += 1;
    character.stats.dex += 1;
    character.stats.end += 1;
    character.stats.int += 1;
    character.stats.wis += 1;
    character.stats.cha += 1;
    
    // Can ve mana yenile
    character.stats.health = character.stats.maxHealth;
    character.stats.mana = character.stats.maxMana;
    
    showToast(`Tebrikler! Seviye atladın: ${character.level}`, 'success');
}

// İtibar değiştir
function changeReputation(faction, amount) {
    const character = masterState.gameSlots[masterState.activeSlotIndex].character;
    character.reputation[faction] = (character.reputation[faction] || 0) + amount;
    
    const factionNames = {
        the_crown: 'Kraliyet',
        common_people: 'Halk',
        merchants_guild: 'Tüccar Loncası'
    };
    
    showToast(`${factionNames[faction]} itibarınız ${amount > 0 ? 'arttı' : 'azaldı'}: ${amount}`, 
              amount > 0 ? 'success' : 'warning');
}

// Savaş etkinliği başlat
function startCombatEvent(eventData) {
    showToast(`${eventData.enemies.length} düşman saldırıyor!`, 'warning');
    // Savaş ekranını aç
    openCombatScreen(eventData);
}

// Savaş ekranını aç
function openCombatScreen(combatData) {
    // Savaş UI'ını burada oluştur
    console.log('Savaş başlıyor:', combatData);
}

// =================================================================================
// SİSTEMLERİ GLOBAL ERİŞİME AÇ
// =================================================================================
window.questSystem = questSystem;
window.characterSystem = characterSystem;
window.economySystem = economySystem;
window.combatSystem = combatSystem;
window.worldSystem = worldSystem;
window.advancedAISystem = advancedAISystem;
/* =============================================================================
   Medieval Quest - game rules
   Pure game logic with no DOM access. The UI (ui.js, main.js) listens to the
   events published on Bus and calls the functions below.

   Systems: Util, Bus, Store, Rep, Bag, Hero, Rewards, Quests, Combat,
            Economy, Crafting, World, Achievements, Game
   ============================================================================= */
'use strict';

/* ---------------------------------------------------------------------------
   Utilities and event bus
   --------------------------------------------------------------------------- */

const Util = {
    rand: () => Math.random(),
    randInt(min, max) { return Math.floor(Util.rand() * (max - min + 1)) + min; },
    range(value) { return Array.isArray(value) ? Util.randInt(value[0], value[1]) : value; },
    pick(list) { return list[Math.floor(Util.rand() * list.length)]; },
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    chance(p) { return Util.rand() < p; },
    weightedPick(entries, weightOf) {
        const total = entries.reduce((sum, e) => sum + weightOf(e), 0);
        let roll = Util.rand() * total;
        for (const entry of entries) {
            roll -= weightOf(entry);
            if (roll <= 0) return entry;
        }
        return entries[entries.length - 1];
    },
    escape(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    clone(value) { return JSON.parse(JSON.stringify(value)); }
};

const Bus = {
    handlers: {},
    on(name, fn) { (Bus.handlers[name] = Bus.handlers[name] || []).push(fn); },
    emit(name, payload) { (Bus.handlers[name] || []).forEach(fn => fn(payload)); }
};

/* ---------------------------------------------------------------------------
   Persistent storage: settings, lifetime stats and save slots
   --------------------------------------------------------------------------- */

const Store = {
    SLOTS: ['auto', '1', '2', '3'],
    memory: {},                               // fallback when localStorage is blocked
    keys: { settings: 'mq.settings.v1', meta: 'mq.meta.v1', save: slot => `mq.save.v1.${slot}` },

    get(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return Store.memory[key] || null; }
    },
    set(key, value) {
        try { window.localStorage.setItem(key, value); } catch (e) { Store.memory[key] = value; }
    },
    remove(key) {
        try { window.localStorage.removeItem(key); } catch (e) { delete Store.memory[key]; }
    },
    getJson(key, fallback) {
        const raw = Store.get(key);
        if (!raw) return fallback;
        try { return JSON.parse(raw); } catch (e) { return fallback; }
    },

    defaultSettings() {
        const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        return { musicVolume: 0.35, sfxVolume: 0.7, autoSave: true, difficulty: 'normal', reduceMotion: !!reduce };
    },
    loadSettings() {
        const saved = Store.getJson(Store.keys.settings, {});
        const settings = Object.assign(Store.defaultSettings(), saved);
        if (!DATA.DIFFICULTY[settings.difficulty]) settings.difficulty = 'normal';
        return settings;
    },
    saveSettings(settings) { Store.set(Store.keys.settings, JSON.stringify(settings)); },

    loadMeta() {
        return Object.assign({ playSeconds: 0, quests: 0, kills: 0, achievements: {} }, Store.getJson(Store.keys.meta, {}));
    },
    saveMeta(meta) { Store.set(Store.keys.meta, JSON.stringify(meta)); },

    readSlot(slot) {
        const data = Store.getJson(Store.keys.save(slot), null);
        return data && data.version === 1 && data.state ? data : null;
    },
    writeSlot(slot, state) {
        const hero = state.hero;
        const record = {
            version: 1,
            savedAt: Date.now(),
            summary: {
                name: hero.name,
                level: hero.level,
                race: hero.race,
                cls: hero.cls,
                location: state.world.location,
                day: World.clock(state).day,
                playSeconds: state.playSeconds
            },
            state
        };
        Store.set(Store.keys.save(slot), JSON.stringify(record));
        return record;
    },
    deleteSlot(slot) { Store.remove(Store.keys.save(slot)); },
    listSlots() { return Store.SLOTS.map(slot => ({ slot, record: Store.readSlot(slot) })); },
    latest() {
        const found = Store.listSlots().filter(s => s.record);
        found.sort((a, b) => b.record.savedAt - a.record.savedAt);
        return found[0] || null;
    },
    clearAll() {
        Store.SLOTS.forEach(Store.deleteSlot);
        Store.remove(Store.keys.meta);
        Store.remove(Store.keys.settings);
    }
};

/* ---------------------------------------------------------------------------
   Reputation
   --------------------------------------------------------------------------- */

const Rep = {
    change(faction, amount) {
        const rep = Game.state.hero.rep;
        if (!(faction in rep)) return null;
        const before = rep[faction];
        rep[faction] = Util.clamp(before + amount, -100, 100);
        const delta = rep[faction] - before;
        if (delta !== 0) {
            const sign = delta > 0 ? '+' : '';
            Game.log(`${DATA.FACTIONS[faction].name} standing ${sign}${delta}.`, delta > 0 ? 'good' : 'bad');
        }
        return delta;
    },
    value(faction) { return Game.state.hero.rep[faction] || 0; },
    title(value) {
        if (value <= -50) return 'Hated';
        if (value <= -15) return 'Distrusted';
        if (value < 15) return 'Neutral';
        if (value < 40) return 'Respected';
        if (value < 70) return 'Honoured';
        return 'Revered';
    }
};

/* ---------------------------------------------------------------------------
   Inventory
   --------------------------------------------------------------------------- */

const Bag = {
    add(id, qty = 1) {
        if (!DATA.items[id]) throw new Error(`Unknown item: ${id}`);
        const inv = Game.state.hero.inventory;
        inv[id] = (inv[id] || 0) + qty;
    },
    remove(id, qty = 1) {
        const inv = Game.state.hero.inventory;
        if ((inv[id] || 0) < qty) return false;
        inv[id] -= qty;
        if (inv[id] <= 0) delete inv[id];
        return true;
    },
    count(id) { return Game.state.hero.inventory[id] || 0; },
    typeOrder: { weapon: 0, armor: 1, trinket: 2, consumable: 3, material: 4, junk: 5, quest: 6 },
    list() {
        return Object.entries(Game.state.hero.inventory)
            .map(([id, qty]) => ({ item: DATA.items[id], qty }))
            .filter(entry => entry.item)
            .sort((a, b) => (Bag.typeOrder[a.item.type] - Bag.typeOrder[b.item.type]) || a.item.name.localeCompare(b.item.name));
    }
};

/* ---------------------------------------------------------------------------
   The hero: attributes, equipment, levelling
   --------------------------------------------------------------------------- */

const Hero = {
    create({ name, race, cls, background }) {
        const r = DATA.races[race], c = DATA.classes[cls], b = DATA.backgrounds[background];
        if (!r || !c || !b) throw new Error('Invalid character choices');
        const attrs = {};
        Object.keys(DATA.STATS).forEach(k => {
            attrs[k] = DATA.BASE_ATTRIBUTE + (r.stats[k] || 0) + (c.stats[k] || 0) + (b.stats[k] || 0);
        });
        const hero = {
            name, race, cls, background,
            level: 1, xp: 0, points: 0, gold: b.gold,
            attrs, hp: 1,
            inventory: {},
            equipment: { weapon: null, head: null, chest: null, trinket: null },
            rep: { the_crown: 0, merchants_guild: 0, common_folk: 0 }
        };
        return hero;
    },

    mods(hero = Game.state.hero) {
        const total = { armor: 0, crit: 0, xpMult: 0, goldMult: 0, discount: 0, energy: 0, rage: 0 };
        [DATA.races[hero.race].mods, DATA.backgrounds[hero.background].mods].forEach(m => {
            Object.keys(m || {}).forEach(k => { total[k] = (total[k] || 0) + m[k]; });
        });
        return total;
    },

    attrs(hero = Game.state.hero) {
        const total = Object.assign({}, hero.attrs);
        Object.values(hero.equipment).forEach(id => {
            const item = id && DATA.items[id];
            if (item && item.bonus) Object.keys(item.bonus).forEach(k => { total[k] += item.bonus[k]; });
        });
        return total;
    },

    maxHp(hero = Game.state.hero) {
        return 12 + Hero.attrs(hero).con * 2 + hero.level * 5 + DATA.classes[hero.cls].hp;
    },
    maxEnergy(hero = Game.state.hero) {
        return DATA.classes[hero.cls].energy + Hero.mods(hero).energy + Math.floor(Hero.attrs(hero).int / 4);
    },
    armor(hero = Game.state.hero) {
        let armor = Hero.mods(hero).armor;
        Object.values(hero.equipment).forEach(id => {
            const item = id && DATA.items[id];
            if (item && item.armor) armor += item.armor;
        });
        return armor;
    },
    critChance(hero = Game.state.hero) {
        return 0.05 + Hero.attrs(hero).dex * 0.004 + Hero.mods(hero).crit;
    },
    weapon(hero = Game.state.hero) {
        const item = hero.equipment.weapon && DATA.items[hero.equipment.weapon];
        return item || { id: 'fists', name: 'Bare Fists', damage: [1, 3], scale: 'str', icon: '👊' };
    },
    xpForLevel(level) { return DATA.LEVEL_XP[level - 1]; },
    xpToNext(hero = Game.state.hero) {
        return hero.level >= DATA.MAX_LEVEL ? null : DATA.LEVEL_XP[hero.level];
    },

    heal(amount) {
        const hero = Game.state.hero;
        const before = hero.hp;
        hero.hp = Util.clamp(hero.hp + amount, 0, Hero.maxHp());
        return hero.hp - before;
    },

    addXp(amount) {
        const hero = Game.state.hero;
        const gained = Math.round(amount * (1 + Hero.mods().xpMult));
        if (hero.level >= DATA.MAX_LEVEL) return gained;
        hero.xp += gained;
        const levels = [];
        while (hero.level < DATA.MAX_LEVEL && hero.xp >= DATA.LEVEL_XP[hero.level]) {
            const hpBefore = Hero.maxHp();
            hero.level += 1;
            hero.points += DATA.POINTS_PER_LEVEL;
            hero.hp = Math.min(Hero.maxHp(), hero.hp + (Hero.maxHp() - hpBefore) + Math.round(Hero.maxHp() * 0.25));
            levels.push(hero.level);
            Game.log(`You reached level ${hero.level}! You have ${hero.points} attribute points to spend.`, 'good');
            Bus.emit('levelup', hero.level);
        }
        if (hero.level >= 5) Achievements.unlock('veteran');
        return gained;
    },

    spendPoint(attr) {
        const hero = Game.state.hero;
        if (hero.points <= 0 || !(attr in hero.attrs)) return false;
        const hpBefore = Hero.maxHp();
        hero.attrs[attr] += 1;
        hero.points -= 1;
        hero.hp += Hero.maxHp() - hpBefore;
        return true;
    },

    meetsRequirements(item, hero = Game.state.hero) {
        const attrs = Hero.attrs(hero);
        const missing = Object.keys(item.req || {}).filter(k => attrs[k] < item.req[k]);
        return { ok: missing.length === 0, missing: missing.map(k => `${DATA.STATS[k].short} ${item.req[k]}`) };
    },

    equip(id) {
        const hero = Game.state.hero;
        const item = DATA.items[id];
        const slot = item && (item.type === 'weapon' ? 'weapon' : item.slot);
        if (!slot || !(slot in hero.equipment)) return { ok: false, reason: 'That cannot be equipped.' };
        if (Bag.count(id) < 1) return { ok: false, reason: 'You do not have that item.' };
        const req = Hero.meetsRequirements(item);
        if (!req.ok) return { ok: false, reason: `You need ${req.missing.join(', ')} to use ${item.name}.` };
        const previous = hero.equipment[slot];
        Bag.remove(id, 1);
        if (previous) Bag.add(previous, 1);
        hero.equipment[slot] = id;
        hero.hp = Math.min(hero.hp, Hero.maxHp());
        return { ok: true, slot, previous };
    },

    unequip(slot) {
        const hero = Game.state.hero;
        const id = hero.equipment[slot];
        if (!id) return false;
        Bag.add(id, 1);
        hero.equipment[slot] = null;
        hero.hp = Math.min(hero.hp, Hero.maxHp());
        return true;
    },

    /** Use a consumable outside combat. Combat items are handled by Combat.useItem. */
    useItem(id) {
        const item = DATA.items[id];
        if (!item || item.type !== 'consumable') return { ok: false, reason: 'That cannot be used.' };
        if (Bag.count(id) < 1) return { ok: false, reason: 'You do not have that item.' };
        const effect = item.effect;
        if (!effect.heal || item.combatOnly) return { ok: false, reason: `${item.name} is best saved for battle.` };
        if (Game.state.hero.hp >= Hero.maxHp()) return { ok: false, reason: 'You are already at full health.' };
        Bag.remove(id, 1);
        const healed = Hero.heal(effect.heal);
        Game.log(`You use ${item.name} and recover ${healed} health.`, 'good');
        return { ok: true, healed };
    }
};

/* ---------------------------------------------------------------------------
   Rewards (shared by quests, events and combat)
   --------------------------------------------------------------------------- */

const Rewards = {
    /** Grant xp / gold / items / reputation. Returns human-readable lines. */
    grant(reward = {}, { goldBonus = false } = {}) {
        const hero = Game.state.hero;
        const lines = [];
        if (reward.xp) {
            const xp = Hero.addXp(reward.xp);
            lines.push(`+${xp} XP`);
        }
        if (reward.gold) {
            let gold = Util.range(reward.gold);
            if (goldBonus && gold > 0) gold = Math.round(gold * (1 + Hero.mods().goldMult));
            if (gold !== 0) {
                hero.gold = Math.max(0, hero.gold + gold);
                lines.push(gold > 0 ? `+${gold} gold` : `${gold} gold`);
                Achievements.check();
            }
        }
        (reward.items || []).forEach(entry => {
            const [id, qty] = Array.isArray(entry) ? entry : [entry.item, entry.qty];
            if (entry.chance !== undefined && !Util.chance(entry.chance)) return;
            const amount = Util.range(qty || 1);
            if (amount > 0) {
                Bag.add(id, amount);
                lines.push(`${DATA.items[id].name}${amount > 1 ? ' ×' + amount : ''}`);
            }
        });
        (reward.removeItems || []).forEach(({ item, qty }) => {
            if (Bag.remove(item, qty || 1)) lines.push(`Used ${DATA.items[item].name}`);
        });
        Object.keys(reward.rep || {}).forEach(f => {
            const delta = Rep.change(f, reward.rep[f]);
            if (delta) lines.push(`${DATA.FACTIONS[f].name} ${delta > 0 ? '+' : ''}${delta}`);
        });
        if (reward.hp) {
            if (reward.hp > 0) {
                const healed = Hero.heal(reward.hp);
                if (healed) lines.push(`+${healed} HP`);
            } else {
                const hurt = Math.min(-reward.hp, hero.hp - 1);
                hero.hp -= hurt;
                if (hurt) lines.push(`-${hurt} HP`);
            }
        }
        return lines;
    }
};

/* ---------------------------------------------------------------------------
   Quests
   --------------------------------------------------------------------------- */

const Quests = {
    entry(id) { return Game.state.quests[id] || null; },
    status(id) {
        const e = Quests.entry(id);
        return e ? e.state : 'unstarted';
    },
    isActive(id) { return Quests.status(id) === 'active'; },
    isOpen(id) { return ['active', 'ready'].includes(Quests.status(id)); },
    isCompleted(id) { return Quests.status(id) === 'completed'; },

    /** Has the player unlocked this quest (prerequisites done)? */
    unlocked(id) {
        const q = DATA.quests[id];
        return (q.requires || []).every(r => Quests.isCompleted(r));
    },
    offeredBy(npcId) {
        return Object.values(DATA.quests).filter(q => q.giver === npcId && Quests.status(q.id) === 'unstarted' && Quests.unlocked(q.id));
    },
    readyAt(npcId) {
        return Object.values(DATA.quests).filter(q => q.turnIn === npcId && Quests.status(q.id) === 'ready');
    },
    activeAt(npcId) {
        return Object.values(DATA.quests).filter(q => q.turnIn === npcId && Quests.status(q.id) === 'active');
    },

    start(id) {
        const q = DATA.quests[id];
        if (!q || Quests.status(id) !== 'unstarted') return false;
        Game.state.quests[id] = { state: 'active', progress: q.objectives.map(() => 0), choice: null };
        Game.log(`New quest: ${q.title}`, 'quest');
        Bus.emit('toast', { msg: `Quest started: ${q.title}`, type: 'quest' });
        Bus.emit('sfx', 'quest');
        Quests.refresh();
        return true;
    },

    objectiveProgress(id, index) {
        const q = DATA.quests[id];
        const obj = q.objectives[index];
        const entry = Quests.entry(id);
        if (!entry) return 0;
        if (obj.type === 'collect') return Math.min(Bag.count(obj.item), obj.count);
        return Math.min(entry.progress[index] || 0, obj.count || 1);
    },
    objectiveNeeded(obj) { return obj.count || 1; },
    objectiveDone(id, index) {
        return Quests.objectiveProgress(id, index) >= Quests.objectiveNeeded(DATA.quests[id].objectives[index]);
    },

    /** Re-evaluate every open quest: moves quests between "active" and "ready". */
    refresh() {
        Object.keys(Game.state.quests).forEach(id => {
            const entry = Game.state.quests[id];
            if (entry.state === 'completed') return;
            const q = DATA.quests[id];
            const done = q.objectives.every((o, i) => Quests.objectiveDone(id, i));
            if (done && entry.state === 'active') {
                entry.state = 'ready';
                Game.log(`Quest objectives complete: ${q.title}. Return to ${DATA.npcs[q.turnIn].name}.`, 'quest');
                Bus.emit('toast', { msg: `Objectives complete: ${q.title}`, type: 'quest' });
                Bus.emit('sfx', 'quest');
            } else if (!done && entry.state === 'ready') {
                entry.state = 'active';
            }
        });
        Bus.emit('update');
    },

    /** Called from game events. matcher decides which objectives advance. */
    advance(type, matcher) {
        let changed = false;
        Object.keys(Game.state.quests).forEach(id => {
            const entry = Game.state.quests[id];
            if (entry.state !== 'active') return;
            DATA.quests[id].objectives.forEach((obj, i) => {
                if (obj.type !== type || !matcher(obj)) return;
                const need = Quests.objectiveNeeded(obj);
                if ((entry.progress[i] || 0) >= need) return;
                entry.progress[i] = (entry.progress[i] || 0) + 1;
                changed = true;
                Bus.emit('toast', { msg: `${DATA.quests[id].title}: ${obj.text} (${Math.min(entry.progress[i], need)}/${need})`, type: 'quest' });
            });
        });
        Quests.refresh();
        return changed;
    },
    onKill(enemyId) {
        Quests.advance('kill', obj => [].concat(obj.target).includes(enemyId));
    },
    onExplore(loc) { Quests.advance('explore', obj => obj.location === loc); },
    onCraft(recipe) { Quests.advance('craft', obj => obj.recipe === recipe); },
    onTalk(npc) { Quests.advance('talk', obj => obj.npc === npc); },

    choiceAvailable(choice) {
        if (!choice.requires) return { ok: true };
        const r = choice.requires;
        if (r.stat && Hero.attrs()[r.stat] < r.min) return { ok: false, reason: `Requires ${DATA.STATS[r.stat].short} ${r.min}` };
        return { ok: true };
    },

    /** Turn in a ready quest. choiceId is required for quests with branching outcomes. */
    turnIn(id, choiceId) {
        const q = DATA.quests[id];
        const entry = Quests.entry(id);
        if (!q || !entry || entry.state !== 'ready') return null;
        let choice = null;
        if (q.choices) {
            choice = q.choices.find(c => c.id === choiceId);
            if (!choice || !Quests.choiceAvailable(choice).ok) return null;
        }
        q.objectives.forEach(obj => {
            if (obj.type === 'collect' && obj.consume) Bag.remove(obj.item, obj.count);
        });
        if (choice && choice.consume) Bag.remove('oakvale_seal', 1);
        entry.state = 'completed';
        entry.choice = choiceId || null;
        const lines = Rewards.grant(choice ? choice.reward : q.reward);
        if (q.reward && choice) lines.push(...Rewards.grant(q.reward));
        Game.meta.quests += 1;
        Game.log(`Quest complete: ${q.title}`, 'quest');
        Bus.emit('sfx', 'success');
        if (choice && choice.ending) {
            Game.state.world.ending = choice.ending;
            Achievements.unlock('hero');
        }
        Achievements.check();
        Quests.refresh();
        Game.requestAutosave();
        return { quest: q, choice, lines };
    },

    completedCount() { return Object.values(Game.state.quests).filter(e => e.state === 'completed').length; }
};

/* ---------------------------------------------------------------------------
   Combat
   --------------------------------------------------------------------------- */

const Combat = {
    active: null,

    armorFactor(armor) { return 100 / (100 + armor * 6); },
    reduce(damage, armor) { return Math.max(1, Math.round(damage * Combat.armorFactor(armor))); },

    start(enemyId, { source = null, ambush = false } = {}) {
        const def = DATA.enemies[enemyId];
        const diff = DATA.DIFFICULTY[Game.settings.difficulty];
        const maxHp = Math.round(def.hp * diff.enemyHealth);
        Combat.active = {
            enemyId, def, source, ambush,
            enemy: { hp: maxHp, maxHp, statuses: [], enraged: false, stunImmune: 0 },
            player: { statuses: [], defending: false, stunImmune: 0 },
            energy: Hero.maxEnergy(), maxEnergy: Hero.maxEnergy(),
            round: 1, over: null, actions: 0
        };
        Game.log(def.intro, 'combat');
        Bus.emit('sfx', 'attack');
        return Combat.active;
    },

    snapshot(partial) {
        const c = Combat.active;
        return Object.assign({
            kind: 'info', text: '', amount: 0, target: null, crit: false,
            playerHp: Game.state.hero.hp, enemyHp: c.enemy.hp,
            energy: c.energy,
            playerStatuses: c.player.statuses.map(s => s.id),
            enemyStatuses: c.enemy.statuses.map(s => s.id)
        }, partial);
    },

    /** Apply a status to 'enemy' or 'player'. A stun cannot be repeated on the very next turn. */
    addStatus(side, status) {
        const c = Combat.active;
        const target = side === 'enemy' ? c.enemy : c.player;
        if (status.id === 'stun' && target.stunImmune > 0) return false;
        const existing = target.statuses.find(s => s.id === status.id);
        if (existing) {
            existing.turns = Math.max(existing.turns, status.turns);
            existing.dmg = Math.max(existing.dmg || 0, status.dmg || 0);
        } else {
            target.statuses.push({ id: status.id, turns: status.turns, dmg: status.dmg || 0 });
        }
        return true;
    },

    /** Apply damage-over-time and tick durations. Returns beats. */
    tickStatuses(side) {
        const c = Combat.active;
        const list = side === 'player' ? c.player.statuses : c.enemy.statuses;
        const beats = [];
        list.forEach(s => {
            const info = DATA.STATUSES[s.id];
            if (!info.dot) return;
            if (side === 'player') {
                const hurt = Math.min(s.dmg, Math.max(0, Game.state.hero.hp));
                Game.state.hero.hp -= hurt;
                beats.push(Combat.snapshot({ kind: 'dot', target: 'player', amount: hurt, text: `You suffer ${hurt} damage from ${info.name.toLowerCase()}.` }));
            } else {
                c.enemy.hp = Math.max(0, c.enemy.hp - s.dmg);
                beats.push(Combat.snapshot({ kind: 'dot', target: 'enemy', amount: s.dmg, text: `${c.def.name} takes ${s.dmg} damage from ${info.name.toLowerCase()}.` }));
            }
        });
        list.forEach(s => { if (DATA.STATUSES[s.id].dot) s.turns -= 1; });
        const keep = list.filter(s => s.turns > 0 || s.id === 'stun');
        list.length = 0;
        keep.forEach(s => list.push(s));
        return beats;
    },

    checkOver(beats) {
        const c = Combat.active;
        if (c.over) return true;
        if (c.enemy.hp <= 0) {
            c.over = 'victory';
            beats.push(Combat.snapshot({ kind: 'end', text: `${c.def.name} falls!` }));
            return true;
        }
        if (Game.state.hero.hp <= 0) {
            Game.state.hero.hp = 0;
            c.over = 'defeat';
            beats.push(Combat.snapshot({ kind: 'end', text: 'You collapse, your vision fading...' }));
            return true;
        }
        return false;
    },

    weaponVerb(weapon) {
        const id = weapon.id;
        if (/bow/.test(id)) return 'loose an arrow at';
        if (/dagger/.test(id)) return 'stab';
        if (/staff/.test(id)) return 'strike';
        if (/axe/.test(id)) return 'hew';
        if (/sword|blade/.test(id)) return 'slash';
        return 'strike';
    },

    rawWeaponDamage(multiplier = 1) {
        const weapon = Hero.weapon();
        const attrs = Hero.attrs();
        const base = Util.randInt(weapon.damage[0], weapon.damage[1]) + Math.floor(attrs[weapon.scale] / 4);
        return base * multiplier * Combat.rageMultiplier();
    },

    rageMultiplier() {
        const hero = Game.state.hero;
        const rage = Hero.mods().rage;
        return rage && hero.hp / Hero.maxHp() < 0.4 ? 1 + rage : 1;
    },

    hitChance() {
        return Util.clamp(0.8 + (Hero.attrs().dex - Combat.active.def.dex) * 0.015, 0.55, 0.97);
    },

    dealToEnemy(damage, { crit = false, label = '' } = {}) {
        const c = Combat.active;
        c.enemy.hp = Math.max(0, c.enemy.hp - damage);
        return Combat.snapshot({ kind: crit ? 'crit' : 'hit', target: 'enemy', amount: damage, crit, text: label });
    },

    /** Player actions. Returns { ok, beats }. */
    playerAction(kind, arg) {
        const c = Combat.active;
        if (!c || c.over) return { ok: false, beats: [] };
        const hero = Game.state.hero;
        const beats = [];
        const weapon = Hero.weapon();
        const cls = DATA.classes[hero.cls];
        c.actions += 1;

        if (kind === 'attack') {
            if (!Util.chance(Combat.hitChance())) {
                beats.push(Combat.snapshot({ kind: 'miss', target: 'enemy', text: `You ${Combat.weaponVerb(weapon)} ${c.def.name}, but miss.` }));
            } else {
                const crit = Util.chance(Hero.critChance());
                let dmg = Combat.reduce(Combat.rawWeaponDamage() * (crit ? 1.75 : 1), c.def.armor);
                beats.push(Combat.dealToEnemy(dmg, { crit, label: `You ${Combat.weaponVerb(weapon)} ${c.def.name} for ${dmg} damage${crit ? ' (critical hit!)' : ''}.` }));
            }
        } else if (kind === 'ability') {
            const ability = cls.ability;
            if (c.energy < ability.cost) return { ok: false, beats: [], reason: `You need ${ability.cost} energy.` };
            c.energy -= ability.cost;
            Combat.useAbility(ability.id, beats);
        } else if (kind === 'defend') {
            c.player.defending = true;
            c.energy = Math.min(c.maxEnergy, c.energy + 3);
            beats.push(Combat.snapshot({ kind: 'guard', text: 'You raise your guard and catch your breath. (+3 energy)' }));
        } else if (kind === 'item') {
            const result = Combat.useItem(arg, beats);
            if (!result.ok) return { ok: false, beats: [], reason: result.reason };
            if (c.over) return { ok: true, beats };
        } else if (kind === 'flee') {
            if (c.def.boss) return { ok: false, beats: [], reason: 'There is no escape from this fight!' };
            const chance = Util.clamp(0.45 + (Hero.attrs().dex - c.def.dex) * 0.03, 0.2, 0.85);
            if (Util.chance(chance)) {
                c.over = 'fled';
                beats.push(Combat.snapshot({ kind: 'end', text: 'You break away and escape into the wilds.' }));
                return { ok: true, beats };
            }
            beats.push(Combat.snapshot({ kind: 'info', text: 'You try to flee, but the enemy cuts you off!' }));
        } else {
            return { ok: false, beats: [] };
        }
        Combat.checkOver(beats);
        return { ok: true, beats };
    },

    useAbility(id, beats) {
        const c = Combat.active;
        const attrs = Hero.attrs();
        const name = DATA.classes[Game.state.hero.cls].ability.name;
        if (id === 'shield_bash') {
            const dmg = Combat.reduce(Combat.rawWeaponDamage(1.2), c.def.armor);
            beats.push(Combat.dealToEnemy(dmg, { label: `Shield Bash! You slam ${c.def.name} for ${dmg} damage.` }));
            if (c.enemy.hp > 0) {
                const stunned = Combat.addStatus('enemy', { id: 'stun', turns: 1 });
                beats.push(Combat.snapshot({ kind: 'status', target: 'enemy', text: stunned ? `${c.def.name} is stunned!` : `${c.def.name} shrugs off the stun.` }));
            }
        } else if (id === 'aimed_shot') {
            const crit = Util.chance(Util.clamp(Hero.critChance() + 0.25, 0, 0.9));
            const dmg = Combat.reduce(Combat.rawWeaponDamage(1.7) * (crit ? 1.75 : 1), c.def.armor);
            beats.push(Combat.dealToEnemy(dmg, { crit, label: `Aimed Shot! Your strike hits ${c.def.name} for ${dmg} damage${crit ? ' (critical hit!)' : ''}.` }));
        } else if (id === 'firebolt') {
            const crit = Util.chance(Hero.critChance());
            const dmg = Math.round((Util.randInt(8, 12) + Math.floor(attrs.int / 3)) * (crit ? 1.75 : 1) * Combat.rageMultiplier());
            beats.push(Combat.dealToEnemy(dmg, { crit, label: `Firebolt! Flames engulf ${c.def.name} for ${dmg} damage${crit ? ' (critical hit!)' : ''}.` }));
            if (c.enemy.hp > 0) {
                Combat.addStatus('enemy', { id: 'burn', turns: 3, dmg: 3 });
                beats.push(Combat.snapshot({ kind: 'status', target: 'enemy', text: `${c.def.name} is burning!` }));
            }
        } else if (id === 'backstab') {
            const stunned = c.enemy.statuses.some(s => s.id === 'stun');
            const crit = Util.chance(Hero.critChance() + (stunned ? 0.3 : 0));
            const dmg = Combat.reduce(Combat.rawWeaponDamage(1.9) * (crit ? 1.75 : 1) * (stunned ? 1.25 : 1), c.def.armor);
            beats.push(Combat.dealToEnemy(dmg, { crit, label: `${name}! You slip behind ${c.def.name} for ${dmg} damage${crit ? ' (critical hit!)' : ''}.` }));
            if (c.enemy.hp > 0) {
                Combat.addStatus('enemy', { id: 'bleed', turns: 3, dmg: 3 });
                beats.push(Combat.snapshot({ kind: 'status', target: 'enemy', text: `${c.def.name} is bleeding!` }));
            }
        }
    },

    usableItems() {
        return Bag.list().filter(e => e.item.type === 'consumable');
    },

    useItem(id, beats) {
        const c = Combat.active;
        const item = DATA.items[id];
        if (!item || item.type !== 'consumable' || Bag.count(id) < 1) return { ok: false, reason: 'You cannot use that.' };
        const effect = item.effect;
        if (effect.escape && c.def.boss) return { ok: false, reason: 'The smoke cannot hide you from this foe!' };
        if (effect.heal && !effect.damage && !effect.energy && Game.state.hero.hp >= Hero.maxHp()) return { ok: false, reason: 'You are already at full health.' };
        Bag.remove(id, 1);
        if (effect.escape) {
            c.over = 'fled';
            beats.push(Combat.snapshot({ kind: 'end', text: 'You hurl a smoke bomb and vanish in the haze.' }));
            return { ok: true };
        }
        if (effect.damage) {
            const dmg = Util.range(effect.damage);
            beats.push(Combat.dealToEnemy(dmg, { label: `You hurl ${item.name} for ${dmg} damage.` }));
            if (effect.status && c.enemy.hp > 0) {
                Combat.addStatus('enemy', { id: effect.status, turns: 3, dmg: effect.status === 'burn' ? 3 : 2 });
                beats.push(Combat.snapshot({ kind: 'status', target: 'enemy', text: `${c.def.name} is ${DATA.STATUSES[effect.status].name.toLowerCase()}!` }));
            }
        }
        if (effect.heal) {
            const healed = Hero.heal(effect.heal);
            beats.push(Combat.snapshot({ kind: 'heal', target: 'player', amount: healed, text: `You use ${item.name} and recover ${healed} health.` }));
        }
        if (effect.energy) {
            c.energy = Math.min(c.maxEnergy, c.energy + effect.energy);
            beats.push(Combat.snapshot({ kind: 'energy', text: `You use ${item.name} and recover ${effect.energy} energy.` }));
        }
        return { ok: true };
    },

    /** Enemy phase. Returns beats. */
    enemyTurn() {
        const c = Combat.active;
        const beats = [];
        if (!c || c.over) return beats;
        const hero = Game.state.hero;
        if (c.enemy.stunImmune > 0) c.enemy.stunImmune -= 1;
        beats.push(...Combat.tickStatuses('enemy'));
        if (Combat.checkOver(beats)) return beats;

        const stun = c.enemy.statuses.find(s => s.id === 'stun');
        if (stun) {
            c.enemy.statuses = c.enemy.statuses.filter(s => s.id !== 'stun');
            c.enemy.stunImmune = 1;
            beats.push(Combat.snapshot({ kind: 'status', target: 'enemy', text: `${c.def.name} is stunned and loses its turn.` }));
            c.player.defending = false;
            return beats;
        }

        const def = c.def;
        if (def.enrage && !c.enemy.enraged && c.enemy.hp / c.enemy.maxHp < def.enrage.below) {
            c.enemy.enraged = true;
            beats.push(Combat.snapshot({ kind: 'info', text: def.enrage.text }));
        }

        const diff = DATA.DIFFICULTY[Game.settings.difficulty];
        const ability = (def.abilities || []).find(a => Util.chance(a.chance));
        const defending = c.player.defending;
        const hitChance = Util.clamp(0.8 + (def.dex - Hero.attrs().dex) * 0.015 - (defending ? 0.2 : 0), 0.45, 0.92);
        const attackName = ability ? ability.name : 'attack';

        if (!Util.chance(hitChance)) {
            beats.push(Combat.snapshot({ kind: 'miss', target: 'player', text: `${def.name}'s ${attackName.toLowerCase()} misses you.` }));
        } else {
            let raw = Util.randInt(def.damage[0], def.damage[1]) * (ability ? ability.mult : 1) * diff.enemyDamage;
            if (c.enemy.enraged) raw *= def.enrage.mult;
            if (Game.world && World.isNight() && World.region() === 'wild') raw *= 1.1;
            const armor = def.spectral ? Hero.armor() * 0.5 : Hero.armor();
            let dmg = Combat.reduce(raw, armor);
            if (defending) dmg = Math.max(1, Math.round(dmg * 0.5));
            hero.hp = Math.max(0, hero.hp - dmg);
            const text = ability
                ? `${def.name} uses ${ability.name} and hits you for ${dmg} damage${defending ? ' (guarded)' : ''}.`
                : `${def.name} hits you for ${dmg} damage${defending ? ' (guarded)' : ''}.`;
            beats.push(Combat.snapshot({ kind: 'hit', target: 'player', amount: dmg, text }));
            if (hero.hp > 0 && ability && ability.status) {
                const resisted = ability.status.id === 'stun' && defending;
                if (resisted) {
                    beats.push(Combat.snapshot({ kind: 'info', text: 'Your guard holds firm. You are not stunned.' }));
                } else if (Combat.addStatus('player', ability.status)) {
                    beats.push(Combat.snapshot({ kind: 'status', target: 'player', text: `You are ${DATA.STATUSES[ability.status.id].name.toLowerCase()}!` }));
                }
            }
        }
        c.player.defending = false;
        Combat.checkOver(beats);
        return beats;
    },

    /** Start of the player's next turn: regenerate, take DoT, maybe lose the turn to stun. */
    startPlayerTurn() {
        const c = Combat.active;
        const beats = [];
        if (!c || c.over) return { beats, canAct: false };
        c.round += 1;
        c.energy = Math.min(c.maxEnergy, c.energy + 2);
        if (c.player.stunImmune > 0) c.player.stunImmune -= 1;
        beats.push(...Combat.tickStatuses('player'));
        if (Combat.checkOver(beats)) return { beats, canAct: false };
        const stun = c.player.statuses.find(s => s.id === 'stun');
        if (stun) {
            c.player.statuses = c.player.statuses.filter(s => s.id !== 'stun');
            c.player.stunImmune = 1;
            beats.push(Combat.snapshot({ kind: 'status', target: 'player', text: 'You are stunned and lose your turn!' }));
            return { beats, canAct: false };
        }
        return { beats, canAct: true };
    },

    /** Resolve the finished fight: rewards, quest progress, death handling. */
    finish() {
        const c = Combat.active;
        const hero = Game.state.hero;
        const summary = { result: c.over, enemy: c.def, xp: 0, gold: 0, loot: [], lines: [] };
        if (c.over === 'victory') {
            const stats = Game.state.stats;
            stats.kills[c.enemyId] = (stats.kills[c.enemyId] || 0) + 1;
            stats.totalKills += 1;
            Game.meta.kills += 1;
            summary.xp = Hero.addXp(c.def.xp);
            const goldRoll = Util.range(c.def.gold);
            summary.gold = Math.round(goldRoll * (1 + Hero.mods().goldMult));
            hero.gold += summary.gold;
            (c.def.loot || []).forEach(entry => {
                if (entry.requiresQuest && !Quests.isActive(entry.requiresQuest)) return;
                if (!Util.chance(entry.chance)) return;
                const qty = Util.range(entry.qty || 1);
                Bag.add(entry.item, qty);
                summary.loot.push({ id: entry.item, qty });
            });
            if (c.def.boss) Game.state.world.flags[`defeated:${c.enemyId}`] = true;
            Game.log(`Victory! ${c.def.name} defeated. +${summary.xp} XP, +${summary.gold} gold.`, 'good');
            summary.loot.forEach(l => Game.log(`Loot: ${DATA.items[l.id].name}${l.qty > 1 ? ' ×' + l.qty : ''}`, 'good'));
            World.advance(30);
            Achievements.unlock('first_blood');
            if (stats.totalKills >= 25) Achievements.unlock('slayer');
            Quests.onKill(c.enemyId);
            Achievements.check();
        } else if (c.over === 'defeat') {
            summary.respawn = World.respawn();
        } else if (c.over === 'fled') {
            Game.log(`You fled from ${c.def.name}.`, 'info');
            World.advance(15);
        }
        Combat.active = null;
        Quests.refresh();
        Game.requestAutosave();
        return summary;
    }
};

/* ---------------------------------------------------------------------------
   Economy
   --------------------------------------------------------------------------- */

const Economy = {
    discount(shopId) {
        const shop = DATA.shops[shopId];
        const rep = shop && shop.faction ? Rep.value(shop.faction) : 0;
        const repBonus = rep >= 60 ? 0.15 : rep >= 25 ? 0.1 : 0;
        const chaBonus = Math.max(0, Hero.attrs().cha - 10) * 0.01;
        return Math.min(0.25, Hero.mods().discount + chaBonus + repBonus);
    },
    buyPrice(itemId, shopId) {
        return Math.max(1, Math.ceil(DATA.items[itemId].value * (1 - Economy.discount(shopId))));
    },
    sellPrice(itemId, shopId) {
        return Math.max(1, Math.floor(DATA.items[itemId].value * (0.4 + Economy.discount(shopId) * 0.5)));
    },
    sellable(itemId) {
        const item = DATA.items[itemId];
        return item.value > 0 && item.type !== 'quest';
    },
    buy(shopId, itemId) {
        const hero = Game.state.hero;
        if (!DATA.shops[shopId].stock.includes(itemId)) return { ok: false, reason: 'That is not for sale.' };
        const price = Economy.buyPrice(itemId, shopId);
        if (hero.gold < price) return { ok: false, reason: 'You cannot afford that.' };
        hero.gold -= price;
        Bag.add(itemId, 1);
        Game.log(`Bought ${DATA.items[itemId].name} for ${price} gold.`, 'info');
        Bus.emit('sfx', 'coin');
        Quests.refresh();
        Game.requestAutosave();
        return { ok: true, price };
    },
    sell(shopId, itemId) {
        const hero = Game.state.hero;
        if (!Economy.sellable(itemId) || Bag.count(itemId) < 1) return { ok: false, reason: 'You cannot sell that.' };
        const price = Economy.sellPrice(itemId, shopId);
        Bag.remove(itemId, 1);
        hero.gold += price;
        Game.log(`Sold ${DATA.items[itemId].name} for ${price} gold.`, 'info');
        Bus.emit('sfx', 'coin');
        Achievements.check();
        Quests.refresh();
        Game.requestAutosave();
        return { ok: true, price };
    }
};

/* ---------------------------------------------------------------------------
   Crafting
   --------------------------------------------------------------------------- */

const Crafting = {
    stationsHere() { return DATA.locations[Game.state.world.location].stations || []; },
    missing(recipeId) {
        const recipe = DATA.recipes[recipeId];
        return Object.keys(recipe.materials)
            .filter(id => Bag.count(id) < recipe.materials[id])
            .map(id => ({ id, need: recipe.materials[id], have: Bag.count(id) }));
    },
    status(recipeId) {
        const recipe = DATA.recipes[recipeId];
        if (!Crafting.stationsHere().includes(recipe.station)) return { ok: false, reason: `Needs ${DATA.STATIONS[recipe.station].name}` };
        if (Crafting.missing(recipeId).length) return { ok: false, reason: 'Missing materials' };
        return { ok: true };
    },
    craft(recipeId) {
        const recipe = DATA.recipes[recipeId];
        const status = Crafting.status(recipeId);
        if (!status.ok) return status;
        Object.keys(recipe.materials).forEach(id => Bag.remove(id, recipe.materials[id]));
        Bag.add(recipe.result, 1);
        Game.state.stats.crafted += 1;
        Game.log(`You craft ${DATA.items[recipe.result].name}.`, 'good');
        Bus.emit('sfx', 'success');
        World.advance(45);
        Achievements.unlock('crafter');
        Quests.onCraft(recipeId);
        Game.requestAutosave();
        return { ok: true, item: DATA.items[recipe.result] };
    }
};

/* ---------------------------------------------------------------------------
   World: time, travel, exploration, resting
   --------------------------------------------------------------------------- */

const World = {
    clock(state = Game.state) {
        const t = state.world.time;
        const day = Math.floor(t / 1440) + 1;
        const hour = Math.floor((t % 1440) / 60);
        const minute = t % 60;
        let period = 'Night';
        if (hour >= 5 && hour < 8) period = 'Dawn';
        else if (hour >= 8 && hour < 12) period = 'Morning';
        else if (hour >= 12 && hour < 17) period = 'Afternoon';
        else if (hour >= 17 && hour < 21) period = 'Evening';
        return { day, hour, minute, period };
    },
    isNight() { const h = World.clock().hour; return h >= 21 || h < 5; },
    location() { return DATA.locations[Game.state.world.location]; },
    region() { return World.location().region; },
    advance(minutes) {
        Game.state.world.time += minutes;
        Bus.emit('update');
    },

    travelHours(from, to) {
        if (from === to) return 0;
        const a = DATA.locations[from], b = DATA.locations[to];
        if (a.region === 'city' && b.region === 'city') return 1;
        if (a.region === 'city') return b.distance;
        if (b.region === 'city') return a.distance;
        return 2 + Math.abs(a.distance - b.distance);
    },

    ambushEnemy(locId) {
        const pool = DATA.locations[locId].enemyPool;
        return pool ? Util.weightedPick(pool, e => e[1])[0] : null;
    },

    ambushChance(locId) {
        if (DATA.locations[locId].region !== 'wild') return 0;
        return 0.3 + (World.isNight() ? 0.15 : 0);
    },

    travel(destId) {
        const world = Game.state.world;
        if (destId === world.location) return { ok: false, reason: 'You are already here.' };
        const hours = World.travelHours(world.location, destId);
        World.advance(hours * 60);
        world.location = destId;
        const first = !world.visited[destId];
        world.visited[destId] = true;
        Game.log(`You travel to ${DATA.locations[destId].name} (${hours}h).`, 'info');
        if (first && Object.keys(world.visited).length >= DATA.LOCATION_ORDER.length) Achievements.unlock('explorer');
        const ambush = Util.chance(World.ambushChance(destId)) ? World.ambushEnemy(destId) : null;
        Quests.refresh();
        Game.requestAutosave();
        return { ok: true, hours, first, ambush };
    },

    questRequirementMet(action) {
        if (!action.requiresQuest) return { ok: true };
        if (Game.state.world.flags[`defeated:${action.enemy}`]) return { ok: false, hidden: true, reason: 'The way lies empty. Whatever was here is gone.' };
        if (Quests.status(action.requiresQuest) === 'active') return { ok: true };
        return { ok: false, reason: action.lockedHint };
    },

    eligibleEvents(loc, poolIds) {
        const flags = Game.state.world.eventCounts;
        return (loc.events || []).filter(ev => {
            if (poolIds && !poolIds.includes(ev.id)) return false;
            if (!poolIds && ev.id === 'dice_game') return false;
            if (ev.requiresQuest && !Quests.isActive(ev.requiresQuest)) return false;
            if (ev.max && (flags[ev.id] || 0) >= ev.max) return false;
            return true;
        });
    },

    /** Pick an exploration event. Non-choice events resolve instantly. */
    explore(action = {}) {
        const world = Game.state.world;
        const loc = World.location();
        const events = World.eligibleEvents(loc, action.eventPool);
        const event = Util.weightedPick(events, e => e.weight || 1);
        world.eventCounts[event.id] = (world.eventCounts[event.id] || 0) + 1;
        world.exploreCounts[loc.id] = (world.exploreCounts[loc.id] || 0) + 1;
        World.advance((action.hours || 1) * 60);
        Game.log(`${event.title}: ${event.text}`, 'event');
        const result = { event, resolved: null };
        if (!event.choices) result.resolved = World.resolveEvent(event);
        Quests.onExplore(loc.id);
        Game.requestAutosave();
        return result;
    },

    choiceAvailable(choice) {
        const r = choice.requires;
        if (!r) return { ok: true };
        if (r.stat && Hero.attrs()[r.stat] < r.min) return { ok: false, reason: `Requires ${DATA.STATS[r.stat].short} ${r.min}` };
        if (r.item && Bag.count(r.item) < (r.qty || 1)) return { ok: false, reason: `Requires ${DATA.items[r.item].name}` };
        if (r.gold && Game.state.hero.gold < r.gold) return { ok: false, reason: `Requires ${r.gold} gold` };
        return { ok: true };
    },

    resolveEvent(event, choiceIndex) {
        let text = event.text;
        let effects = event.effects || {};
        if (event.choices) {
            const choice = event.choices[choiceIndex];
            if (!choice || !World.choiceAvailable(choice).ok) return null;
            if (choice.roll) {
                const win = Util.chance(choice.roll.chance);
                const outcome = win ? choice.roll.win : choice.roll.lose;
                text = outcome.text;
                effects = outcome.effects;
            } else {
                text = choice.text;
                effects = choice.effects || {};
            }
        }
        const fight = effects.fight || null;
        const lines = Rewards.grant(Object.assign({}, effects, { fight: undefined }), { goldBonus: true });
        Quests.refresh();
        Achievements.check();
        return { text, lines, fight };
    },

    forage() {
        const loc = World.location();
        const cfg = loc.forage;
        World.advance(120);
        const found = [];
        cfg.items.forEach(entry => {
            if (!Util.chance(entry.chance)) return;
            const qty = Util.range(entry.qty);
            Bag.add(entry.item, qty);
            found.push(`${DATA.items[entry.item].name}${qty > 1 ? ' ×' + qty : ''}`);
        });
        Quests.refresh();
        Game.log(found.length ? `You forage: ${found.join(', ')}.` : 'You search for hours but find nothing useful.', found.length ? 'good' : 'info');
        const ambush = Util.chance(cfg.ambush + (World.isNight() ? 0.1 : 0)) ? World.ambushEnemy(loc.id) : null;
        Game.requestAutosave();
        return { found, ambush };
    },

    restCost() {
        const loc = DATA.locations.tavern;
        const action = loc.actions.find(a => a.type === 'rest');
        return Rep.value('common_folk') >= 25 ? Math.ceil(action.cost / 2) : action.cost;
    },

    rest() {
        const hero = Game.state.hero;
        const cost = World.restCost();
        if (hero.gold < cost) return { ok: false, reason: `A bed costs ${cost} gold.` };
        hero.gold -= cost;
        World.advance(8 * 60);
        const healed = Hero.heal(Hero.maxHp());
        Game.log(`You sleep soundly at the Serpent's Cup and recover ${healed} health.`, 'good');
        Game.requestAutosave();
        return { ok: true, cost, healed };
    },

    camp(action) {
        const heal = Math.round(Hero.maxHp() * 0.4);
        const chance = World.isNight() ? 0.4 : 0.25;
        const ambush = Util.chance(chance) ? World.ambushEnemy(Game.state.world.location) : null;
        World.advance((action.hours || 6) * 60);
        const healed = Hero.heal(heal);
        Game.log(`You camp for the night and recover ${healed} health.`, 'good');
        Game.requestAutosave();
        return { healed, ambush };
    },

    respawn() {
        const hero = Game.state.hero;
        const world = Game.state.world;
        const lost = Math.floor(hero.gold * 0.15);
        hero.gold -= lost;
        hero.hp = Math.max(1, Math.round(Hero.maxHp() * 0.6));
        world.location = 'tavern';
        world.visited.tavern = true;
        world.deaths += 1;
        World.advance(10 * 60);
        Game.log(`You wake in the Serpent's Cup with a sore head. Marta says kind strangers carried you here. You lost ${lost} gold.`, 'bad');
        return { lost };
    }
};

/* ---------------------------------------------------------------------------
   Achievements
   --------------------------------------------------------------------------- */

const Achievements = {
    unlock(id) {
        if (!Game.state || Game.state.achievements[id]) return;
        Game.state.achievements[id] = true;
        Game.meta.achievements[id] = true;
        const a = DATA.achievements[id];
        Bus.emit('toast', { msg: `Achievement unlocked: ${a.name}`, type: 'achievement' });
        Game.log(`Achievement unlocked: ${a.name}`, 'quest');
        Bus.emit('sfx', 'success');
    },
    check() {
        const s = Game.state;
        if (!s) return;
        if (s.hero.gold >= 500) Achievements.unlock('rich');
        if (Quests.completedCount() >= 5) Achievements.unlock('quester');
    },
    count() { return Object.keys(DATA.achievements).filter(id => Game.meta.achievements[id]).length; }
};

/* ---------------------------------------------------------------------------
   Game: lifecycle, save/load
   --------------------------------------------------------------------------- */

const Game = {
    state: null,
    settings: Store.loadSettings(),
    meta: Store.loadMeta(),
    world: null,
    autosaveTimer: null,

    log(msg, type = 'info') {
        if (!Game.state) return;
        const entry = { t: Game.state.world.time, msg, type };
        Game.state.log.push(entry);
        if (Game.state.log.length > 60) Game.state.log.shift();
        Bus.emit('log', entry);
    },

    newGame({ name, race, cls, background }) {
        const hero = Hero.create({ name, race, cls, background });
        Game.state = {
            version: 1,
            playSeconds: 0,
            hero,
            world: {
                time: DATA.START_TIME, location: 'market', visited: { market: true },
                exploreCounts: {}, eventCounts: {}, flags: {}, ending: null, deaths: 0
            },
            quests: {},
            stats: { kills: {}, totalKills: 0, crafted: 0 },
            achievements: {},
            log: []
        };
        Game.world = Game.state.world;
        hero.hp = Hero.maxHp();
        const cls_ = DATA.classes[cls], bg = DATA.backgrounds[background];
        ['weapon', 'head', 'chest'].forEach(slot => {
            if (cls_.start[slot]) hero.equipment[slot] = cls_.start[slot];
        });
        cls_.start.items.concat(bg.items).forEach(([id, qty]) => Bag.add(id, qty));
        Game.log(`${name} the ${DATA.races[race].name} ${cls_.name} arrives in Aethelgard.`, 'event');
        Quests.start('m1');
        Game.saveSlot('auto');
        return Game.state;
    },

    sanitize(state) {
        if (!state || !state.hero || !state.world) throw new Error('Corrupt save');
        const h = state.hero;
        if (!DATA.races[h.race] || !DATA.classes[h.cls] || !DATA.backgrounds[h.background]) throw new Error('Unknown character data');
        if (!DATA.locations[state.world.location]) state.world.location = 'market';
        Object.keys(h.inventory).forEach(id => { if (!DATA.items[id] || !(h.inventory[id] > 0)) delete h.inventory[id]; });
        Object.keys(h.equipment).forEach(slot => { if (h.equipment[slot] && !DATA.items[h.equipment[slot]]) h.equipment[slot] = null; });
        Object.keys(state.quests).forEach(id => { if (!DATA.quests[id]) delete state.quests[id]; });
        state.log = state.log || [];
        state.stats = Object.assign({ kills: {}, totalKills: 0, crafted: 0 }, state.stats);
        state.achievements = state.achievements || {};
        state.world = Object.assign({ visited: {}, exploreCounts: {}, eventCounts: {}, flags: {}, ending: null, deaths: 0 }, state.world);
        h.hp = Util.clamp(Math.round(h.hp) || 1, 1, 9999);
        return state;
    },

    loadSlot(slot) {
        const record = Store.readSlot(slot);
        if (!record) return false;
        try {
            Game.state = Game.sanitize(Util.clone(record.state));
        } catch (e) {
            console.warn('Could not load save:', e.message);
            return false;
        }
        Game.world = Game.state.world;
        Game.state.hero.hp = Math.min(Game.state.hero.hp, Hero.maxHp());
        Combat.active = null;
        Quests.refresh();
        return true;
    },

    saveSlot(slot) {
        if (!Game.state || Combat.active) return false;
        try {
            Store.writeSlot(slot, Game.state);
            Store.saveMeta(Game.meta);
            Bus.emit('saved', slot);
            return true;
        } catch (e) {
            console.warn('Save failed:', e.message);
            Bus.emit('toast', { msg: 'Saving failed. Your browser storage may be full or blocked.', type: 'error' });
            return false;
        }
    },

    requestAutosave() {
        if (!Game.settings.autoSave || !Game.state) return;
        clearTimeout(Game.autosaveTimer);
        Game.autosaveTimer = setTimeout(() => Game.saveSlot('auto'), 300);
    },

    tick() {
        if (!Game.state) return;
        Game.state.playSeconds += 1;
        Game.meta.playSeconds += 1;
        if (Game.meta.playSeconds % 30 === 0) Store.saveMeta(Game.meta);
    }
};

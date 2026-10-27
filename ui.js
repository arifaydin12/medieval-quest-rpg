/* =============================================================================
   Medieval Quest - UI toolkit
   Modal manager, toasts and HTML builders for every screen. Builders return
   strings; user-provided text is always escaped with Util.escape.
   ============================================================================= */
'use strict';

const esc = Util.escape;
const ImageCache = new Set();

/* ---------------------------------------------------------------------------
   Modal manager (focus trap, Escape to close, focus restore)
   --------------------------------------------------------------------------- */

const Modal = {
    stack: [],
    FOCUSABLE: 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',

    open({ id, title, body, size = 'md', closable = true, className = '', onClose = null, noHeader = false }) {
        if (Modal.get(id)) Modal.close(id, true);
        const root = document.getElementById('modal-root');
        const overlay = document.createElement('div');
        overlay.className = `modal-overlay ${className}`;
        overlay.dataset.modal = id;
        overlay.innerHTML = `
            <div class="modal modal-${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title-${id}" tabindex="-1">
                ${noHeader ? '' : `<header class="modal-header">
                    <h2 id="modal-title-${id}" class="font-title">${title}</h2>
                    ${closable ? '<button class="icon-btn" data-action="close-modal" aria-label="Close dialog">✕</button>' : ''}
                </header>`}
                <div class="modal-body">${body}</div>
            </div>`;
        if (noHeader) overlay.querySelector('.modal').setAttribute('aria-label', title);
        const entry = { id, overlay, closable, onClose, opener: document.activeElement };
        Modal.stack.push(entry);
        root.appendChild(overlay);
        if (closable) {
            overlay.addEventListener('mousedown', e => { if (e.target === overlay) Modal.close(id); });
        }
        Modal.focusFirst(entry);
        audio.play('open');
        return entry;
    },

    get(id) { return Modal.stack.find(m => m.id === id) || null; },
    top() { return Modal.stack[Modal.stack.length - 1] || null; },
    isOpen(id) { return !!Modal.get(id); },
    anyOpen() { return Modal.stack.length > 0; },

    /** Replace the body of an open modal (keeps the dialog and focus). */
    update(id, body, title) {
        const entry = Modal.get(id);
        if (!entry) return;
        const modal = entry.overlay.querySelector('.modal-body');
        const scroll = modal.scrollTop;
        const active = document.activeElement;
        const focusKey = active && entry.overlay.contains(active) ? active.dataset.focusKey : null;
        modal.innerHTML = body;
        modal.scrollTop = scroll;
        if (title) entry.overlay.querySelector('.modal-header h2').innerHTML = title;
        if (focusKey) {
            const again = entry.overlay.querySelector(`[data-focus-key="${focusKey}"]`);
            if (again && !again.disabled) again.focus();
            else Modal.focusFirst(entry, false);
        }
    },

    focusFirst(entry, preferBody = true) {
        const modal = entry.overlay.querySelector('.modal');
        const target = modal.querySelector('[data-autofocus]')
            || (preferBody ? modal.querySelector('.modal-body ' + Modal.FOCUSABLE.split(', ').join(', .modal-body ')) : null)
            || modal.querySelector(Modal.FOCUSABLE) || modal;
        target.focus({ preventScroll: true });
    },

    close(id, silent = false) {
        const idx = Modal.stack.findIndex(m => m.id === id);
        if (idx < 0) return;
        const [entry] = Modal.stack.splice(idx, 1);
        entry.overlay.remove();
        if (!silent && entry.onClose) entry.onClose();
        const next = Modal.top();
        if (next) {
            Modal.focusFirst(next);
        } else if (!silent) {
            const opener = entry.opener;
            if (opener && document.body.contains(opener)) opener.focus({ preventScroll: true });
            else {
                const fallback = document.querySelector('[data-focus-fallback]');
                if (fallback) fallback.focus({ preventScroll: true });
            }
        }
    },

    closeAll() {
        while (Modal.stack.length) Modal.close(Modal.top().id, true);
    },

    onKeydown(e) {
        const top = Modal.top();
        if (!top) return false;
        if (e.key === 'Escape' && top.closable) {
            e.preventDefault();
            Modal.close(top.id);
            return true;
        }
        if (e.key === 'Tab') {
            const nodes = [...top.overlay.querySelectorAll(Modal.FOCUSABLE)].filter(n => n.offsetParent !== null);
            if (!nodes.length) { e.preventDefault(); return true; }
            const first = nodes[0], last = nodes[nodes.length - 1];
            if (e.shiftKey && (document.activeElement === first || document.activeElement === top.overlay.querySelector('.modal'))) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
            return true;
        }
        return false;
    }
};

/* ---------------------------------------------------------------------------
   Toasts
   --------------------------------------------------------------------------- */

const Toast = {
    show(msg, type = 'info') {
        const root = document.getElementById('toast-root');
        if (!root) return;
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        const icons = { success: '✔', error: '⚠', quest: '📜', achievement: '🏆', info: 'ℹ', levelup: '⭐' };
        el.innerHTML = `<span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span><span>${esc(msg)}</span>`;
        root.appendChild(el);
        while (root.children.length > 3) root.firstChild.remove();
        setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 300); }, 3800);
    }
};

/* ---------------------------------------------------------------------------
   Small builders
   --------------------------------------------------------------------------- */

const View = {
    gold(n) { return `<span class="gold">${n}<span class="coin" aria-hidden="true">●</span><span class="sr-only"> gold</span></span>`; },

    itemIcon(item, cls = '') {
        if (item.image) return `<span class="item-icon has-img ${cls} rarity-${item.rarity}"><img src="${item.image}" alt="" loading="lazy" width="48" height="48"></span>`;
        return `<span class="item-icon ${cls} rarity-${item.rarity}" aria-hidden="true">${item.icon}</span>`;
    },

    statLine(item) {
        const parts = [];
        if (item.type === 'weapon') parts.push(`Damage ${item.damage[0]}-${item.damage[1]}`, `Scales with ${DATA.STATS[item.scale].short}`);
        if (item.armor) parts.push(`Armour ${item.armor}`);
        if (item.bonus) parts.push(Object.keys(item.bonus).map(k => `+${item.bonus[k]} ${DATA.STATS[k].short}`).join(', '));
        if (item.req) parts.push('Needs ' + Object.keys(item.req).map(k => `${DATA.STATS[k].short} ${item.req[k]}`).join(', '));
        return parts.join(' · ');
    },

    bar(label, value, max, cls) {
        const pct = max > 0 ? Math.round(Util.clamp(value / max, 0, 1) * 100) : 0;
        return `<div class="bar ${cls}" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}">
            <div class="bar-fill" style="width:${pct}%"></div>
            <span class="bar-text">${label} ${value}/${max}</span>
        </div>`;
    },

    clockText() {
        const c = World.clock();
        return `Day ${c.day} · ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')} · ${c.period}`;
    },

    emptyState(icon, title, text) {
        return `<div class="empty-state"><div class="empty-icon" aria-hidden="true">${icon}</div><h3>${title}</h3><p>${text}</p></div>`;
    },

    objectiveLine(questId, index) {
        const obj = DATA.quests[questId].objectives[index];
        const need = Quests.objectiveNeeded(obj);
        const have = Quests.objectiveProgress(questId, index);
        const done = have >= need;
        const progress = need > 1 ? ` <span class="obj-count">${have}/${need}</span>` : '';
        return `<li class="${done ? 'done' : ''}"><span class="check" aria-hidden="true">${done ? '✔' : '○'}</span><span>${esc(obj.text)}${progress}<span class="sr-only">${done ? ' (done)' : ''}</span></span></li>`;
    },

    rewardLine(reward) {
        const parts = [];
        if (reward.xp) parts.push(`${reward.xp} XP`);
        if (reward.gold) parts.push(`${reward.gold} gold`);
        (reward.items || []).forEach(([id, qty]) => parts.push(`${DATA.items[id].name}${qty > 1 ? ' ×' + qty : ''}`));
        return parts.join(' · ');
    }
};

/* ---------------------------------------------------------------------------
   Game screen builders
   --------------------------------------------------------------------------- */

const Screens = {
    topbar() {
        const hero = Game.state.hero;
        const unspent = hero.points > 0 ? `<span class="badge" aria-label="${hero.points} unspent points">${hero.points}</span>` : '';
        const btn = (action, icon, label, key) =>
            `<button class="top-btn" data-action="${action}" aria-label="${label}${key ? ' (' + key + ')' : ''}" title="${label}${key ? ' (' + key + ')' : ''}"><span aria-hidden="true">${icon}</span><span class="top-btn-label">${label}</span></button>`;
        return `
            <div class="brand font-title" aria-hidden="true"><span class="brand-mark">⚜</span> Medieval Quest</div>
            <div class="hud-chips">
                <div class="hud-chip" title="Gold"><span aria-hidden="true">🪙</span> <b>${hero.gold}</b><span class="sr-only"> gold</span></div>
                <div class="hud-chip hud-time" title="Time of day"><span aria-hidden="true">🕒</span> ${View.clockText()}</div>
            </div>
            <div class="top-actions">
                ${btn('open-map', '🗺️', 'Map', 'M')}
                <button class="top-btn" data-action="open-inventory" aria-label="Inventory (I)" title="Inventory (I)"><span aria-hidden="true">🎒</span><span class="top-btn-label">Bag</span></button>
                ${btn('open-craft', '⚒️', 'Craft', 'K')}
                ${btn('open-journal', '📖', 'Journal', 'J')}
                <button class="top-btn" data-action="open-character" aria-label="Character (C)${hero.points ? ', ' + hero.points + ' points to spend' : ''}" title="Character (C)"><span aria-hidden="true">🧙</span><span class="top-btn-label">Hero</span>${unspent}</button>
                ${btn('open-save', '💾', 'Save', 'S')}
                <button class="top-btn" data-action="toggle-mute" aria-label="Sound" aria-pressed="${audio.muted}" title="Toggle sound"><span aria-hidden="true">${audio.muted ? '🔇' : '🔊'}</span></button>
                ${btn('open-menu', '☰', 'Menu', '')}
            </div>`;
    },

    heroPanel() {
        const hero = Game.state.hero;
        const attrs = Hero.attrs();
        const race = DATA.races[hero.race], cls = DATA.classes[hero.cls];
        const next = Hero.xpToNext();
        const xpFloor = Hero.xpForLevel(hero.level);
        const weapon = Hero.weapon();
        const slots = Object.keys(DATA.EQUIPMENT_SLOTS).map(slot => {
            const id = hero.equipment[slot];
            const item = id && DATA.items[id];
            return `<div class="mini-slot" title="${item ? esc(item.name) : DATA.EQUIPMENT_SLOTS[slot].name + ' (empty)'}">${item ? View.itemIcon(item, 'sm') : `<span class="slot-empty" aria-hidden="true">${DATA.EQUIPMENT_SLOTS[slot].icon}</span>`}<span class="sr-only">${DATA.EQUIPMENT_SLOTS[slot].name}: ${item ? esc(item.name) : 'empty'}</span></div>`;
        }).join('');
        const attrRows = Object.keys(DATA.STATS).map(k => {
            const base = hero.attrs[k], total = attrs[k];
            return `<li><span title="${DATA.STATS[k].name}">${DATA.STATS[k].short}</span><b class="${total > base ? 'buffed' : ''}">${total}</b></li>`;
        }).join('');
        return `
            <div class="hero-card">
                <div class="medallion" aria-hidden="true">${cls.icon}</div>
                <div class="hero-id">
                    <h2 class="font-title hero-name">${esc(hero.name)}</h2>
                    <p class="hero-sub">Level ${hero.level} ${race.name} ${cls.name}</p>
                </div>
            </div>
            ${View.bar('Health', hero.hp, Hero.maxHp(), 'bar-hp')}
            ${next ? View.bar('Experience', hero.xp - xpFloor, next - xpFloor, 'bar-xp') : '<div class="max-level">Maximum level reached</div>'}
            <ul class="attr-list" aria-label="Attributes">${attrRows}</ul>
            <dl class="derived">
                <div><dt>Armour</dt><dd>${Hero.armor()}</dd></div>
                <div><dt>Weapon</dt><dd>${weapon.damage[0]}-${weapon.damage[1]}</dd></div>
                <div><dt>Crit</dt><dd>${Math.round(Hero.critChance() * 100)}%</dd></div>
            </dl>
            <div class="mini-slots" aria-label="Equipment">${slots}</div>
            ${hero.points > 0 ? `<button class="btn btn-gold btn-block" data-action="open-character">★ ${hero.points} attribute point${hero.points > 1 ? 's' : ''} to spend</button>` : ''}`;
    },

    questTracker() {
        const open = Object.keys(Game.state.quests).filter(id => Quests.isOpen(id));
        open.sort((a, b) => (DATA.quests[a].type === 'main' ? 0 : 1) - (DATA.quests[b].type === 'main' ? 0 : 1));
        if (!open.length) return View.emptyState('📜', 'No active quests', 'Speak with the people of Aethelgard to find work.');
        return open.map(id => {
            const q = DATA.quests[id];
            const ready = Quests.status(id) === 'ready';
            return `<article class="tracker-quest ${q.type}">
                <h4><span class="tag tag-${q.type}">${q.type === 'main' ? 'Main' : 'Side'}</span> ${esc(q.title)}</h4>
                ${ready ? `<p class="ready-note">Ready to turn in with ${esc(DATA.npcs[q.turnIn].name)}.</p>`
                    : `<ul class="objectives">${q.objectives.map((o, i) => View.objectiveLine(id, i)).join('')}</ul>`}
            </article>`;
        }).join('');
    },

    chronicle() {
        const entries = Game.state.log.slice(-14).reverse();
        if (!entries.length) return View.emptyState('🕯️', 'The chronicle is blank', 'Your deeds will be written here.');
        return `<ol class="log-list">${entries.map(e => {
            const day = Math.floor(e.t / 1440) + 1;
            const hh = String(Math.floor((e.t % 1440) / 60)).padStart(2, '0');
            const mm = String(e.t % 60).padStart(2, '0');
            return `<li class="log-${e.type}"><time>D${day} ${hh}:${mm}</time> ${esc(e.msg)}</li>`;
        }).join('')}</ol>`;
    },

    npcMarker(npcId) {
        if (Quests.readyAt(npcId).length) return { mark: '?', label: 'Quest ready to turn in', cls: 'ready' };
        if (Quests.offeredBy(npcId).length) return { mark: '!', label: 'Has a quest for you', cls: 'offer' };
        const awaited = Object.keys(Game.state.quests).some(id => Quests.isActive(id)
            && DATA.quests[id].objectives.some((o, i) => o.type === 'talk' && o.npc === npcId && !Quests.objectiveDone(id, i)));
        if (awaited) return { mark: '!', label: 'Is expecting you', cls: 'offer' };
        return null;
    },

    actionMeta(action) {
        if (action.type === 'rest') return `${World.restCost()} gold · ${action.hours}h`;
        if (action.type === 'camp') return `${action.hours}h · heal 40%`;
        if (action.type === 'craft') return 'Workshop';
        if (action.type === 'shop') return 'Buy and sell';
        if (action.hours) return `${action.hours}h`;
        return '';
    },

    scene() {
        const world = Game.state.world;
        const loc = DATA.locations[world.location];
        const night = World.isNight();
        const npcCards = (loc.npcs || []).map(id => {
            const npc = DATA.npcs[id];
            const marker = Screens.npcMarker(id);
            const portrait = npc.portrait
                ? `<img src="${npc.portrait}" alt="" width="64" height="64">`
                : `<span class="npc-emoji" aria-hidden="true">${npc.icon}</span>`;
            return `<button class="npc-card" data-action="talk" data-npc="${id}" aria-label="Talk to ${esc(npc.name)}${marker ? ' (' + marker.label + ')' : ''}">
                <span class="npc-portrait">${portrait}</span>
                <span class="npc-text"><b>${esc(npc.name)}</b><small>${esc(npc.title)}</small></span>
                ${marker ? `<span class="npc-marker ${marker.cls}" aria-hidden="true">${marker.mark}</span>` : ''}
            </button>`;
        }).join('');

        const actions = loc.actions.filter(a => a.type !== 'talk').map(a => {
            let disabled = false, hint = Screens.actionMeta(a), icon = a.icon;
            const defaults = { shop: '🛒', rest: '🛏️', camp: '⛺', forage: '🌿', fight: '⚔️', explore: '🧭', boss: '💀' };
            if (a.type === 'craft') icon = DATA.STATIONS[a.id === 'forge' ? 'forge' : 'alchemy'].icon;
            icon = icon || defaults[a.type] || '⚡';
            if (a.type === 'boss') {
                const req = World.questRequirementMet(a);
                if (req.hidden) return '';
                if (!req.ok) { disabled = true; hint = req.reason; }
            }
            if (a.type === 'rest' && Game.state.hero.gold < World.restCost()) { hint = `${World.restCost()} gold (you cannot afford it)`; disabled = true; }
            return `<button class="action-btn ${a.type === 'boss' ? 'danger' : ''}" data-action="location-action" data-id="${a.id}" ${disabled ? 'disabled' : ''}>
                <span class="action-icon" aria-hidden="true">${icon}</span>
                <span class="action-text"><b>${esc(a.label)}</b><small>${esc(hint)}</small></span>
            </button>`;
        }).join('');

        const wildNote = loc.region === 'wild'
            ? `<p class="scene-warning" role="note">⚠ Wilderness: enemies may attack at any time${night ? '. It is night, and they hit harder in the dark' : ''}.</p>` : '';

        return `
            <div class="scene-hero">
                <div class="skeleton" aria-hidden="true"></div>
                <img class="scene-img ${ImageCache.has(loc.image) ? 'loaded' : ''}" src="${loc.image}" alt="" onload="ImageCache.add('${loc.image}');this.classList.add('loaded')" onerror="this.classList.add('loaded')">
                <div class="scene-shade ${night ? 'night' : ''}"></div>
                <div class="scene-title">
                    <span class="scene-kicker">${loc.region === 'city' ? 'Aethelgard' : 'The Wilds'} · ${World.clock().period}</span>
                    <h1 class="font-title" tabindex="-1" data-focus-fallback>${loc.icon} ${esc(loc.name)}</h1>
                </div>
            </div>
            <p class="scene-desc">${esc(loc.description)}</p>
            ${wildNote}
            ${npcCards ? `<h3 class="section-label">People</h3><div class="npc-row">${npcCards}</div>` : ''}
            <h3 class="section-label">What will you do?</h3>
            <div class="action-grid">${actions}
                <button class="action-btn travel" data-action="open-map"><span class="action-icon" aria-hidden="true">🗺️</span><span class="action-text"><b>Travel</b><small>Open the world map</small></span></button>
            </div>`;
    },

    /* ---- Character creation ---- */

    creationSteps(step) {
        const names = ['Name & Race', 'Class', 'Background', 'Review'];
        return `<ol class="steps" aria-label="Progress">${names.map((n, i) =>
            `<li class="${i + 1 === step ? 'current' : ''} ${i + 1 < step ? 'done' : ''}" ${i + 1 === step ? 'aria-current="step"' : ''}><span class="step-num">${i + 1}</span><span class="step-name">${n}</span></li>`).join('')}</ol>`;
    },

    previewAttrs(choice) {
        const r = DATA.races[choice.race], c = DATA.classes[choice.cls], b = DATA.backgrounds[choice.background];
        const attrs = {};
        Object.keys(DATA.STATS).forEach(k => { attrs[k] = DATA.BASE_ATTRIBUTE + (r.stats[k] || 0) + (c.stats[k] || 0) + (b.stats[k] || 0); });
        const hp = 12 + attrs.con * 2 + 5 + c.hp;
        const mods = { armor: 0, energy: 0 };
        [r.mods, b.mods].forEach(m => Object.keys(m || {}).forEach(k => { mods[k] = (mods[k] || 0) + m[k]; }));
        const weapon = DATA.items[c.start.weapon];
        const startArmor = ['head', 'chest'].reduce((sum, s) => sum + (c.start[s] ? (DATA.items[c.start[s]].armor || 0) : 0), 0) + mods.armor;
        return { attrs, hp, energy: c.energy + (mods.energy || 0) + Math.floor(attrs.int / 4), armor: startArmor, weapon, gold: b.gold };
    },

    optionCard(group, id, icon, name, desc, extra, selected) {
        return `<button type="button" class="option-card ${selected ? 'selected' : ''}" role="radio" aria-checked="${selected}" data-action="pick-${group}" data-id="${id}" data-focus-key="${group}-${id}">
            <span class="option-icon" aria-hidden="true">${icon}</span>
            <span class="option-body"><b class="font-title">${name}</b><span>${desc}</span>${extra ? `<em>${extra}</em>` : ''}</span>
        </button>`;
    },

    creationStep(step, choice, error) {
        let body = '';
        if (step === 1) {
            body = `
                <div class="form-row">
                    <label for="hero-name">Your name</label>
                    <div class="input-row">
                        <input id="hero-name" type="text" maxlength="20" autocomplete="off" spellcheck="false" placeholder="e.g. Eira Stormwind" value="${esc(choice.name)}" data-autofocus ${error ? 'aria-invalid="true" aria-describedby="name-error"' : ''}>
                        <button type="button" class="btn btn-ghost" data-action="random-name">🎲 Random</button>
                    </div>
                    <p id="name-error" class="form-error" role="alert">${error ? esc(error) : ''}</p>
                </div>
                <h3 class="section-label">Choose your people</h3>
                <div class="option-grid" role="radiogroup" aria-label="Race">
                    ${Object.values(DATA.races).map(r => Screens.optionCard('race', r.id, r.icon, r.name, r.description,
                        `${Object.keys(r.stats).map(k => `${r.stats[k] > 0 ? '+' : ''}${r.stats[k]} ${DATA.STATS[k].short}`).join(', ')} · ${r.trait.name}: ${r.trait.text}`, choice.race === r.id)).join('')}
                </div>`;
        } else if (step === 2) {
            body = `<h3 class="section-label">Choose your calling</h3>
                <div class="option-grid" role="radiogroup" aria-label="Class">
                    ${Object.values(DATA.classes).map(c => Screens.optionCard('cls', c.id, c.icon, c.name, c.description,
                        `${c.ability.name} (${c.ability.cost} energy): ${c.ability.text}`, choice.cls === c.id)).join('')}
                </div>`;
        } else if (step === 3) {
            body = `<h3 class="section-label">Where did you come from?</h3>
                <div class="option-grid" role="radiogroup" aria-label="Background">
                    ${Object.values(DATA.backgrounds).map(b => Screens.optionCard('background', b.id, b.icon, b.name, b.description,
                        `${b.perk.name}: ${b.perk.text} · ${b.gold} starting gold`, choice.background === b.id)).join('')}
                </div>`;
        } else {
            const r = DATA.races[choice.race], c = DATA.classes[choice.cls], b = DATA.backgrounds[choice.background];
            const p = Screens.previewAttrs(choice);
            body = `
                <div class="review-card">
                    <div class="medallion big" aria-hidden="true">${c.icon}</div>
                    <div>
                        <h3 class="font-title">${esc(choice.name)}</h3>
                        <p>${r.name} ${c.name}, ${b.name.toLowerCase()}</p>
                        <p class="muted">${r.trait.name}: ${r.trait.text}<br>${b.perk.name}: ${b.perk.text}<br>${c.ability.name}: ${c.ability.text}</p>
                    </div>
                </div>
                <p class="muted review-gear">Starting gear: ${esc(p.weapon.name)}${c.start.chest ? ', ' + esc(DATA.items[c.start.chest].name) : ''}${c.start.head ? ', ' + esc(DATA.items[c.start.head].name) : ''}, and ${p.gold} gold.</p>`;
        }
        return body;
    },

    creationPreview(choice) {
        const p = Screens.previewAttrs(choice);
        const rows = Object.keys(DATA.STATS).map(k => `<li><span><span class="long">${DATA.STATS[k].name}</span><span class="short">${DATA.STATS[k].short}</span></span><b>${p.attrs[k]}</b></li>`).join('');
        return `<h3 class="section-label">Your hero</h3>
            <div class="preview-head"><span class="medallion" aria-hidden="true">${DATA.classes[choice.cls].icon}</span>
                <div><b>${esc(choice.name || 'Unnamed hero')}</b><small>${DATA.races[choice.race].name} ${DATA.classes[choice.cls].name}</small></div></div>
            <ul class="preview-attrs">${rows}</ul>
            <dl class="derived">
                <div><dt>Health</dt><dd>${p.hp}</dd></div>
                <div><dt>Energy</dt><dd>${p.energy}</dd></div>
                <div><dt>Armour</dt><dd>${p.armor}</dd></div>
            </dl>
            <p class="muted small">Every level gives ${DATA.POINTS_PER_LEVEL} attribute points to spend as you please.</p>`;
    },

    /* ---- Inventory and character ---- */

    inventory(filter = 'all') {
        const hero = Game.state.hero;
        const slots = Object.keys(DATA.EQUIPMENT_SLOTS).map(slot => {
            const id = hero.equipment[slot];
            const item = id && DATA.items[id];
            return `<li class="equip-slot ${item ? '' : 'empty'}">
                <span class="slot-name">${DATA.EQUIPMENT_SLOTS[slot].icon} ${DATA.EQUIPMENT_SLOTS[slot].name}</span>
                ${item ? `<div class="equip-item">${View.itemIcon(item)}<span class="item-info"><b class="rarity-text-${item.rarity}">${esc(item.name)}</b><small>${View.statLine(item)}</small></span>
                    <button class="btn btn-small" data-action="unequip" data-slot="${slot}" data-focus-key="unequip-${slot}">Unequip</button></div>`
                    : '<span class="muted">Nothing equipped</span>'}
            </li>`;
        }).join('');

        const groups = {
            all: () => true,
            gear: i => ['weapon', 'armor', 'trinket'].includes(i.type),
            consumable: i => i.type === 'consumable',
            materials: i => i.type === 'material' || i.type === 'junk',
            quest: i => i.type === 'quest'
        };
        const filterNames = { all: 'All', gear: 'Gear', consumable: 'Consumables', materials: 'Materials', quest: 'Quest' };
        const entries = Bag.list().filter(e => groups[filter](e.item));
        const tabs = Object.keys(filterNames).map(f => `<button class="chip ${f === filter ? 'active' : ''}" data-action="inv-filter" data-filter="${f}" aria-pressed="${f === filter}">${filterNames[f]}</button>`).join('');

        const rows = entries.map(({ item, qty }) => {
            let buttons = '';
            if (item.type === 'weapon' || item.type === 'armor' || item.type === 'trinket') {
                const req = Hero.meetsRequirements(item);
                buttons = `<button class="btn btn-small ${req.ok ? '' : 'btn-muted'}" data-action="equip" data-id="${item.id}" data-focus-key="equip-${item.id}" ${req.ok ? '' : `title="Needs ${req.missing.join(', ')}"`}>Equip${req.ok ? '' : ` (${req.missing.join(', ')})`}</button>`;
            } else if (item.type === 'consumable' && !item.combatOnly && item.effect.heal) {
                buttons = `<button class="btn btn-small" data-action="use-item" data-id="${item.id}" data-focus-key="use-${item.id}">Use</button>`;
            }
            return `<li class="bag-row">
                ${View.itemIcon(item)}
                <span class="item-info"><b class="rarity-text-${item.rarity}">${esc(item.name)}${qty > 1 ? ` <span class="qty">×${qty}</span>` : ''}</b>
                <small>${View.statLine(item) || esc(item.desc)}</small>
                ${View.statLine(item) ? `<small class="muted">${esc(item.desc)}</small>` : ''}</span>
                <span class="row-actions">${buttons}</span>
            </li>`;
        }).join('');

        return `<div class="inventory-layout">
            <section aria-labelledby="equip-h"><h3 id="equip-h" class="section-label">Equipment</h3><ul class="equip-list">${slots}</ul>
                <dl class="derived tight">
                    <div><dt>Armour</dt><dd>${Hero.armor()}</dd></div>
                    <div><dt>Weapon</dt><dd>${Hero.weapon().damage[0]}-${Hero.weapon().damage[1]}</dd></div>
                    <div><dt>Gold</dt><dd>${hero.gold}</dd></div>
                </dl></section>
            <section aria-labelledby="bag-h"><h3 id="bag-h" class="section-label">Backpack</h3>
                <div class="chips" role="group" aria-label="Filter items">${tabs}</div>
                ${rows ? `<ul class="bag-list">${rows}</ul>` : View.emptyState('🎒', 'Nothing here', filter === 'all' ? 'Your pack is empty. Visit a merchant or explore.' : 'No items in this category.')}
            </section></div>`;
    },

    character() {
        const hero = Game.state.hero;
        const attrs = Hero.attrs();
        const race = DATA.races[hero.race], cls = DATA.classes[hero.cls], bg = DATA.backgrounds[hero.background];
        const next = Hero.xpToNext();
        const rows = Object.keys(DATA.STATS).map(k => `<li class="attr-row">
            <span class="attr-name"><b>${DATA.STATS[k].name}</b><small>${DATA.STATS[k].hint}</small></span>
            <span class="attr-value">${attrs[k]}${attrs[k] > hero.attrs[k] ? `<small class="buffed"> (+${attrs[k] - hero.attrs[k]} gear)</small>` : ''}</span>
            <button class="icon-btn plus" data-action="spend-point" data-attr="${k}" data-focus-key="plus-${k}" aria-label="Increase ${DATA.STATS[k].name}" ${hero.points > 0 ? '' : 'disabled'}>+</button>
        </li>`).join('');
        const rep = Object.keys(DATA.FACTIONS).map(f => {
            const v = Rep.value(f);
            const pct = (v + 100) / 2;
            return `<li class="rep-row"><span><b>${DATA.FACTIONS[f].icon} ${DATA.FACTIONS[f].name}</b><small>${DATA.FACTIONS[f].description}</small></span>
                <span class="rep-meter" role="img" aria-label="${Rep.title(v)}, ${v}"><span class="rep-fill ${v < 0 ? 'neg' : 'pos'}" style="width:${pct}%"></span><span class="rep-mid"></span></span>
                <b class="rep-title">${Rep.title(v)} (${v})</b></li>`;
        }).join('');
        const achievements = Object.keys(DATA.achievements).map(id => {
            const a = DATA.achievements[id];
            const got = Game.state.achievements[id];
            return `<li class="ach ${got ? 'got' : ''}"><span class="ach-icon" aria-hidden="true">${got ? a.icon : '🔒'}</span><span class="ach-text"><b>${a.name}</b><small>${a.text}</small></span><span class="sr-only">${got ? 'Unlocked' : 'Locked'}</span></li>`;
        }).join('');
        const s = Game.state.stats;
        const mins = Math.floor(Game.state.playSeconds / 60);
        return `<div class="char-layout">
            <section>
                <div class="hero-card">
                    <div class="medallion big" aria-hidden="true">${cls.icon}</div>
                    <div class="hero-id"><h3 class="font-title">${esc(hero.name)}</h3>
                    <p>Level ${hero.level} ${race.name} ${cls.name}</p><p class="muted">${bg.name}</p></div>
                </div>
                ${next ? View.bar('Experience', hero.xp, next, 'bar-xp') : '<div class="max-level">Maximum level reached</div>'}
                ${View.bar('Health', hero.hp, Hero.maxHp(), 'bar-hp')}
                <h3 class="section-label">Attributes ${hero.points ? `<span class="points-badge">${hero.points} to spend</span>` : ''}</h3>
                <ul class="attr-table">${rows}</ul>
                <h3 class="section-label">Traits</h3>
                <ul class="trait-list"><li><b>${race.trait.name}</b> ${race.trait.text}</li><li><b>${bg.perk.name}</b> ${bg.perk.text}</li><li><b>${cls.ability.name}</b> ${cls.ability.text}</li></ul>
            </section>
            <section>
                <h3 class="section-label">Reputation</h3><ul class="rep-list">${rep}</ul>
                <h3 class="section-label">Achievements (${Object.keys(Game.state.achievements).length}/${Object.keys(DATA.achievements).length})</h3>
                <ul class="ach-list">${achievements}</ul>
                <h3 class="section-label">Chronicle</h3>
                <dl class="derived tight"><div><dt>Enemies slain</dt><dd>${s.totalKills}</dd></div><div><dt>Items crafted</dt><dd>${s.crafted}</dd></div><div><dt>Quests done</dt><dd>${Quests.completedCount()}</dd></div><div><dt>Time played</dt><dd>${mins}m</dd></div></dl>
            </section></div>`;
    },

    journal(tab = 'active') {
        const ids = Object.keys(Game.state.quests).filter(id => tab === 'active' ? Quests.isOpen(id) : Quests.isCompleted(id));
        ids.sort((a, b) => (DATA.quests[a].type === 'main' ? 0 : 1) - (DATA.quests[b].type === 'main' ? 0 : 1));
        const tabs = [['active', 'Active'], ['completed', 'Completed']].map(([k, n]) =>
            `<button class="tab ${k === tab ? 'active' : ''}" role="tab" aria-selected="${k === tab}" data-action="journal-tab" data-tab="${k}">${n}</button>`).join('');
        const cards = ids.map(id => {
            const q = DATA.quests[id];
            const entry = Quests.entry(id);
            const done = entry.state === 'completed';
            const choice = done && entry.choice && q.choices ? q.choices.find(c => c.id === entry.choice) : null;
            const turnIn = DATA.npcs[q.turnIn];
            const where = DATA.locations[turnIn.location].name;
            return `<article class="quest-card ${q.type}">
                <header><h3 class="font-title">${esc(q.title)}</h3><span class="tag tag-${q.type}">${q.type === 'main' ? 'Main story' : 'Side quest'}</span></header>
                <p class="quest-summary">${esc(q.summary)}</p>
                ${done ? `<p class="muted">Completed${choice ? ': ' + esc(choice.label) : ''}.</p>`
                    : `<ul class="objectives">${q.objectives.map((o, i) => View.objectiveLine(id, i)).join('')}</ul>
                    <p class="muted small">${entry.state === 'ready' ? '<b class="ready-note">Ready!</b> ' : ''}Turn in: ${esc(turnIn.name)}, ${esc(where)}.</p>`}
            </article>`;
        }).join('');
        return `<div class="tabs" role="tablist" aria-label="Quest status">${tabs}</div>
            <div class="quest-list" role="tabpanel">${cards || View.emptyState(tab === 'active' ? '📜' : '🏅', tab === 'active' ? 'No active quests' : 'Nothing completed yet', tab === 'active' ? 'Speak with the people of Aethelgard to find work.' : 'Finish a quest and it will be recorded here.')}</div>`;
    },

    map() {
        const world = Game.state.world;
        const cards = DATA.LOCATION_ORDER.map(id => {
            const loc = DATA.locations[id];
            const here = id === world.location;
            const hours = World.travelHours(world.location, id);
            const visited = world.visited[id];
            return `<li><button class="dest-card ${here ? 'here' : ''}" data-action="travel" data-id="${id}" data-focus-key="travel-${id}" ${here ? 'disabled aria-current="location"' : ''}>
                <span class="dest-icon" aria-hidden="true">${loc.icon}</span>
                <span class="dest-text"><b>${esc(loc.name)}</b><small>${esc(loc.summary)}</small></span>
                <span class="dest-meta">${here ? 'You are here' : `${hours}h`}${loc.region === 'wild' && !here ? '<span class="danger-tag">⚠ Danger</span>' : ''}${!visited ? '<span class="new-tag">New</span>' : ''}</span>
            </button></li>`;
        }).join('');
        return `<div class="map-layout">
            <figure class="map-figure"><img src="images/scenes/world-map.jpg" alt="Illustrated map of the kingdom of Aethelgard, showing Aethelgard city, the Grand Forge, Whispering Woods, Frostfang Peaks and the Serpent River" width="1600" height="873"><figcaption>The Kingdom of Aethelgard</figcaption></figure>
            <section><h3 class="section-label">Destinations</h3>
            <p class="muted small">Travel within the city takes an hour. The wilds are several hours away, and travellers may be ambushed on arrival${World.isNight() ? ' (especially at night)' : ''}.</p>
            <ul class="dest-list">${cards}</ul></section></div>`;
    },

    shop(shopId, tab = 'buy') {
        const shop = DATA.shops[shopId];
        const npc = DATA.npcs[shop.npc];
        const hero = Game.state.hero;
        const disc = Math.round(Economy.discount(shopId) * 100);
        const tabs = [['buy', 'Buy'], ['sell', 'Sell']].map(([k, n]) =>
            `<button class="tab ${k === tab ? 'active' : ''}" role="tab" aria-selected="${k === tab}" data-action="shop-tab" data-tab="${k}">${n}</button>`).join('');
        let rows = '';
        if (tab === 'buy') {
            rows = shop.stock.map(id => {
                const item = DATA.items[id];
                const price = Economy.buyPrice(id, shopId);
                const afford = hero.gold >= price;
                return `<li class="shop-row">${View.itemIcon(item)}
                    <span class="item-info"><b class="rarity-text-${item.rarity}">${esc(item.name)}</b><small>${View.statLine(item) || esc(item.desc)}</small>${View.statLine(item) ? `<small class="muted">${esc(item.desc)}</small>` : ''}
                    ${Bag.count(id) ? `<small class="owned">You own ${Bag.count(id)}</small>` : ''}</span>
                    <span class="row-actions"><span class="price ${afford ? '' : 'poor'}">${View.gold(price)}</span>
                    <button class="btn btn-small btn-gold" data-action="buy" data-id="${id}" data-focus-key="buy-${id}" ${afford ? '' : 'disabled'} aria-label="Buy ${esc(item.name)} for ${price} gold">Buy</button></span></li>`;
            }).join('');
        } else {
            const sellable = Bag.list().filter(e => Economy.sellable(e.item.id));
            rows = sellable.map(({ item, qty }) => {
                const price = Economy.sellPrice(item.id, shopId);
                return `<li class="shop-row">${View.itemIcon(item)}
                    <span class="item-info"><b class="rarity-text-${item.rarity}">${esc(item.name)}${qty > 1 ? ` <span class="qty">×${qty}</span>` : ''}</b><small>${View.statLine(item) || esc(item.desc)}</small></span>
                    <span class="row-actions"><span class="price">${View.gold(price)}</span>
                    <button class="btn btn-small" data-action="sell" data-id="${item.id}" data-focus-key="sell-${item.id}" aria-label="Sell ${esc(item.name)} for ${price} gold">Sell</button></span></li>`;
            }).join('');
            if (!rows) rows = `<li>${View.emptyState('💼', 'Nothing to sell', 'Quest items and equipped gear cannot be sold. Explore and fight to find loot.')}</li>`;
        }
        return `<div class="shop-head">
                ${npc.portrait ? `<img class="shop-portrait" src="${npc.portrait}" alt="" width="72" height="72">` : `<span class="medallion big" aria-hidden="true">${npc.icon}</span>`}
                <div class="shop-quote"><b>${esc(npc.name)}</b><p>${esc(shop.quote)}</p>${disc ? `<small class="buffed">Your standing earns you ${disc}% better prices.</small>` : ''}</div>
                <div class="shop-gold" aria-live="polite">${View.gold(hero.gold)}</div>
            </div>
            <div class="tabs" role="tablist" aria-label="Shop mode">${tabs}</div>
            <ul class="shop-list" role="tabpanel">${rows}</ul>`;
    },

    craft() {
        const stations = Crafting.stationsHere();
        const header = stations.length
            ? `<p class="station-note">Available here: ${stations.map(s => `${DATA.STATIONS[s].icon} ${DATA.STATIONS[s].name}`).join(', ')}.</p>`
            : `<p class="station-note warn">There is no workshop here. Visit the Grand Forge or an alchemy table.</p>`;
        const rows = Object.values(DATA.recipes).map(r => {
            const item = DATA.items[r.result];
            const status = Crafting.status(r.id);
            const mats = Object.keys(r.materials).map(id => {
                const have = Bag.count(id), need = r.materials[id];
                return `<span class="mat ${have >= need ? 'ok' : 'low'}">${DATA.items[id].icon} ${DATA.items[id].name} ${have}/${need}</span>`;
            }).join('');
            return `<li class="recipe ${status.ok ? '' : 'locked'}">${View.itemIcon(item)}
                <span class="item-info"><b class="rarity-text-${item.rarity}">${esc(item.name)}</b><small>${View.statLine(item) || esc(item.desc)}</small>
                <span class="mats">${mats}</span><small class="muted">${DATA.STATIONS[r.station].icon} ${DATA.STATIONS[r.station].name}</small></span>
                <span class="row-actions"><button class="btn btn-small btn-gold" data-action="craft" data-id="${r.id}" data-focus-key="craft-${r.id}" ${status.ok ? '' : 'disabled'}>${status.ok ? 'Craft' : esc(status.reason)}</button></span></li>`;
        }).join('');
        return `${header}<ul class="recipe-list">${rows}</ul>`;
    },

    saveSlots(mode) {
        const slots = Store.listSlots().filter(s => mode === 'load' || s.slot !== 'auto');
        return `<ul class="slot-list">${slots.map(({ slot, record }) => {
            const label = slot === 'auto' ? 'Autosave' : `Slot ${slot}`;
            if (!record) {
                return `<li class="slot empty"><div class="slot-info"><b>${label}</b><small>Empty</small></div>
                    ${mode === 'save' ? `<button class="btn btn-small btn-gold" data-action="save-slot" data-slot="${slot}" data-focus-key="slot-${slot}">Save here</button>` : ''}</li>`;
            }
            const s = record.summary;
            const when = new Date(record.savedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
            const locName = DATA.locations[s.location] ? DATA.locations[s.location].name : 'Unknown';
            const cls = DATA.classes[s.cls], race = DATA.races[s.race];
            return `<li class="slot"><span class="medallion" aria-hidden="true">${cls ? cls.icon : '?'}</span>
                <div class="slot-info"><b>${label}: ${esc(s.name)}</b>
                <small>Level ${s.level} ${race ? race.name : ''} ${cls ? cls.name : ''} · Day ${s.day} · ${esc(locName)}</small>
                <small class="muted">${when} · ${Math.floor(s.playSeconds / 60)} min played</small></div>
                <div class="slot-actions">
                    ${mode === 'save' ? `<button class="btn btn-small btn-gold" data-action="save-slot" data-slot="${slot}" data-focus-key="slot-${slot}">Overwrite</button>`
                        : `<button class="btn btn-small btn-gold" data-action="load-slot" data-slot="${slot}" data-focus-key="slot-${slot}">Load</button>`}
                    ${slot !== 'auto' ? `<button class="btn btn-small btn-danger" data-action="delete-slot" data-slot="${slot}" aria-label="Delete ${label}">Delete</button>` : ''}
                </div></li>`;
        }).join('')}</ul>`;
    },

    settings() {
        const s = Game.settings;
        const diffs = Object.keys(DATA.DIFFICULTY).map(k =>
            `<option value="${k}" ${s.difficulty === k ? 'selected' : ''}>${DATA.DIFFICULTY[k].name}</option>`).join('');
        return `<form class="settings-form" data-form="settings" onsubmit="return false">
            <div class="field"><label for="set-music">Music volume <output id="out-music">${Math.round(s.musicVolume * 100)}%</output></label>
                <input id="set-music" data-setting="musicVolume" type="range" min="0" max="1" step="0.05" value="${s.musicVolume}"></div>
            <div class="field"><label for="set-sfx">Effects volume <output id="out-sfx">${Math.round(s.sfxVolume * 100)}%</output></label>
                <input id="set-sfx" data-setting="sfxVolume" type="range" min="0" max="1" step="0.05" value="${s.sfxVolume}"></div>
            <div class="field"><label for="set-diff">Difficulty</label>
                <select id="set-diff" data-setting="difficulty">${diffs}</select>
                <small class="muted" id="diff-hint">${DATA.DIFFICULTY[s.difficulty].hint} Changes apply to the next fight.</small></div>
            <div class="field check"><input id="set-auto" data-setting="autoSave" type="checkbox" ${s.autoSave ? 'checked' : ''}><label for="set-auto">Autosave after important events</label></div>
            <div class="field check"><input id="set-motion" data-setting="reduceMotion" type="checkbox" ${s.reduceMotion ? 'checked' : ''}><label for="set-motion">Reduce motion (fewer animations)</label></div>
            <hr>
            <button type="button" class="btn btn-danger" data-action="erase-data">Erase all saves and settings</button>
        </form>`;
    },

    help() {
        return `<div class="help">
            <h3 class="section-label">How to play</h3>
            <ul>
                <li><b>Explore:</b> every location offers actions. Exploring, hunting and foraging take time and may start fights or events.</li>
                <li><b>Talk:</b> speak to people marked <span class="npc-marker offer inline">!</span> to take quests, and <span class="npc-marker ready inline">?</span> to hand them in.</li>
                <li><b>Fight:</b> combat is turn-based. Attack, use your class ability (costs energy), defend to halve damage and recover energy, use items or try to flee.</li>
                <li><b>Prepare:</b> buy and sell with merchants, craft at the Forge and alchemy tables, and equip better gear. Rest at the Serpent's Cup to heal.</li>
                <li><b>Save:</b> the game autosaves, and you can also save to three slots.</li>
            </ul>
            <h3 class="section-label">Keyboard</h3>
            <dl class="keys">
                <div><dt><kbd>M</kbd></dt><dd>Map</dd></div><div><dt><kbd>I</kbd></dt><dd>Inventory</dd></div>
                <div><dt><kbd>C</kbd></dt><dd>Character</dd></div><div><dt><kbd>J</kbd></dt><dd>Journal</dd></div>
                <div><dt><kbd>K</kbd></dt><dd>Crafting</dd></div><div><dt><kbd>S</kbd></dt><dd>Save</dd></div>
                <div><dt><kbd>1</kbd>-<kbd>5</kbd></dt><dd>Combat actions</dd></div><div><dt><kbd>Esc</kbd></dt><dd>Close window</dd></div>
            </dl></div>`;
    }
};

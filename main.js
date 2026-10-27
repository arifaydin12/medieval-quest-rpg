/* =============================================================================
   Medieval Quest - game controller
   Connects the rules (system.js) to the screens (ui.js): title screen,
   character creation, dialogue, shops, exploration events and combat.
   ============================================================================= */
'use strict';

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve => setTimeout(resolve, Game.settings.reduceMotion ? Math.min(ms, 120) : ms));

/* ---------------------------------------------------------------------------
   Rendering
   --------------------------------------------------------------------------- */

const Render = {
    last: {},
    scheduled: false,

    region(id, html) {
        const el = $(id);
        if (!el || Render.last[id] === html) return;
        const active = document.activeElement;
        const key = active && el.contains(active) ? `${active.dataset.action}|${active.dataset.id || active.dataset.npc || active.dataset.panel || ''}` : null;
        el.innerHTML = html;
        Render.last[id] = html;
        if (key) {
            const [action, id2] = key.split('|');
            const again = [...el.querySelectorAll('[data-action]')].find(n => n.dataset.action === action && (n.dataset.id || n.dataset.npc || n.dataset.panel || '') === id2);
            if (again && !again.disabled) again.focus({ preventScroll: true });
        }
    },

    all() {
        if (!Game.state || $('game').hidden) return;
        Render.region('topbar', Screens.topbar());
        Render.region('panel-hero', Screens.heroPanel());
        Render.region('panel-quests-body', Screens.questTracker());
        Render.region('panel-log-body', Screens.chronicle());
        Render.region('scene', Screens.scene());
        document.body.classList.toggle('night', World.isNight());
        Render.refreshOpenModals();
    },

    refreshOpenModals() {
        if (Modal.isOpen('inventory')) Modal.update('inventory', Screens.inventory(UIState.invFilter));
        if (Modal.isOpen('character')) Modal.update('character', Screens.character());
        if (Modal.isOpen('journal')) Modal.update('journal', Screens.journal(UIState.journalTab));
        if (Modal.isOpen('craft')) Modal.update('craft', Screens.craft());
    },

    schedule() {
        if (Render.scheduled) return;
        Render.scheduled = true;
        requestAnimationFrame(() => { Render.scheduled = false; Render.all(); });
    }
};

const UIState = { invFilter: 'all', journalTab: 'active', shop: null, dialogue: null, event: null, creation: null, panel: 'scene' };

/* ---------------------------------------------------------------------------
   Confirmation dialog
   --------------------------------------------------------------------------- */

function confirmDialog({ title, text, confirmLabel = 'Confirm', danger = false }) {
    return new Promise(resolve => {
        let settled = false;
        const finish = value => { if (!settled) { settled = true; resolve(value); } };
        Modal.open({
            id: 'confirm', title, size: 'sm',
            body: `<p>${esc(text)}</p><div class="modal-actions">
                <button class="btn" data-action="confirm-no" data-autofocus>Cancel</button>
                <button class="btn ${danger ? 'btn-danger' : 'btn-gold'}" data-action="confirm-yes">${esc(confirmLabel)}</button></div>`,
            onClose: () => finish(false)
        });
        UIState.confirmResolve = value => { finish(value); Modal.close('confirm', true); const t = Modal.top(); if (t) Modal.focusFirst(t); };
    });
}

/* ---------------------------------------------------------------------------
   Title screen
   --------------------------------------------------------------------------- */

const Title = {
    show() {
        Modal.closeAll();
        $('game').hidden = true;
        $('title-screen').hidden = false;
        document.body.dataset.screen = 'title';
        Game.state = null;
        Title.render();
        const first = $('title-screen').querySelector('[data-action="continue"]:not([disabled])') || $('title-screen').querySelector('[data-action="start-new"]');
        if (first) first.focus({ preventScroll: true });
    },

    render() {
        const latest = Store.latest();
        const btn = $('btn-continue');
        if (latest) {
            const s = latest.record.summary;
            btn.disabled = false;
            btn.innerHTML = `<span aria-hidden="true">⚔️</span> Continue<small>${esc(s.name)}, level ${s.level} · Day ${s.day}</small>`;
        } else {
            btn.disabled = true;
            btn.innerHTML = '<span aria-hidden="true">⚔️</span> Continue<small>No saved journey yet</small>';
        }
        const meta = Game.meta;
        const h = Math.floor(meta.playSeconds / 3600), m = Math.floor((meta.playSeconds % 3600) / 60);
        $('stat-playtime').textContent = h ? `${h}h ${m}m` : `${m}m`;
        $('stat-quests').textContent = meta.quests;
        $('stat-achievements').textContent = `${Achievements.count()}/${Object.keys(DATA.achievements).length}`;
    }
};

/* ---------------------------------------------------------------------------
   Character creation
   --------------------------------------------------------------------------- */

const RANDOM_NAMES = ['Aldwyn', 'Brenna', 'Cedric', 'Dara', 'Eira', 'Finnian', 'Gwen', 'Hadrian', 'Isolde', 'Joren', 'Kestrel', 'Lyra', 'Marek', 'Nessa', 'Osric', 'Petra', 'Rowan', 'Sigrid', 'Tamsin', 'Ulric', 'Vesper', 'Wulf', 'Yara'];

const Creation = {
    open() {
        UIState.creation = { step: 1, error: '', choice: { name: '', race: 'human', cls: 'knight', background: 'soldier' } };
        Modal.open({ id: 'creation', title: 'Create Your Hero', body: Creation.body(), size: 'lg', className: 'creation-overlay' });
    },
    body() {
        const { step, choice, error } = UIState.creation;
        const nav = `<div class="modal-actions creation-nav">
            ${step > 1 ? '<button class="btn" data-action="creation-back">← Back</button>' : '<span></span>'}
            ${step < 4 ? '<button class="btn btn-gold" data-action="creation-next" data-focus-key="creation-next">Next →</button>'
                : '<button class="btn btn-gold" data-action="creation-begin" data-focus-key="creation-begin">Begin your journey ⚔️</button>'}
        </div>`;
        return `${Screens.creationSteps(step)}
            <div class="creation-grid">
                <div class="creation-main">${Screens.creationStep(step, choice, error)}</div>
                <aside class="creation-preview" aria-label="Hero preview">${Screens.creationPreview(choice)}</aside>
            </div>${nav}`;
    },
    render() { Modal.update('creation', Creation.body()); },
    readName() {
        const input = $('hero-name');
        if (input) UIState.creation.choice.name = input.value;
    },
    validName(name) {
        const trimmed = name.replace(/\s+/g, ' ').trim();
        if (!trimmed) return { ok: false, error: 'Every hero needs a name.' };
        if (trimmed.length < 2) return { ok: false, error: 'Names need at least two letters.' };
        if (/[<>&"]/.test(trimmed)) return { ok: false, error: 'Please avoid the characters < > & ".' };
        return { ok: true, name: trimmed };
    },
    next() {
        Creation.readName();
        const state = UIState.creation;
        if (state.step === 1) {
            const v = Creation.validName(state.choice.name);
            if (!v.ok) {
                state.error = v.error;
                Creation.render();
                const input = $('hero-name');
                if (input) input.focus();
                return;
            }
            state.choice.name = v.name;
            state.error = '';
        }
        state.step = Math.min(4, state.step + 1);
        Creation.render();
        Creation.scrollTop();
    },
    back() { Creation.readName(); UIState.creation.step = Math.max(1, UIState.creation.step - 1); Creation.render(); Creation.scrollTop(); },
    scrollTop() { const body = document.querySelector('[data-modal="creation"] .modal-body'); if (body) body.scrollTop = 0; },
    begin() {
        const choice = UIState.creation.choice;
        Modal.close('creation', true);
        Game.newGame(choice);
        Prologue.start();
    }
};

/* ---------------------------------------------------------------------------
   Prologue and entering the game
   --------------------------------------------------------------------------- */

const Prologue = {
    page: 0,
    start() {
        Prologue.page = 0;
        Modal.open({ id: 'prologue', title: 'Prologue', body: Prologue.body(), size: 'md', closable: false, className: 'story-overlay', noHeader: true });
        Prologue.enterBackground();
    },
    enterBackground() { enterGame(false); },
    body() {
        const last = Prologue.page >= DATA.prologue.length - 1;
        return `<div class="story">
            <p class="story-kicker font-title">Prologue · ${Prologue.page + 1} of ${DATA.prologue.length}</p>
            <h2 id="modal-title-prologue" class="font-title">The Summons</h2>
            <p class="story-text">${esc(DATA.prologue[Prologue.page])}</p>
            <div class="modal-actions">
                <button class="btn btn-ghost" data-action="prologue-skip">Skip</button>
                <button class="btn btn-gold" data-action="prologue-next" data-autofocus>${last ? 'Enter Aethelgard' : 'Continue'}</button>
            </div></div>`;
    },
    next() {
        Prologue.page += 1;
        if (Prologue.page >= DATA.prologue.length) return Prologue.end();
        Modal.update('prologue', Prologue.body());
    },
    end() {
        Modal.close('prologue', true);
        Toast.show('Your first task: find Chancellor Aldric at the Royal Palace (Map, then The Royal Palace).', 'quest');
        const focus = document.querySelector('[data-focus-fallback]');
        if (focus) focus.focus({ preventScroll: true });
    }
};

function applySettings() {
    const s = Game.settings;
    document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
    audio.setVolumes(s.musicVolume, s.sfxVolume);
    if (s.musicVolume > 0 && Game.state && audio.ctx) audio.startMusic();
}

function enterGame() {
    audio.unlock();
    $('title-screen').hidden = true;
    $('game').hidden = false;
    document.body.dataset.screen = 'game';
    UIState.panel = 'scene';
    $('game').dataset.panel = 'scene';
    Render.last = {};
    applySettings();
    Render.all();
    updateTabbar();
}

/* ---------------------------------------------------------------------------
   Save / load
   --------------------------------------------------------------------------- */

const Saves = {
    openSave() {
        if (Combat.active) return Toast.show('You cannot save in the middle of a fight.', 'error');
        Modal.open({ id: 'save', title: 'Save Game', body: Screens.saveSlots('save'), size: 'md' });
    },
    openLoad() {
        Modal.open({ id: 'load', title: 'Load Game', body: Screens.saveSlots('load'), size: 'md' });
    },
    refresh(mode) { Modal.update(mode, Screens.saveSlots(mode)); },

    async saveTo(slot) {
        const existing = Store.readSlot(slot);
        if (existing) {
            const ok = await confirmDialog({ title: 'Overwrite save?', text: `Slot ${slot} contains ${existing.summary.name} (level ${existing.summary.level}). Overwrite it?`, confirmLabel: 'Overwrite', danger: true });
            if (!ok) return;
        }
        if (Game.saveSlot(slot)) {
            Toast.show(`Game saved to slot ${slot}.`, 'success');
            audio.play('success');
            Saves.refresh('save');
        }
    },

    load(slot) {
        if (!Game.loadSlot(slot)) {
            Toast.show('That save could not be loaded. It may be damaged.', 'error');
            audio.play('error');
            return;
        }
        Modal.closeAll();
        enterGame();
        Toast.show(`Welcome back, ${Game.state.hero.name}.`, 'success');
    },

    async remove(slot) {
        const ok = await confirmDialog({ title: 'Delete save?', text: `Slot ${slot} will be permanently deleted.`, confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        Store.deleteSlot(slot);
        const mode = Modal.isOpen('load') ? 'load' : 'save';
        Saves.refresh(mode);
        if (document.body.dataset.screen === 'title') Title.render();
        Toast.show('Save deleted.', 'info');
    }
};

/* ---------------------------------------------------------------------------
   Modals: map, inventory, character, journal, crafting, menu, settings, help
   --------------------------------------------------------------------------- */

const Windows = {
    map() { Modal.open({ id: 'map', title: 'World Map', body: Screens.map(), size: 'xl' }); },
    inventory() { Modal.open({ id: 'inventory', title: 'Inventory', body: Screens.inventory(UIState.invFilter), size: 'lg' }); },
    character() { Modal.open({ id: 'character', title: 'Character', body: Screens.character(), size: 'lg' }); },
    journal() { Modal.open({ id: 'journal', title: 'Quest Journal', body: Screens.journal(UIState.journalTab), size: 'lg' }); },
    craft() {
        const here = DATA.locations[Game.state.world.location];
        Modal.open({ id: 'craft', title: `Crafting · ${esc(here.name)}`, body: Screens.craft(), size: 'lg' });
    },
    settings() { Modal.open({ id: 'settings', title: 'Settings', body: Screens.settings(), size: 'sm' }); },
    help() { Modal.open({ id: 'help', title: 'How to Play', body: Screens.help(), size: 'md' }); },
    menu() {
        Modal.open({
            id: 'menu', title: 'Menu', size: 'sm',
            body: `<div class="menu-list">
                <button class="btn btn-block" data-action="open-map">🗺️ World Map</button>
                <button class="btn btn-block" data-action="open-inventory">🎒 Inventory</button>
                <button class="btn btn-block" data-action="open-craft">⚒️ Crafting</button>
                <button class="btn btn-block" data-action="open-journal">📖 Quest Journal</button>
                <button class="btn btn-block" data-action="open-character">🧙 Character</button>
                <hr>
                <button class="btn btn-block" data-action="open-save">💾 Save Game</button>
                <button class="btn btn-block" data-action="open-load">📂 Load Game</button>
                <button class="btn btn-block" data-action="open-settings">⚙️ Settings</button>
                <button class="btn btn-block" data-action="open-help">❓ How to Play</button>
                <hr>
                <button class="btn btn-block btn-danger" data-action="return-title">🏠 Return to Title</button>
            </div>`
        });
    }
};

async function returnToTitle() {
    if (Combat.active) return Toast.show('Finish the fight first!', 'error');
    const ok = await confirmDialog({ title: 'Return to title?', text: 'Your progress is autosaved. You can continue from the title screen.', confirmLabel: 'Return to title' });
    if (!ok) return;
    if (Game.settings.autoSave) Game.saveSlot('auto');
    audio.stopMusic();
    Title.show();
}

/* ---------------------------------------------------------------------------
   Events (exploration results, foraging, camping, ambushes)
   --------------------------------------------------------------------------- */

const Events = {
    /** Show an event. `event` is a data event (with or without choices) or a custom summary. */
    show({ title, text, event = null, resolved = null, onDone = null, icon = '📜' }) {
        UIState.event = { title, text, event, resolved, onDone, icon };
        Modal.open({ id: 'event', title: esc(title), body: Events.body(), size: 'md', closable: false, className: 'event-overlay' });
        Render.schedule();
    },
    body() {
        const e = UIState.event;
        const lines = e.resolved ? e.resolved.lines : [];
        const chips = lines.length ? `<ul class="reward-chips" aria-label="Results">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : '';
        let actions;
        if (e.event && e.event.choices && !e.resolved) {
            actions = `<div class="choice-list">${e.event.choices.map((c, i) => {
                const a = World.choiceAvailable(c);
                return `<button class="btn btn-block choice-btn" data-action="event-choice" data-index="${i}" data-focus-key="choice-${i}" ${a.ok ? '' : 'disabled'}>${esc(c.label)}${a.ok ? '' : `<small>${esc(a.reason)}</small>`}</button>`;
            }).join('')}</div>`;
        } else {
            const fight = e.resolved && e.resolved.fight;
            actions = `<div class="modal-actions"><button class="btn btn-gold" data-action="event-continue" data-autofocus>${fight ? 'Draw your weapon ⚔️' : 'Continue'}</button></div>`;
        }
        const text = e.resolved ? e.resolved.text : e.text;
        return `<div class="event"><div class="event-icon" aria-hidden="true">${e.icon}</div><p class="event-text">${esc(text)}</p>${chips}${actions}</div>`;
    },
    choose(index) {
        const e = UIState.event;
        const resolved = World.resolveEvent(e.event, index);
        if (!resolved) return;
        e.resolved = resolved;
        Game.log(resolved.text, 'event');
        Game.requestAutosave();
        Modal.update('event', Events.body());
        const btn = document.querySelector('#modal-root [data-action="event-continue"]');
        if (btn) btn.focus();
    },
    done() {
        const e = UIState.event;
        Modal.close('event', true);
        UIState.event = null;
        Render.all();
        const fight = e.resolved && e.resolved.fight;
        if (fight) beginCombat(fight, { source: 'event' });
        else if (e.onDone) e.onDone();
        else focusStage();
    }
};

function focusStage() {
    const h = document.querySelector('[data-focus-fallback]');
    if (h) h.focus({ preventScroll: true });
}

/* ---------------------------------------------------------------------------
   Location actions
   --------------------------------------------------------------------------- */

function runLocationAction(action) {
    if (Combat.active) return;
    const loc = World.location();
    switch (action.type) {
        case 'shop': Shop.open(action.shop); break;
        case 'craft': Windows.craft(); break;
        case 'rest': {
            const r = World.rest();
            if (!r.ok) { Toast.show(r.reason, 'error'); audio.play('error'); break; }
            Events.show({ title: 'A Night\'s Rest', icon: '🛏️', text: 'You pay Marta and climb the creaking stairs to a straw bed. The fire crackles below, and you sleep until the morning bells.', resolved: { text: 'You wake rested and ready.', lines: [`-${r.cost} gold`, `+${r.healed} HP`] } });
            audio.play('heal');
            break;
        }
        case 'explore': {
            const r = World.explore(action);
            Events.show({ title: r.event.title, text: r.event.text, event: r.event, resolved: r.resolved, icon: loc.icon });
            audio.play(r.resolved && r.resolved.fight ? 'attack' : 'click');
            break;
        }
        case 'fight': {
            World.advance((action.hours || 1) * 60);
            const enemy = Util.weightedPick(loc.enemyPool, e => e[1])[0];
            beginCombat(enemy, { source: 'hunt' });
            break;
        }
        case 'forage': {
            const r = World.forage();
            const text = r.found.length ? 'You spend two hours picking through roots, moss and streambeds.' : 'You search for two hours but find nothing worth keeping.';
            Events.show({
                title: 'Foraging', icon: '🌿', text,
                resolved: { text, lines: r.found.length ? r.found.map(f => `Found ${f}`) : ['Nothing found'], fight: r.ambush },
                onDone: null
            });
            break;
        }
        case 'camp': {
            const r = World.camp(action);
            const text = r.ambush ? 'You settle beside a small fire, but something stirs in the dark...' : 'You build a small fire and keep watch until dawn. The night passes without trouble.';
            Events.show({ title: 'Camp', icon: '⛺', text, resolved: { text, lines: [`+${r.healed} HP`], fight: r.ambush } });
            break;
        }
        case 'boss': {
            const req = World.questRequirementMet(action);
            if (!req.ok) { Toast.show(req.reason, 'error'); break; }
            World.advance((action.hours || 1) * 60);
            beginCombat(action.enemy, { source: 'boss' });
            break;
        }
        default: break;
    }
    Render.schedule();
}

async function travelTo(id) {
    if (Combat.active) return;
    const r = World.travel(id);
    if (!r.ok) return Toast.show(r.reason, 'info');
    Modal.close('map', true);
    Render.all();
    audio.play('click');
    const loc = DATA.locations[id];
    if (r.ambush) {
        Events.show({
            title: 'Ambush!', icon: '⚠️',
            text: `You arrive at ${loc.name} after ${r.hours} hours of travel, but you are not alone. Something has been waiting for you.`,
            resolved: { text: `You arrive at ${loc.name} after ${r.hours} hours of travel, but you are not alone. Something has been waiting for you.`, lines: [], fight: r.ambush }
        });
    } else {
        Toast.show(`You arrive at ${loc.name} (${r.hours}h).`, 'info');
        focusStage();
    }
}

/* ---------------------------------------------------------------------------
   Dialogue
   --------------------------------------------------------------------------- */

const Dialogue = {
    open(npcId) {
        const npc = DATA.npcs[npcId];
        UIState.dialogue = { npc: npcId, view: 'root', quest: null, line: Util.pick(npc.greeting), notice: '' };
        Quests.onTalk(npcId);
        Modal.open({ id: 'dialogue', title: `${esc(npc.name)} <small class="title-sub">${esc(npc.title)}</small>`, body: Dialogue.body(), size: 'md', className: 'dialogue-overlay' });
    },

    portrait(npc) {
        return npc.portrait ? `<img class="dialogue-portrait" src="${npc.portrait}" alt="Portrait of ${esc(npc.name)}" width="160" height="160">`
            : `<div class="dialogue-portrait emoji" role="img" aria-label="Portrait of ${esc(npc.name)}">${npc.icon}</div>`;
    },

    body() {
        const d = UIState.dialogue;
        const npc = DATA.npcs[d.npc];
        let text = '', actions = '';
        if (d.view === 'root') {
            text = d.line;
            const ready = Quests.readyAt(d.npc), offers = Quests.offeredBy(d.npc), active = Quests.activeAt(d.npc);
            actions += ready.map(q => `<button class="btn btn-block dlg-btn ready" data-action="dlg-turnin" data-id="${q.id}" data-focus-key="dlg-ready-${q.id}"><span class="npc-marker ready inline" aria-hidden="true">?</span> Report: ${esc(q.title)}</button>`).join('');
            actions += offers.map(q => `<button class="btn btn-block dlg-btn offer" data-action="dlg-offer" data-id="${q.id}" data-focus-key="dlg-offer-${q.id}"><span class="npc-marker offer inline" aria-hidden="true">!</span> ${esc(q.title)}</button>`).join('');
            actions += active.map(q => `<button class="btn btn-block dlg-btn" data-action="dlg-progress" data-id="${q.id}" data-focus-key="dlg-active-${q.id}">📜 About: ${esc(q.title)}</button>`).join('');
            if (npc.shop) actions += `<button class="btn btn-block dlg-btn" data-action="dlg-shop" data-focus-key="dlg-shop">🛒 Browse wares</button>`;
            actions += `<button class="btn btn-block dlg-btn" data-action="dlg-rumor" data-focus-key="dlg-rumor">💬 Ask for news</button>`;
            actions += `<button class="btn btn-block dlg-btn leave" data-action="close-modal" data-focus-key="dlg-leave">Farewell</button>`;
        } else if (d.view === 'rumor') {
            text = d.line;
            actions = `<button class="btn btn-block dlg-btn" data-action="dlg-rumor" data-focus-key="dlg-rumor">💬 Another rumour</button>
                <button class="btn btn-block dlg-btn" data-action="dlg-back" data-focus-key="dlg-back">← Back</button>`;
        } else if (d.view === 'offer') {
            const q = DATA.quests[d.quest];
            text = q.offer;
            const warn = q.minLevel && Game.state.hero.level < q.minLevel ? `<p class="level-warn" role="note">⚠ Recommended level ${q.minLevel}. You are level ${Game.state.hero.level}.</p>` : '';
            const reward = q.choices ? 'Reward depends on your choice' : View.rewardLine(q.reward);
            actions = `${warn}<div class="quest-offer"><h4 class="font-title">${esc(q.title)}</h4><ul class="objectives">${q.objectives.map(o => `<li><span class="check" aria-hidden="true">○</span>${esc(o.text)}${(o.count || 1) > 1 ? ` (${o.count})` : ''}</li>`).join('')}</ul><p class="muted small">Reward: ${esc(reward)}</p></div>
                <button class="btn btn-block btn-gold" data-action="dlg-accept" data-id="${q.id}" data-autofocus>Accept quest</button>
                <button class="btn btn-block" data-action="dlg-back">Not now</button>`;
        } else if (d.view === 'progress') {
            const q = DATA.quests[d.quest];
            text = `"${q.summary}"`;
            actions = `<ul class="objectives">${q.objectives.map((o, i) => View.objectiveLine(q.id, i)).join('')}</ul>
                <button class="btn btn-block" data-action="dlg-back" data-autofocus>← Back</button>`;
        } else if (d.view === 'turnin') {
            const q = DATA.quests[d.quest];
            text = q.complete;
            if (q.choices) {
                actions = `<p class="muted small">Choose how this ends:</p>` + q.choices.map(c => {
                    const a = Quests.choiceAvailable(c);
                    return `<button class="btn btn-block choice-btn" data-action="dlg-complete" data-id="${q.id}" data-choice="${c.id}" data-focus-key="choice-${c.id}" ${a.ok ? '' : 'disabled'}>${esc(c.label)}${a.ok ? `<small>${esc(View.rewardLine(c.reward))}</small>` : `<small>${esc(a.reason)}</small>`}</button>`;
                }).join('');
            } else {
                actions = `<p class="muted small">Reward: ${esc(View.rewardLine(q.reward))}${q.reward.rep ? '' : ''}</p>
                    <button class="btn btn-block btn-gold" data-action="dlg-complete" data-id="${q.id}" data-autofocus>Complete quest</button>
                    <button class="btn btn-block" data-action="dlg-back">Not yet</button>`;
            }
        } else if (d.view === 'result') {
            text = d.result.choice ? d.result.choice.text : 'Well done.';
            actions = `<p class="result-title font-title">Quest complete: ${esc(d.result.quest.title)}</p>
                <ul class="reward-chips">${d.result.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
                <button class="btn btn-block btn-gold" data-action="dlg-back" data-autofocus>Continue</button>`;
        }
        return `<div class="dialogue">
            <div class="dialogue-head">${Dialogue.portrait(npc)}<blockquote class="speech">${esc(text)}</blockquote></div>
            ${d.notice ? `<p class="dlg-notice" role="status">${esc(d.notice)}</p>` : ''}
            <div class="dialogue-actions">${actions}</div></div>`;
    },

    go(view, extra = {}) {
        Object.assign(UIState.dialogue, { view }, extra);
        Modal.update('dialogue', Dialogue.body());
        const target = document.querySelector('#modal-root [data-autofocus]');
        if (target) target.focus();
    },

    rumor() {
        const d = UIState.dialogue;
        const npc = DATA.npcs[d.npc];
        const flags = Game.state.world.flags;
        const idx = flags[`rumor:${d.npc}`] || 0;
        flags[`rumor:${d.npc}`] = idx + 1;
        d.line = npc.rumors[idx % npc.rumors.length];
        Dialogue.go('rumor');
        const btn = document.querySelector('#modal-root [data-focus-key="dlg-rumor"]');
        if (btn) btn.focus();
    },

    accept(id) {
        Quests.start(id);
        const q = DATA.quests[id];
        Dialogue.go('root', { line: `"Good. Return when it is done." ${q.title} has been added to your journal.`, notice: '' });
        Render.schedule();
    },

    complete(id, choice) {
        const result = Quests.turnIn(id, choice);
        if (!result) return Toast.show('That cannot be completed yet.', 'error');
        UIState.dialogue.result = result;
        Dialogue.go('result');
        Render.all();
        if (result.choice && result.choice.ending) UIState.pendingEnding = result.choice.ending;
    },

    close() {
        Modal.close('dialogue', true);
        UIState.dialogue = null;
        Render.all();
        if (UIState.pendingEnding) { const e = UIState.pendingEnding; UIState.pendingEnding = null; Ending.show(e); }
        else focusStage();
    }
};

const Ending = {
    show(id) {
        const e = DATA.ENDINGS[id];
        Modal.open({
            id: 'ending', title: 'Epilogue', size: 'md', closable: false, className: 'story-overlay', noHeader: true,
            body: `<div class="story">
                <p class="story-kicker font-title">Epilogue</p>
                <h2 id="modal-title-ending" class="font-title">${esc(e.title)}</h2>
                <p class="story-text">${esc(e.text)}</p>
                <p class="muted">Thank you for playing, ${esc(Game.state.hero.name)}. The realm is yours to wander. Side quests, secrets and a few strong foes remain.</p>
                <div class="modal-actions"><button class="btn" data-action="ending-title">Return to title</button><button class="btn btn-gold" data-action="ending-continue" data-autofocus>Keep exploring</button></div></div>`
        });
        audio.play('levelup');
    }
};

/* ---------------------------------------------------------------------------
   Shops
   --------------------------------------------------------------------------- */

const Shop = {
    open(shopId) {
        UIState.shop = { id: shopId, tab: 'buy' };
        Modal.open({ id: 'shop', title: esc(DATA.shops[shopId].title), body: Screens.shop(shopId, 'buy'), size: 'lg', className: 'shop-overlay' });
    },
    render() { const s = UIState.shop; Modal.update('shop', Screens.shop(s.id, s.tab)); },
    buy(id) {
        const r = Economy.buy(UIState.shop.id, id);
        if (!r.ok) { Toast.show(r.reason, 'error'); audio.play('error'); return; }
        Toast.show(`Bought ${DATA.items[id].name} (-${r.price} gold)`, 'success');
        Shop.render(); Render.schedule();
    },
    sell(id) {
        const r = Economy.sell(UIState.shop.id, id);
        if (!r.ok) { Toast.show(r.reason, 'error'); audio.play('error'); return; }
        Toast.show(`Sold ${DATA.items[id].name} (+${r.price} gold)`, 'success');
        Shop.render(); Render.schedule();
    }
};

/* ---------------------------------------------------------------------------
   Combat screen
   --------------------------------------------------------------------------- */

const CombatUI = {
    busy: false,
    pickerOpen: false,

    open() {
        const c = Combat.active;
        const hero = Game.state.hero;
        const loc = World.location();
        const cls = DATA.classes[hero.cls];
        const bg = loc.image ? `style="--arena-bg:url('${loc.image}')"` : '';
        CombatUI.busy = false;
        CombatUI.pickerOpen = false;
        Modal.open({
            id: 'combat', title: c.def.boss ? `Boss: ${esc(c.def.name)}` : `Combat: ${esc(c.def.name)}`, size: 'xl', closable: false, className: 'combat-overlay',
            body: `<div class="combat" ${bg}>
                <div class="arena">
                    <div class="fighter player">
                        <div class="float-layer" id="float-player" aria-hidden="true"></div>
                        <div class="fighter-portrait" id="portrait-player" aria-hidden="true">${cls.icon}</div>
                        <div class="fighter-info"><h3 class="font-title">${esc(hero.name)}</h3>
                            <div id="cbar-player"></div>
                            <div class="status-row" id="status-player" aria-live="off"></div></div>
                    </div>
                    <div class="vs font-title" aria-hidden="true">VS</div>
                    <div class="fighter enemy ${c.def.boss ? 'boss' : ''}">
                        <div class="float-layer" id="float-enemy" aria-hidden="true"></div>
                        <div class="fighter-portrait" id="portrait-enemy" aria-hidden="true">${c.def.icon}</div>
                        <div class="fighter-info"><h3 class="font-title">${esc(c.def.name)}${c.def.boss ? ' <span class="tag tag-boss">Boss</span>' : ''}</h3>
                            <div id="cbar-enemy"></div>
                            <div class="status-row" id="status-enemy" aria-live="off"></div></div>
                    </div>
                </div>
                <div class="energy-row" id="energy-row"></div>
                <div class="combat-log" id="combat-log" role="log" aria-live="polite" aria-label="Combat log"></div>
                <div class="combat-actions" id="combat-actions">${CombatUI.actionButtons()}</div>
                <div class="item-picker" id="item-picker" hidden></div>
            </div>`
        });
        CombatUI.sync({ playerHp: hero.hp, enemyHp: c.enemy.hp, energy: c.energy, playerStatuses: [], enemyStatuses: [] });
        CombatUI.log(c.def.intro, 'info');
        if (c.ambush) CombatUI.log('You were ambushed!', 'bad');
        CombatUI.log(`Round 1: your move. Press 1-5 or click an action.`, 'muted');
    },

    actionButtons() {
        const hero = Game.state.hero;
        const ab = DATA.classes[hero.cls].ability;
        const boss = Combat.active.def.boss;
        return `
            <button class="btn combat-btn" data-action="combat" data-kind="attack" data-focus-key="c-attack" data-autofocus><kbd>1</kbd><span aria-hidden="true">⚔️</span> Attack</button>
            <button class="btn combat-btn" data-action="combat" data-kind="ability" data-focus-key="c-ability" title="${esc(ab.text)}"><kbd>2</kbd><span aria-hidden="true">${ab.icon}</span> ${esc(ab.name)} <small>${ab.cost} energy</small></button>
            <button class="btn combat-btn" data-action="combat" data-kind="defend" data-focus-key="c-defend" title="Halve incoming damage and regain 3 energy"><kbd>3</kbd><span aria-hidden="true">🛡️</span> Defend</button>
            <button class="btn combat-btn" data-action="combat" data-kind="item" data-focus-key="c-item"><kbd>4</kbd><span aria-hidden="true">🧪</span> Items</button>
            <button class="btn combat-btn" data-action="combat" data-kind="flee" data-focus-key="c-flee" ${boss ? 'disabled title="You cannot flee from a boss"' : ''}><kbd>5</kbd><span aria-hidden="true">🏃</span> Flee</button>`;
    },

    sync(beat) {
        const c = Combat.active;
        const hero = Game.state.hero;
        const maxHp = Hero.maxHp();
        $('cbar-player').innerHTML = View.bar('Health', Math.max(0, beat.playerHp), maxHp, 'bar-hp');
        $('cbar-enemy').innerHTML = View.bar('Health', Math.max(0, beat.enemyHp), c.enemy.maxHp, 'bar-enemy');
        const pips = [];
        for (let i = 0; i < c.maxEnergy; i++) pips.push(`<span class="pip ${i < beat.energy ? 'on' : ''}"></span>`);
        $('energy-row').innerHTML = `<span class="energy-label">Energy <b>${beat.energy}/${c.maxEnergy}</b></span><span class="pips" role="img" aria-label="Energy ${beat.energy} of ${c.maxEnergy}">${pips.join('')}</span>`;
        const statusHtml = list => list.map(id => `<span class="status status-${id}" title="${DATA.STATUSES[id].name}">${DATA.STATUSES[id].icon} ${DATA.STATUSES[id].name}</span>`).join('');
        $('status-player').innerHTML = statusHtml(beat.playerStatuses);
        $('status-enemy').innerHTML = statusHtml(beat.enemyStatuses);
        const ab = DATA.classes[hero.cls].ability;
        const abBtn = document.querySelector('[data-kind="ability"]');
        if (abBtn) abBtn.disabled = beat.energy < ab.cost || CombatUI.busy;
    },

    log(text, type = 'info') {
        const log = $('combat-log');
        if (!log) return;
        const p = document.createElement('p');
        p.className = `log-${type}`;
        p.textContent = text;
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
    },

    float(target, text, cls) {
        const layer = $(`float-${target}`);
        if (!layer) return;
        const el = document.createElement('span');
        el.className = `float-num ${cls}`;
        el.textContent = text;
        el.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 40)}px`);
        layer.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    },

    shake(target) {
        const el = $(`portrait-${target}`);
        if (!el || Game.settings.reduceMotion) return;
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
    },

    applyBeat(beat) {
        const logType = { hit: beat.target === 'player' ? 'bad' : 'good', crit: 'crit', miss: 'muted', heal: 'good', dot: 'bad', status: 'warn', guard: 'info', end: 'info', energy: 'info', info: 'info' }[beat.kind] || 'info';
        CombatUI.log(beat.text, logType);
        if (beat.kind === 'hit' || beat.kind === 'crit' || beat.kind === 'dot') {
            CombatUI.float(beat.target, `-${beat.amount}`, beat.kind === 'crit' ? 'crit' : (beat.target === 'player' ? 'dmg-player' : 'dmg-enemy'));
            CombatUI.shake(beat.target);
            audio.play(beat.kind === 'crit' ? 'crit' : (beat.target === 'player' ? 'hit' : 'attack'));
        } else if (beat.kind === 'miss') {
            CombatUI.float(beat.target, 'Miss', 'miss');
            audio.play('miss');
        } else if (beat.kind === 'heal') {
            CombatUI.float('player', `+${beat.amount}`, 'heal');
            audio.play('heal');
        } else if (beat.kind === 'status') {
            CombatUI.float(beat.target || 'player', beat.text.split(' ').slice(-1)[0].replace(/[!.]/g, ''), 'status');
        } else if (beat.kind === 'guard') {
            audio.play('click');
        }
        CombatUI.sync(beat);
    },

    async play(beats) {
        for (const beat of beats) {
            CombatUI.applyBeat(beat);
            await wait(beat.kind === 'end' ? 500 : 650);
        }
    },

    setBusy(busy) {
        CombatUI.busy = busy;
        document.querySelectorAll('#combat-actions .combat-btn').forEach(b => { b.disabled = busy; });
        if (!busy) {
            const c = Combat.active;
            const ab = DATA.classes[Game.state.hero.cls].ability;
            const abBtn = document.querySelector('[data-kind="ability"]');
            if (abBtn) abBtn.disabled = c.energy < ab.cost;
            const flee = document.querySelector('[data-kind="flee"]');
            if (flee && c.def.boss) flee.disabled = true;
            const first = document.querySelector('#combat-actions .combat-btn:not([disabled])');
            if (first && !CombatUI.pickerOpen) first.focus({ preventScroll: true });
        }
    },

    togglePicker(open) {
        const picker = $('item-picker');
        CombatUI.pickerOpen = open;
        if (!open) { picker.hidden = true; return; }
        const items = Combat.usableItems();
        picker.hidden = false;
        picker.innerHTML = `<h4 class="font-title">Use an item</h4>` + (items.length
            ? `<ul>${items.map(({ item, qty }) => `<li><button class="btn btn-block picker-btn" data-action="combat-item" data-id="${item.id}" data-focus-key="pick-${item.id}">${View.itemIcon(item, 'sm')}<span><b>${esc(item.name)}</b> ×${qty}<small>${esc(item.desc)}</small></span></button></li>`).join('')}</ul>`
            : '<p class="muted">You have no usable items.</p>')
            + '<button class="btn btn-small" data-action="combat-item-close">Cancel</button>';
        const first = picker.querySelector('button');
        if (first) first.focus();
    },

    async act(kind, arg) {
        if (CombatUI.busy || !Combat.active || Combat.active.over) return;
        if (kind === 'item' && arg === undefined) {
            CombatUI.togglePicker(!CombatUI.pickerOpen);
            return;
        }
        const c = Combat.active;
        const res = Combat.playerAction(kind, arg);
        if (!res.ok) {
            if (res.reason) { CombatUI.log(res.reason, 'warn'); Toast.show(res.reason, 'error'); audio.play('error'); }
            return;
        }
        CombatUI.togglePicker(false);
        CombatUI.setBusy(true);
        await CombatUI.play(res.beats);
        while (!c.over) {
            await wait(250);
            await CombatUI.play(Combat.enemyTurn());
            if (c.over) break;
            const start = Combat.startPlayerTurn();
            await CombatUI.play(start.beats);
            if (c.over || start.canAct) break;
        }
        if (c.over) { await wait(400); CombatUI.finish(); return; }
        CombatUI.log(`Round ${c.round}: your move.`, 'muted');
        CombatUI.setBusy(false);
    },

    finish() {
        const summary = Combat.finish();
        const e = summary.enemy;
        let body;
        if (summary.result === 'victory') {
            const loot = summary.loot.map(l => `<li>${View.itemIcon(DATA.items[l.id], 'sm')} ${esc(DATA.items[l.id].name)}${l.qty > 1 ? ' ×' + l.qty : ''}</li>`).join('');
            body = `<div class="result victory"><div class="result-icon" aria-hidden="true">🏆</div><h2 class="font-title">Victory!</h2>
                <p>${esc(e.name)} has been defeated.</p>
                <ul class="reward-chips"><li>+${summary.xp} XP</li><li>+${summary.gold} gold</li></ul>
                ${loot ? `<h3 class="section-label">Loot</h3><ul class="loot-list">${loot}</ul>` : ''}
                <div class="modal-actions"><button class="btn btn-gold" data-action="combat-done" data-autofocus>Continue</button></div></div>`;
            audio.play('success');
        } else if (summary.result === 'defeat') {
            body = `<div class="result defeat"><div class="result-icon" aria-hidden="true">💀</div><h2 class="font-title">You Have Fallen</h2>
                <p>Darkness takes you. Hours later, you wake in the Serpent's Cup with a sore head. Marta says kind strangers carried you here.</p>
                <ul class="reward-chips"><li>-${summary.respawn.lost} gold</li><li>Respawned at the Serpent's Cup</li></ul>
                <div class="modal-actions"><button class="btn btn-gold" data-action="combat-done" data-autofocus>Rise again</button></div></div>`;
            audio.play('defeat');
        } else {
            Modal.close('combat', true);
            Toast.show(`You escaped from ${e.name}.`, 'info');
            Render.all();
            focusStage();
            return;
        }
        const modal = Modal.get('combat');
        modal.overlay.querySelector('.modal-body').innerHTML = body;
        Modal.focusFirst(modal);
        Render.all();
    },

    done() {
        Modal.close('combat', true);
        Render.all();
        focusStage();
    }
};

function beginCombat(enemyId, opts) {
    Combat.start(enemyId, opts);
    CombatUI.open();
    Render.schedule();
}

/* ---------------------------------------------------------------------------
   Click handling
   --------------------------------------------------------------------------- */

function updateTabbar() {
    const panel = UIState.panel;
    $('game').dataset.panel = panel;
    document.querySelectorAll('.tabbar [data-panel]').forEach(b => {
        const on = b.dataset.panel === panel;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on);
    });
}

const Actions = {
    'close-modal': () => { const t = Modal.top(); if (t && t.closable) Modal.close(t.id); },
    'confirm-yes': () => UIState.confirmResolve && UIState.confirmResolve(true),
    'confirm-no': () => UIState.confirmResolve && UIState.confirmResolve(false),

    'start-new': () => { audio.unlock(); Creation.open(); },
    'continue': () => { audio.unlock(); const l = Store.latest(); if (l) Saves.load(l.slot); },
    'open-load': () => { audio.unlock(); Saves.openLoad(); },
    'open-settings': () => Windows.settings(),
    'open-help': () => Windows.help(),
    'open-menu': () => Windows.menu(),
    'open-map': () => { if (Combat.active) return; Modal.close('menu', true); Windows.map(); },
    'open-inventory': () => { Modal.close('menu', true); Windows.inventory(); },
    'open-craft': () => { Modal.close('menu', true); Windows.craft(); },
    'open-journal': () => { Modal.close('menu', true); Windows.journal(); },
    'open-character': () => { Modal.close('menu', true); Windows.character(); },
    'open-save': () => { Modal.close('menu', true); Saves.openSave(); },
    'return-title': () => { Modal.close('menu', true); returnToTitle(); },
    'toggle-mute': () => { audio.unlock(); audio.setMuted(!audio.muted); Render.last.topbar = null; Render.all(); },
    'panel': el => { UIState.panel = el.dataset.panel; updateTabbar(); },

    'talk': el => Dialogue.open(el.dataset.npc),
    'location-action': el => {
        const a = World.location().actions.find(x => x.id === el.dataset.id);
        if (a) runLocationAction(a);
    },
    'travel': el => travelTo(el.dataset.id),

    'equip': el => {
        const r = Hero.equip(el.dataset.id);
        if (!r.ok) { Toast.show(r.reason, 'error'); audio.play('error'); return; }
        audio.play('click');
        Render.all();
    },
    'unequip': el => { Hero.unequip(el.dataset.slot); audio.play('click'); Render.all(); },
    'use-item': el => {
        const r = Hero.useItem(el.dataset.id);
        if (!r.ok) { Toast.show(r.reason, 'error'); audio.play('error'); return; }
        audio.play('heal');
        Toast.show(`Recovered ${r.healed} health.`, 'success');
        Game.requestAutosave();
        Render.all();
    },
    'inv-filter': el => { UIState.invFilter = el.dataset.filter; Modal.update('inventory', Screens.inventory(UIState.invFilter)); },
    'spend-point': el => { if (Hero.spendPoint(el.dataset.attr)) { audio.play('click'); Game.requestAutosave(); Render.all(); } },
    'journal-tab': el => { UIState.journalTab = el.dataset.tab; Modal.update('journal', Screens.journal(UIState.journalTab)); },

    'buy': el => Shop.buy(el.dataset.id),
    'sell': el => Shop.sell(el.dataset.id),
    'shop-tab': el => { UIState.shop.tab = el.dataset.tab; Shop.render(); },
    'craft': el => {
        const r = Crafting.craft(el.dataset.id);
        if (!r.ok) { Toast.show(r.reason, 'error'); audio.play('error'); return; }
        Toast.show(`Crafted ${r.item.name}.`, 'success');
        Render.all();
    },

    'save-slot': el => Saves.saveTo(el.dataset.slot),
    'load-slot': el => Saves.load(el.dataset.slot),
    'delete-slot': el => Saves.remove(el.dataset.slot),
    'erase-data': async () => {
        const ok = await confirmDialog({ title: 'Erase everything?', text: 'All saves, lifetime statistics and settings will be deleted from this browser.', confirmLabel: 'Erase all', danger: true });
        if (!ok) return;
        Store.clearAll();
        Game.settings = Store.loadSettings();
        Game.meta = Store.loadMeta();
        applySettings();
        Modal.close('settings', true);
        if (Game.state) { Game.state = null; audio.stopMusic(); Title.show(); } else Title.render();
        Toast.show('All data erased.', 'info');
    },

    'pick-race': el => { Creation.readName(); UIState.creation.choice.race = el.dataset.id; Creation.render(); },
    'pick-cls': el => { Creation.readName(); UIState.creation.choice.cls = el.dataset.id; Creation.render(); },
    'pick-background': el => { Creation.readName(); UIState.creation.choice.background = el.dataset.id; Creation.render(); },
    'random-name': () => { UIState.creation.choice.name = Util.pick(RANDOM_NAMES); UIState.creation.error = ''; Creation.render(); },
    'creation-next': () => Creation.next(),
    'creation-back': () => Creation.back(),
    'creation-begin': () => Creation.begin(),
    'prologue-next': () => Prologue.next(),
    'prologue-skip': () => Prologue.end(),

    'event-choice': el => Events.choose(Number(el.dataset.index)),
    'event-continue': () => Events.done(),

    'dlg-offer': el => Dialogue.go('offer', { quest: el.dataset.id }),
    'dlg-progress': el => Dialogue.go('progress', { quest: el.dataset.id }),
    'dlg-turnin': el => Dialogue.go('turnin', { quest: el.dataset.id }),
    'dlg-accept': el => Dialogue.accept(el.dataset.id),
    'dlg-complete': el => Dialogue.complete(el.dataset.id, el.dataset.choice),
    'dlg-back': () => Dialogue.go('root', { line: Util.pick(DATA.npcs[UIState.dialogue.npc].greeting) }),
    'dlg-rumor': () => Dialogue.rumor(),
    'dlg-shop': () => { const npc = DATA.npcs[UIState.dialogue.npc]; Dialogue.close(); Shop.open(npc.shop); },

    'ending-continue': () => { Modal.close('ending', true); focusStage(); },
    'ending-title': () => { Modal.close('ending', true); audio.stopMusic(); Title.show(); },

    'combat': el => CombatUI.act(el.dataset.kind),
    'combat-item': el => CombatUI.act('item', el.dataset.id),
    'combat-item-close': () => CombatUI.togglePicker(false),
    'combat-done': () => CombatUI.done()
};

document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    audio.unlock();
    const handler = Actions[el.dataset.action];
    if (!handler) return;
    if (!['combat', 'combat-item', 'buy', 'sell'].includes(el.dataset.action)) audio.play('click');
    handler(el);
});

document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'hero-name' && UIState.creation) {
        UIState.creation.choice.name = t.value;
        const preview = document.querySelector('.creation-preview');
        if (preview) preview.innerHTML = Screens.creationPreview(UIState.creation.choice);
    }
    if (t.dataset && t.dataset.setting) {
        const key = t.dataset.setting;
        Game.settings[key] = t.type === 'checkbox' ? t.checked : (t.type === 'range' ? Number(t.value) : t.value);
        if (key === 'musicVolume') { const o = $('out-music'); if (o) o.textContent = `${Math.round(t.value * 100)}%`; if (Number(t.value) > 0) { audio.unlock(); audio.setVolumes(Game.settings.musicVolume, Game.settings.sfxVolume); audio.startMusic(); } }
        if (key === 'sfxVolume') { const o = $('out-sfx'); if (o) o.textContent = `${Math.round(t.value * 100)}%`; }
        if (key === 'difficulty') { const h = $('diff-hint'); if (h) h.textContent = `${DATA.DIFFICULTY[t.value].hint} Changes apply to the next fight.`; }
        Store.saveSettings(Game.settings);
        applySettings();
        if (key === 'sfxVolume') { audio.unlock(); audio.play('coin'); }
    }
});

document.addEventListener('keydown', e => {
    if (Modal.onKeydown(e)) return;
    if (e.key === 'Enter' && e.target.id === 'hero-name') { e.preventDefault(); Creation.next(); return; }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;

    if (Combat.active && Modal.isOpen('combat')) {
        const map = { '1': 'attack', '2': 'ability', '3': 'defend', '4': 'item', '5': 'flee' };
        if (map[e.key]) { e.preventDefault(); CombatUI.act(map[e.key]); }
        return;
    }
    if (e.key === 'Escape' && Combat.active) return;
    if (document.body.dataset.screen !== 'game' || Modal.anyOpen()) return;
    const keys = { m: () => Windows.map(), i: () => Windows.inventory(), c: () => Windows.character(), j: () => Windows.journal(), k: () => Windows.craft(), s: () => Saves.openSave(), '?': () => Windows.help(), Escape: () => Windows.menu() };
    const fn = keys[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (fn) { e.preventDefault(); fn(); }
});

// Escape closes the combat item picker even though the combat dialog cannot be dismissed.
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && Modal.isOpen('combat') && CombatUI.pickerOpen) CombatUI.togglePicker(false);
}, true);

/* The dialogue modal closes through Dialogue.close so state is cleaned up. */
const originalClose = Modal.close.bind(Modal);
Modal.close = function (id, silent) {
    if (id === 'dialogue' && !silent && UIState.dialogue) {
        originalClose(id, true);
        UIState.dialogue = null;
        Render.all();
        if (UIState.pendingEnding) { const en = UIState.pendingEnding; UIState.pendingEnding = null; Ending.show(en); }
        else focusStage();
        return;
    }
    originalClose(id, silent);
};

/* ---------------------------------------------------------------------------
   Bus wiring and boot
   --------------------------------------------------------------------------- */

Bus.on('toast', ({ msg, type }) => Toast.show(msg, type));
Bus.on('update', () => Render.schedule());
Bus.on('log', () => Render.schedule());
Bus.on('sfx', name => audio.play(name));
Bus.on('levelup', level => { Toast.show(`Level up! You are now level ${level}.`, 'levelup'); audio.play('levelup'); });
Bus.on('saved', slot => {
    const el = $('save-indicator');
    if (!el) return;
    el.textContent = slot === 'auto' ? 'Autosaved' : 'Saved';
    el.classList.add('show');
    clearTimeout(Bus.indicatorTimer);
    Bus.indicatorTimer = setTimeout(() => el.classList.remove('show'), 1400);
});

function boot() {
    applySettings();
    setInterval(() => { if (document.visibilityState === 'visible') Game.tick(); }, 1000);
    window.addEventListener('beforeunload', () => {
        if (Game.state && Game.settings.autoSave && !Combat.active) { Game.saveSlot('auto'); }
    });
    Title.show();
    document.body.classList.add('ready');
    const boot = $('boot');
    if (boot) { boot.classList.add('done'); setTimeout(() => boot.remove(), 400); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

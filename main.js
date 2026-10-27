// =================================================================================
// ANA OYUN KONTROL SİSTEMİ - Medieval Quest RPG v3.0
// =================================================================================

// Oyun durumu yönetimi
const masterState = {
    activeSlotIndex: 0,
    gameSlots: Array(3).fill().map(() => ({ exists: false, character: null, progress: {} })),
    currentLocation: 'oakvale_rebuilt', // Updated to a valid location in gamedata.js
    gameTime: 0,
    activeEvents: [],
    settings: {
        musicVolume: 0.7,
        sfxVolume: 0.8,
        autoSave: true,
        difficulty: 'normal'
    }
};

// Ses Sistemi Başlatma (Kullanıcı etkileşimi gerekir)
document.addEventListener('click', () => {
    if (typeof audioManager !== 'undefined') {
        audioManager.resumeContext();
        // audioManager.startAmbience(); // İsteğe bağlı, hemen başlamasını istemiyorsak kapalı kalsın
    }
}, { once: true });

// Oyun başlatma
function initializeGame() {
    loadGameState();
    setupEventListeners();
    initializeUI();
    startGameLoop();

    // Buton sesleri için dinleyici
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.btn') || e.target.closest('button')) {
            audioManager.playClick();
        }
    });

    // Ana menü ekranını göster
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('game-container').classList.add('hidden');

    console.log('Medieval Quest RPG v3.0 başlatıldı!');
}

// Oyun döngüsü
function startGameLoop() {
    setInterval(() => {
        updateGameState();
        renderGame();
    }, 1000); // Saniyede bir güncelleme

    // Ambient müzik döngüsü (basit kontrol)
    setInterval(() => {
        if (typeof audioManager !== 'undefined' && audioManager.enabled) {
            // Basit bir kontrol, gerekirse buraya müzik mantığı ekle
        }
    }, 5000);
}

// Oyun durumunu güncelle
function updateGameState() {
    // Zamanı güncelle
    masterState.gameTime += 1;

    // Dünya sistemlerini güncelle
    if (typeof worldSystem !== 'undefined') {
        worldSystem.updateTime(10); // 10 dakika ilerle
    }

    // Aktif etkinlikleri kontrol et
    // updateActiveEvents(); 

    // Otomatik kaydet
    if (masterState.settings.autoSave && masterState.gameTime % 300 === 0) { // 5 dakikada bir
        autoSaveGame();
    }
}

// UI'yı render et
function renderGame() {
    updateCharacterPanel();
    updateLocationDisplay();
    updateQuestTracker();
    updateTimeDisplay();
}

// Karakter panelini güncelle
function updateCharacterPanel() {
    const character = getCurrentCharacter();
    if (!character) return;

    // Can, mana, dayanıklılık çubukları
    // updateStatusBars(character); // system.js'de olabilir veya aşağıda tanımlanmalı

    // Seviye ve XP
    // updateLevelDisplay(character);

    // Basit HTML güncellemesi
    const healthBar = document.querySelector('.health-bar .bar-fill');
    if (healthBar) healthBar.style.width = `${(character.stats.health / character.stats.maxHealth) * 100}%`;
}

// Lokasyon görüntüsünü güncelle
function updateLocationDisplay() {
    // currentLocation string ise objeyi bul, yoksa default
    let locKey = masterState.currentLocation;
    let location = locations[locKey];

    if (!location && typeof locations !== 'undefined') {
        // Fallback to first available if not found
        location = Object.values(locations)[0];
    }

    if (!location) return;

    const locationElement = document.getElementById('center-game-area'); // ID düzeltildi
    if (locationElement) {
        locationElement.innerHTML = `
            <div class="location-display">
                <div class="location-image">${location.image || '🏰'}</div>
                <h2 class="font-medieval">${location.name}</h2>
                <div class="location-description">${location.description}</div>
                <div class="location-actions">
                    ${generateActionButtons(location.actions)}
                </div>
            </div>
        `;
    }
}

// Görev takipçisini güncelle
function updateQuestTracker() {
    // Basit implementasyon
    const trackerElement = document.getElementById('right-panel');
    if (trackerElement && typeof questSystem !== 'undefined') {
        // questSystem'den verileri alıp yazdır
    }
}

// Zaman görüntüsünü güncelle
function updateTimeDisplay() {
    const navBar = document.querySelector('.nav-bar');
    if (navBar && typeof worldSystem !== 'undefined') {
        const time = worldSystem.time;
        navBar.innerHTML = `
            <div class="time-info" style="color:white;">
                <span class="season">${worldSystem.getSeasonName ? worldSystem.getSeasonName(time.season) : time.season}</span> | 
                <span class="date">${time.day}. Gün</span> | 
                <span class="time">${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}</span>
            </div>
            <div class="player-gold" style="color:gold; font-weight:bold;">
                ${getCurrentCharacter() ? getCurrentCharacter().gold : 0} 💰
            </div>
        `;
    }
}

// Eylem butonları oluştur
function generateActionButtons(actions) {
    if (!actions) return '';

    return actions.map(action => {
        // Action string ID ise (gamedata.js yapısı)
        if (typeof action === 'string') {
            let label = action.replace(/_/g, ' ').toUpperCase();
            let icon = '⚡';
            let onClick = `performAction('${action}')`;

            if (action.includes('trade')) { icon = '💰'; onClick = `openMerchantModal()`; }
            if (action.includes('combat') || action.includes('fight') || action.includes('assault')) { icon = '⚔️'; }

            return `
                <button class="action-btn" onclick="${onClick}">
                    ${icon} ${label}
                </button>
            `;
        }
        // Action obje ise
        return `
            <button class="action-btn ${action.type || 'default'}" 
                    onclick="performAction('${action.id}')">
                ${action.icon || '⚡'} ${action.name}
            </button>
        `;
    }).join('');
}

// Eylem gerçekleştir
function performAction(actionId) {
    console.log("Action performed:", actionId);

    if (actionId === 'trade_in_market' || actionId.includes('trade')) {
        openMerchantModal();
        return;
    }

    if (actionId === 'combat_test' || actionId.includes('assault')) {
        // Test düşmanı
        startCombat('bandit_leader');
        return;
    }

    // Geri kalan logic...
    showToast(`Eylem gerçekleştirildi: ${actionId}`);
}

// --- SAVAŞ SİSTEMİ (GÖRSEL) ---
let currentCombatState = null;

function startCombat(enemyId) {
    const character = getCurrentCharacter();
    // Düşman verisi gamedata veya system'den alınmalı. Şimdilik mock data.
    const enemy = {
        id: enemyId,
        name: "Kara Şövalye",
        hp: 100,
        maxHp: 100,
        damage: 10
    };

    currentCombatState = {
        player: character,
        enemy: enemy,
        turn: 'player',
        log: []
    };

    // Modalı aç
    const modal = document.getElementById('combat-modal');
    modal.classList.add('active');

    audioManager.startAmbience(); // Savaş müziği (ambient)
    audioManager.playAttack(); // Başlangıç efekti

    updateCombatUI();
    addCombatLog("Savaş başladı! Hazırlıklı ol!");
}

function updateCombatUI() {
    if (!currentCombatState) return;

    const p = currentCombatState.player;
    const e = currentCombatState.enemy;

    // HP Bar Updates
    const pHpPct = (p.stats.health / p.stats.maxHealth) * 100;
    const eHpPct = (e.hp / e.maxHp) * 100;

    document.getElementById('combat-player-hp').style.width = `${pHpPct}%`;
    document.getElementById('combat-player-hp-text').innerText = `${p.stats.health}/${p.stats.maxHealth}`;

    document.getElementById('combat-enemy-hp').style.width = `${eHpPct}%`;
    document.getElementById('combat-enemy-hp-text').innerText = `${e.hp}/${e.maxHp}`;

    document.getElementById('combat-player-name').innerText = p.name;
    document.getElementById('combat-enemy-name').innerText = e.name;
}

function combatAction(type) {
    if (!currentCombatState || currentCombatState.turn !== 'player') return;

    if (type === 'attack') {
        // Oyuncu saldırısı
        const damage = Math.floor(Math.random() * 15) + 5; // Basit hasar
        currentCombatState.enemy.hp -= damage;
        if (currentCombatState.enemy.hp < 0) currentCombatState.enemy.hp = 0;

        audioManager.playAttack();
        showDamageNumber('enemy', damage);
        addCombatLog(`Saldırdın ve ${damage} hasar verdin!`, 'damage');

        updateCombatUI();

        if (currentCombatState.enemy.hp <= 0) {
            endCombat('win');
        } else {
            currentCombatState.turn = 'enemy';
            setTimeout(enemyTurn, 1000); // Düşman turu gecikmeli
        }
    } else if (type === 'flee') {
        if (Math.random() > 0.5) {
            addCombatLog("Başarıyla kaçtın!", 'info');
            setTimeout(() => endCombat('flee'), 1000);
        } else {
            addCombatLog("Kaçamadın!", 'damage');
            currentCombatState.turn = 'enemy';
            setTimeout(enemyTurn, 1000);
        }
    }
}

function enemyTurn() {
    if (!currentCombatState) return;

    const damage = Math.floor(Math.random() * 10) + 5;
    currentCombatState.player.stats.health -= damage;
    if (currentCombatState.player.stats.health < 0) currentCombatState.player.stats.health = 0;

    audioManager.playHit();
    showDamageNumber('player', damage);
    addCombatLog(`Düşman sana ${damage} hasar verdi!`, 'damage');

    updateCombatUI();

    if (currentCombatState.player.stats.health <= 0) {
        endCombat('lose');
    } else {
        currentCombatState.turn = 'player';
    }
}

function showDamageNumber(target, amount) {
    const indicator = document.getElementById(`${target}-damage-indicator`);
    indicator.innerText = `-${amount}`;
    indicator.classList.remove('damage-anim');
    void indicator.offsetWidth; // Trigger reflow
    indicator.classList.add('damage-anim');
}

function addCombatLog(msg, type = 'info') {
    const log = document.getElementById('combat-log-display');
    const p = document.createElement('p');
    p.innerText = msg;
    p.className = `log-${type}`;
    log.prepend(p);
}

function endCombat(result) {
    setTimeout(() => {
        document.getElementById('combat-modal').classList.remove('active');
        audioManager.stopAmbience();
        if (result === 'win') {
            audioManager.playSuccess();
            showToast("Savaşı kazandın! +100 XP", 'success');
        } else if (result === 'lose') {
            audioManager.playError();
            showToast("Yenildin...", 'error');
        }
    }, 1500);
}


// --- TÜCCAR SİSTEMİ ---
let currentShopTab = 'buy';

function openMerchantModal() {
    const modal = document.getElementById('merchant-modal');
    modal.classList.add('active');

    document.getElementById('player-gold-amount').innerText = getCurrentCharacter().gold;
    renderShop();
    audioManager.playHover();
}

function closeMerchantModal() {
    document.getElementById('merchant-modal').classList.remove('active');
}

function switchShopTab(tab) {
    currentShopTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderShop();
}

function renderShop() {
    const container = document.getElementById('shop-items-container');
    container.innerHTML = '';

    // Gamedata'dan eşyaları al (items objesi global olmalı)
    // Mock items if not available yet
    const shopItems = Object.values(items || {}).filter(i => i.value > 0);

    if (currentShopTab === 'buy') {
        shopItems.forEach(item => {
            container.innerHTML += createShopItemHTML(item, 'buy');
        });
    } else {
        // Oyuncu envanteri
        const character = getCurrentCharacter();
        character.inventory.forEach(item => {
            container.innerHTML += createShopItemHTML(item, 'sell');
        });
    }
}

function createShopItemHTML(item, mode) {
    const price = mode === 'buy' ? item.value : Math.floor(item.value / 2);
    const btnText = mode === 'buy' ? 'Satın Al' : 'Sat';
    const action = mode === 'buy' ? `buyItem('${item.id}')` : `sellItem('${item.id}')`;

    return `
        <div class="shop-item">
            <div class="shop-item-icon">📦</div>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-price">${price} Altın</div>
            <button class="shop-item-btn" onclick="${action}">${btnText}</button>
        </div>
    `;
}

function buyItem(itemId) {
    const item = items[itemId];
    const char = getCurrentCharacter();

    if (char.gold >= item.value) {
        char.gold -= item.value;
        char.inventory.push({ ...item });
        audioManager.playSuccess();
        showToast(`${item.name} satın alındı.`);
        document.getElementById('player-gold-amount').innerText = char.gold;
    } else {
        audioManager.playError();
        showToast("Yeterli altının yok!", 'error');
    }
}

function sellItem(itemId) {
    // Basit satma mantığı (ID ile bulup silme - indekslemek daha iyi ama şimdilik ID)
    const char = getCurrentCharacter();
    const idx = char.inventory.findIndex(i => i.id === itemId);
    if (idx > -1) {
        const item = char.inventory[idx];
        const sellPrice = Math.floor(item.value / 2);

        char.gold += sellPrice;
        char.inventory.splice(idx, 1);

        audioManager.playSuccess();
        showToast(`${item.name} satıldı.`);
        document.getElementById('player-gold-amount').innerText = char.gold;
        renderShop(); // Listeyi yenile
    }
}

// Yardımcı fonksiyonlar (Mevcut fonksiyonları koruyarak)
function getCurrentCharacter() {
    // Mock karakter eğer slot boşsa
    if (!masterState.gameSlots[masterState.activeSlotIndex].exists) {
        return {
            name: "Gezgin",
            gold: 100,
            stats: { health: 80, maxHealth: 100, mana: 50, maxMana: 50 },
            inventory: []
        };
    }
    return masterState.gameSlots[masterState.activeSlotIndex].character;
}

function initializeUI() {
    // Başlangıçta ana menü açık
}

function loadGameState() {
    // LocalStorage kontrolü vb.
}

function setupEventListeners() {
    // Global event listeners
}

function autoSaveGame() {
    console.log("Auto-saving...");
}

// Toast mesajı (Basit)
function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    document.body.appendChild(toast);

    // Stil (CSS'de tanımlı değilse inline ekle)
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.background = '#333';
    toast.style.color = '#fff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '5px';
    toast.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    toast.style.zIndex = '9999';

    setTimeout(() => toast.remove(), 3000);
}

// Başlat
document.addEventListener('DOMContentLoaded', initializeGame);

// =================================================================================
// MENÜ VE MODAL İŞLEMLERİ
// =================================================================================

function continueLatestGame() {
    audioManager.playClick();
    // Varsa son kaydı yükle, yoksa yeni oyun başlat (Hızlı giriş için)
    // Şimdilik direkt oyuna gir
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('game-container').classList.remove('hidden');

    // Varsayılan karakter yarat (eğer yoksa)
    if (!masterState.gameSlots[0].character) {
        masterState.gameSlots[0].character = {
            name: "Kahraman",
            race: "human",
            class: "warrior",
            level: 1,
            xp: 0,
            gold: 50,
            stats: { health: 100, maxHealth: 100, mana: 50, maxMana: 50 },
            inventory: [],
            skills: { sword: 5, defense: 5 }
        };
        masterState.gameSlots[0].exists = true;
    }

    updateLocationDisplay();
    updateCharacterPanel();
    updateTimeDisplay();

    showToast("Maceraya dönüldü!", "success");
    audioManager.startAmbience();
}

function openLoadGameModal() {
    audioManager.playClick();
    const modal = document.getElementById('load-game-modal');
    modal.classList.add('active');
    // Save slotları listeleme mantığı buraya eklenebilir
}

function closeLoadGameModal() {
    document.getElementById('load-game-modal').classList.remove('active');
}

function openSettings() {
    audioManager.playClick();
    // Ayarlar modalı olmadığı için şimdilik toast
    showToast("Ayarlar henüz aktif değil.", "info");
}

function closeCharacterCreationModal() {
    document.getElementById('character-creation-modal').classList.remove('active');
}

function closeQuestJournal() {
    document.getElementById('quest-journal-modal').classList.remove('active');
}

function closeInventory() {
    document.getElementById('inventory-modal').classList.remove('active');
}

function previousCreationStep() {
    // Karakter yaratma adımları için placeholder
}

function nextCreationStep() {
    // Karakter yaratma adımları için placeholder
}

// Global scope'a ekleyelim (Module olmadığı için zaten eklidir ama garanti olsun)
window.continueLatestGame = continueLatestGame;
window.openLoadGameModal = openLoadGameModal;
window.closeLoadGameModal = closeLoadGameModal;
window.openSettings = openSettings;
window.closeCharacterCreationModal = closeCharacterCreationModal;
window.closeQuestJournal = closeQuestJournal;
window.closeInventory = closeInventory;
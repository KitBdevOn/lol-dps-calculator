/**
 * app.js v5.0.9 (Refatoração de Performance - Hotfix D&D Final)
 * Cérebro central da Calculadora de DPS.
 *
 * PROTOCOLO DE PERFORMANCE (v5.0.4):
 * 1. Nossa Máxima: Desperdício de energia é fome e desespero.
 * 2. Tudo deve estar comentado: Para guia, debug e brainstorming.
 * 3. Repetir 1 e 2.
 *
 * ATUALIZAÇÃO v5.0.9 (Hotfix D&D Final):
 * - (FOME E DESESPERO) O D&D v5.0.7/v5.0.8 ainda estava quebrado (imagem invisível).
 * - (CAUSA RAIZ) A lógica "el.replaceWith(clone)" (v5.0.7) estava em conflito
 * com a remoção automática do 'el' pelo Sortable.js.
 * - (SOLUÇÃO) A lógica foi reescrita para a "versão antiga" (alta performance):
 * 1. Removemos 'el' (o clone temporário) manualmente.
 * 2. Removemos 'existingChamp' (o item antigo) manualmente.
 * 3. Adicionamos 'clone' (o item permanente) com appendChild.
 * Isso elimina 100% do conflito (desespero).
 */

// --- Estado Global da Aplicação ---
// Comentário: DDragonData armazena os dados brutos da API da Riot.
let DDragonData = {
    version: "14.13.1",
    baseUrl: "",
    championData: {},
    itemData: {}
};
DDragonData.baseUrl = `https://ddragon.leagueoflegends.com/cdn/${DDragonData.version}`;

// Comentário: currentState rastreia as seleções do usuário em tempo real.
let currentState = {
    lang: 'pt_BR', 
    activeTab: 'champion', 
    championId: null,
    level: 1,
    itemIds: [null, null, null, null, null, null], 
    enemyChampionId: null,
    enemyLevel: 1,
    enemyItemIds: [null, null, null, null, null, null]
};
// ----------------------------------

/**
 * (OTIMIZAÇÃO v5.0.6 - FOME 3) Função Debounce
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Função de Inicialização
 */
function init() {
    console.log("Cérebro carregado. Iniciando protocolo de sobrevivência. Layout v5.0.9 (Hotfix D&D Final) ativo.");
    
    const patchVersionEl = document.getElementById('patch-version');
    if (patchVersionEl) {
        patchVersionEl.innerText = `Patch: ${DDragonData.version}`;
    }

    // --- LÓGICA DE IDIOMA (i18n) ---
    const langBR = document.getElementById('lang-br');
    const langUS = document.getElementById('lang-us');
    if (langBR && langUS) {
        langBR.addEventListener('click', () => switchLanguage('pt_BR'));
        langUS.addEventListener('click', () => switchLanguage('en_US'));
    }

    // --- LÓGICA DE FILTRAGEM E ABAS ---
    const filtroInput = document.getElementById('filtro-biblioteca');
    if (filtroInput) {
        filtroInput.addEventListener('input', debounce(handleFiltro, 200));
    }
    const tabCampeoes = document.getElementById('tab-campeoes');
    const tabItens = document.getElementById('tab-itens');
    if (tabCampeoes && tabItens) {
        tabCampeoes.addEventListener('click', () => switchTab('champion'));
        tabItens.addEventListener('click', () => switchTab('item'));
    }

    setupDragAndDrop();
    setupInputListeners(); 
    fetchData();
}

/**
 * Troca a aba ativa da biblioteca (Campeões/Itens)
 */
function switchTab(tabName) {
    console.log(`Trocando para aba: ${tabName}`);
    currentState.activeTab = tabName;

    const tabCampeoes = document.getElementById('tab-campeoes');
    const tabItens = document.getElementById('tab-itens');

    if (tabName === 'champion') {
        tabCampeoes.classList.add('tab-button-active-gold');
        tabCampeoes.classList.remove('tab-button-gold');
        tabItens.classList.add('tab-button-gold');
        tabItens.classList.remove('tab-button-active-gold');
    } else {
        tabItens.classList.add('tab-button-active-gold');
        tabItens.classList.remove('tab-button-gold');
        tabCampeoes.classList.add('tab-button-gold');
        tabCampeoes.classList.remove('tab-button-active-gold');
    }

    handleFiltro();
}

/**
 * Troca o idioma da aplicação
 */
function switchLanguage(lang) {
    if (currentState.lang === lang) return;

    console.log(`Mudando idioma para: ${lang}`);
    currentState.lang = lang; 

    const langBR = document.getElementById('lang-br');
    const langUS = document.getElementById('lang-us');
    if (langBR && langUS) {
        langBR.style.opacity = (lang === 'pt_BR') ? '1' : '0.5';
        langUS.style.opacity = (lang === 'en_US') ? '1' : '0.5';
    }

    const filtroInput = document.getElementById('filtro-biblioteca');
    if (filtroInput) {
        filtroInput.value = '';
    }
    
    currentState.championId = null;
    currentState.itemIds = [null, null, null, null, null, null];
    currentState.enemyChampionId = null;
    currentState.enemyItemIds = [null, null, null, null, null, null];
    
    clearDropZone('campeao-selecionado-dropzone');
    clearDropZone('inimigo-selecionado-dropzone');
    for (let i = 0; i < 6; i++) {
        clearItemSlot('aliado', i);
        clearItemSlot('inimigo', i);
    }
    
    updateAllyStats(); 
    updateEnemyStats(); 
    
    fetchData();
}

/**
 * Helper para limpar visualmente uma dropzone de CAMPEÃO
 */
function clearDropZone(zoneId) {
    const dropzone = document.getElementById(zoneId);
    if (!dropzone) return;

    const existingElement = dropzone.querySelector('div[data-id]');
    if (existingElement) existingElement.remove();

    const placeholderText = dropzone.querySelector('span');
    if (placeholderText) placeholderText.style.display = 'flex';

    const target = (zoneId === 'campeao-selecionado-dropzone') ? 'aliado' : 'inimigo';
    const nameEl = (target === 'aliado') ? document.getElementById('aliado-champion-name') : document.getElementById('inimigo-champion-name');
    if (nameEl) nameEl.innerText = '';
}

/**
 * Helper para limpar visualmente um SLOT de ITEM
 */
function clearItemSlot(target, slotIndex) {
    const slotId = `${target}-item-slot-${slotIndex}`;
    const slot = document.getElementById(slotId);
    if (!slot) return;
    
    const itemElement = slot.querySelector('div[data-id]');
    if (itemElement) itemElement.remove();
    
    const placeholderText = slot.querySelector('span');
    if (placeholderText) placeholderText.style.display = 'block';
}


/**
 * Configura as 14 zonas de Drag-and-Drop
 */
function setupDragAndDrop() {
    console.log("Configurando zonas D&D (v5.0.9 - Otimizado)...");

    const bibliotecaLista = document.getElementById('biblioteca-lista');
    
    new Sortable(bibliotecaLista, {
        group: { name: 'biblioteca', pull: 'clone', put: false },
        animation: 150,
        sort: false,
    });

    // Zonas de Campeão
    const campeaoAliadoDropzone = document.getElementById('campeao-selecionado-dropzone');
    new Sortable(campeaoAliadoDropzone, {
        group: { name: 'campeoes', put: ['biblioteca'] },
        animation: 150,
        onAdd: (evt) => handleChampionDrop(evt, 'aliado')
    });

    const campeaoInimigoDropzone = document.getElementById('inimigo-selecionado-dropzone');
    new Sortable(campeaoInimigoDropzone, {
        group: { name: 'campeoes', put: ['biblioteca'] },
        animation: 150,
        onAdd: (evt) => handleChampionDrop(evt, 'inimigo')
    });

    // 12 Zonas de Item
    for (let i = 0; i < 6; i++) {
        const aliadoSlot = document.getElementById(`aliado-item-slot-${i}`);
        if (aliadoSlot) {
            new Sortable(aliadoSlot, {
                group: { name: 'itens', put: ['biblioteca'] },
                animation: 150,
                onAdd: (evt) => handleItemDrop(evt, 'aliado', i)
            });
        }
        
        const inimigoSlot = document.getElementById(`inimigo-item-slot-${i}`);
        if (inimigoSlot) {
            new Sortable(inimigoSlot, {
                group: { name: 'itens', put: ['biblioteca'] },
                animation: 150,
                onAdd: (evt) => handleItemDrop(evt, 'inimigo', i)
            });
        }
    }

    console.log("Sortable.js v5.0.9 (Nativo) inicializado.");
}

/**
 * (Refatorado v5.0.9 - DESESPERO HOTFIX FINAL) Manipula o drop de um CAMPEÃO
 */
function handleChampionDrop(evt, target) {
    const el = evt.item; // O clone *temporário* do Sortable.js
    const dropzone = (target === 'aliado') ? document.getElementById('campeao-selecionado-dropzone') : document.getElementById('inimigo-selecionado-dropzone');
    const nameEl = (target === 'aliado') ? document.getElementById('aliado-champion-name') : document.getElementById('inimigo-champion-name');

    if (el.dataset.type !== 'champion') {
        console.warn(`Rejeitado: Apenas campeões são permitidos na zona do ${target}.`);
        el.parentNode.removeChild(el); 
        return;
    }

    // --- (INÍCIO DA CORREÇÃO v5.0.9 - DESESPERO) ---
    // Comentário: A lógica "el.replaceWith(clone)" (v5.0.7) estava em conflito
    // com a remoção automática do Sortable.js.
    // Esta é a lógica correta (das "primeiras versões").
    
    // 1. Criamos nosso clone permanente.
    const clone = el.cloneNode(true);
    clone.classList.remove('sortable-ghost'); 

    // 2. Removemos o campeão antigo (se houver).
    const existingChamp = dropzone.querySelector('div[data-id]');
    if (existingChamp) {
        existingChamp.remove();
    }
    
    // 3. Adicionamos (appendChild) nosso clone permanente.
    // (Esta é a ação que faltava)
    dropzone.appendChild(clone);
    
    // 4. Removemos 'el' (o clone temporário) manualmente para
    // que o Sortable.js não tente removê-lo e causar o bug.
    el.parentNode.removeChild(el);
    // --- (FIM DA CORREÇÃO) ---
    
    const placeholder = dropzone.querySelector('span');
    if (placeholder) placeholder.style.display = 'none';

    // Atualiza o estado
    const champId = clone.dataset.id;
    if (target === 'aliado') {
        currentState.championId = champId;
        console.log(`Campeão Aliado: ${champId}`);
    } else {
        currentState.enemyChampionId = champId;
        console.log(`Campeão Inimigo: ${champId}`);
    }
    
    // Atualiza o nome
    if (nameEl && DDragonData.championData && DDragonData.championData[champId]) {
        nameEl.innerText = DDragonData.championData[champId].name;
    }
    
    // Comentário: Adiciona o listener de clique ao *nosso* clone.
    clone.addEventListener('click', () => {
        clone.remove(); // Remove o *nosso* clone
        if (placeholder) placeholder.style.display = 'flex'; 
        
        if (target === 'aliado') {
            currentState.championId = null;
            if (nameEl) nameEl.innerText = ''; 
        } else {
            currentState.enemyChampionId = null;
            if (nameEl) nameEl.innerText = ''; 
        }
        
        if (target === 'aliado') {
            updateAllyStats(); 
        } else {
            updateEnemyStats();
        }
    });

    if (target === 'aliado') {
        updateAllyStats(); 
    } else {
        updateEnemyStats();
    }
}


/**
 * (Refatorado v5.0.9 - DESESPERO HOTFIX FINAL) Manipula o drop de um ITEM
 */
function handleItemDrop(evt, target, slotIndex) {
    const el = evt.item; // O clone *temporário*
    const slot = document.getElementById(`${target}-item-slot-${slotIndex}`);
    if (!slot) return;

    if (el.dataset.type !== 'item') {
        console.warn(`Rejeitado: Apenas itens são permitidos na zona do ${target}.`);
         el.parentNode.removeChild(el);
         return;
    }

    // --- (INÍCIO DA CORREÇÃO v5.0.9 - DESESPERO) ---
    // 1. Criamos nosso clone permanente.
    const clone = el.cloneNode(true);
    clone.classList.remove('sortable-ghost');

    // 2. Removemos o item antigo (se houver).
    const existingItem = slot.querySelector('div[data-id]');
    if (existingItem) {
        existingItem.remove(); 
    }
    
    // 3. Adicionamos (appendChild) nosso clone permanente.
    slot.appendChild(clone);
    
    // 4. Removemos 'el' (o clone temporário) manualmente.
    el.parentNode.removeChild(el);
    // --- (FIM DA CORREÇÃO) ---
    
    const placeholder = slot.querySelector('span');
    if (placeholder) placeholder.style.display = 'none';

    // Atualiza o estado
    const itemId = clone.dataset.id;
    if (target === 'aliado') {
        currentState.itemIds[slotIndex] = itemId;
        console.log(`Itens Aliado: [${currentState.itemIds.join(', ')}]`);
    } else {
        currentState.enemyItemIds[slotIndex] = itemId; 
        console.log(`Itens Inimigo: [${currentState.enemyItemIds.join(', ')}]`);
    }

    // Adiciona o listener ao *nosso* clone
    clone.addEventListener('click', () => {
        clone.remove();
        if (placeholder) placeholder.style.display = 'block'; 
        
        if (target === 'aliado') {
            currentState.itemIds[slotIndex] = null;
        } else {
            currentState.enemyItemIds[slotIndex] = null;
        }
        
        if (target === 'aliado') {
            updateAllyStats(); 
        } else {
            updateEnemyStats();
        }
    });

    if (target === 'aliado') {
        updateAllyStats(); 
    } else {
        updateEnemyStats();
    }
}


/**
 * (Refatorado v5.0.6 - FOME 4) Configura os listeners de Nível
 */
function setupInputListeners() {
    const levelInput = document.getElementById('level');
    const enemyLevelInput = document.getElementById('enemy-level');

    levelInput.addEventListener('change', (e) => {
        currentState.level = parseInt(e.target.value) || 1;
        updateAllyStats(); 
    });
    
    enemyLevelInput.addEventListener('change', (e) => {
        currentState.enemyLevel = parseInt(e.target.value) || 1;
        updateEnemyStats(); 
    });
}

/**
 * Busca os dados do Data Dragon (Comando 2)
 */
async function fetchData() {
    console.log(`Iniciando busca de dados da versão ${DDragonData.version}...`);
    try {
        const lang = currentState.lang;
        console.log(`Buscando dados no idioma: ${lang}`);

        const [champResponse, itemResponse] = await Promise.all([
            fetch(`${DDragonData.baseUrl}/data/${lang}/champion.json`),
            fetch(`${DDragonData.baseUrl}/data/${lang}/item.json`)
        ]);

        if (!champResponse.ok || !itemResponse.ok) {
            throw new Error(`Falha na rede ao buscar dados.`);
        }

        const champFullData = await champResponse.json();
        const itemFullData = await itemResponse.json();
        
        DDragonData.championData = champFullData.data;
        DDragonData.itemData = itemFullData.data;

        console.log("Dados de Campeões e Itens carregados.");

        populateBiblioteca(DDragonData.championData, DDragonData.itemData);

    } catch (error) {
        console.error("Erro fatal ao buscar dados do Data Dragon:", error);
    }
}

/**
 * Popula a Biblioteca com os dados do Data Dragon (Comando 2)
 */
function populateBiblioteca(championData, itemData) {
    const bibliotecaLista = document.getElementById('biblioteca-lista');
    if (!bibliotecaLista) {
        console.error("Elemento 'biblioteca-lista' não encontrado.");
        return;
    }

    bibliotecaLista.innerHTML = ''; 
    console.log("Renderizando biblioteca...");

    // 1. Adiciona Campeões
    for (const champKey in championData) {
        const champ = championData[champKey];
        const el = createBibliotecaElement(
            champ.id,
            'champion',
            champ.name,
            `${DDragonData.baseUrl}/img/champion/${champ.image.full}`
        );
        bibliotecaLista.appendChild(el);
    }

    // 2. Adiciona Itens (Filtro de Performance)
    for (const itemId in itemData) {
        const item = itemData[itemId];
        if (item.gold.purchasable && 
            item.maps['11'] && 
            !item.tags.includes('Trinket') && 
            !item.tags.includes('Consumable') &&
            !item.tags.includes('Lane') && 
            item.tags.length > 0 && 
            (item.depth >= 2 || item.gold.base > 1500) && 
            !item.hideFromAll)
        {
            const el = createBibliotecaElement(
                itemId,
                'item',
                item.name,
                `${DDragonData.baseUrl}/img/item/${item.image.full}`
            );
            bibliotecaLista.appendChild(el);
        }
    }
    console.log(`Biblioteca populada com ${bibliotecaLista.children.length} elementos.`);
    
    handleFiltro();
}

/**
 * Helper para criar um elemento arrastável para a biblioteca
 */
function createBibliotecaElement(id, type, name, imageUrl) {
    const div = document.createElement('div');
    div.className = 'biblioteca-item w-20 h-20 rounded-lg cursor-move p-0 relative group group-hover:z-50';
    div.dataset.id = id;
    div.dataset.type = type;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = name;
    img.className = "w-full h-full object-cover transition-transform duration-200 group-hover:scale-110 rounded-lg";
    img.draggable = false;

    const nameOverlay = document.createElement('span');
    nameOverlay.innerText = name;
    nameOverlay.className = "item-tooltip absolute bottom-0 left-0 w-auto min-w-full text-white text-xs text-center p-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100 rounded-b-lg z-10";

    div.appendChild(img);
    div.appendChild(nameOverlay);
    
    div.addEventListener('click', () => showRecipe(id, type));

    return div;
}

/**
 * Mostra a receita de um item clicado
 */
function showRecipe(id, type) {
    const receitaBloco = document.getElementById('receita-bloco');
    if (!receitaBloco) return;

    if (type === 'champion') {
        receitaBloco.innerHTML = '<span class="text-gray-500">Clique em um item da biblioteca para ver sua receita.</span>';
        return;
    }

    const item = DDragonData.itemData[id];
    
    if (!item || !item.from || item.from.length === 0) {
        receitaBloco.innerHTML = `<span class="text-gray-400">${item.name} não possui receita.</span>`;
        return;
    }

    receitaBloco.innerHTML = '';
    
    item.from.forEach(subItemId => {
        const subItem = DDragonData.itemData[subItemId]; 
        if (!subItem) return;

        const div = document.createElement('div');
        div.className = 'biblioteca-item w-16 h-16 rounded-lg relative group';
        div.title = `${subItem.name} (${subItem.gold.total}G)`;

        const img = document.createElement('img');
        img.src = `${DDragonData.baseUrl}/img/item/${subItem.image.full}`;
        img.alt = subItem.name;
        img.className = "w-full h-full object-cover rounded-lg";
        
        div.appendChild(img);
        receitaBloco.appendChild(div);
    });
}

// --- (INÍCIO DA REFATORAÇÃO v5.0.6 - FOME 4) ---

/**
 * Gatilho para atualizar APENAS os stats do Aliado
 */
function updateAllyStats() {
    console.log("Otimizado: Recalculando apenas Aliado.");
    const aliadoItemIds = currentState.itemIds.filter(id => id !== null);
    const aliadoStats = calculateStats(currentState.championId, currentState.level, aliadoItemIds);
    renderRPGCard('aliado', aliadoStats);
    
    triggerDPSCalculation();
}

/**
 * Gatilho para atualizar APENAS os stats do Inimigo
 */
function updateEnemyStats() {
    console.log("Otimizado: Recalculando apenas Inimigo.");
    const inimigoItemIds = currentState.enemyItemIds.filter(id => id !== null);
    const inimigoStats = calculateStats(currentState.enemyChampionId, currentState.enemyLevel, inimigoItemIds);
    renderRPGCard('inimigo', inimigoStats);

    triggerDPSCalculation();
}

/**
 * Gatilho para atualizar APENAS o DPS
 */
function triggerDPSCalculation() {
    console.log("Otimizado: Recalculando apenas DPS.");
    const aliadoItemIds = currentState.itemIds.filter(id => id !== null);
    const inimigoItemIds = currentState.enemyItemIds.filter(id => id !== null);

    const aliadoStats = calculateStats(currentState.championId, currentState.level, aliadoItemIds);
    const inimigoStats = calculateStats(currentState.enemyChampionId, currentState.enemyLevel, inimigoItemIds);
    
    calculateDPS(aliadoStats, inimigoStats);
}
// --- (FIM DA REFATORAÇÃO v5.0.6 - FOME 4) ---


/**
 * Calcula todos os status para um alvo (aliado ou inimigo)
 */
function calculateStats(championId, level, itemIds) {
    if (!championId) {
        return null;
    }
    
    if (!DDragonData.championData || !DDragonData.championData[championId]) {
        console.error(`Dados do campeão ${championId} não encontrados ou DDragonData não carregado.`);
        return null;
    }

    const levelIndex = level - 1; 
    const champBase = DDragonData.championData[championId].stats;

    const getStatAtLevel = (base, perLevel) => {
        return base + (perLevel * levelIndex * (0.7025 + (0.0175 * levelIndex)));
    };

    let totalStats = {
        hp: getStatAtLevel(champBase.hp, champBase.hpperlevel),
        hpregen: getStatAtlevel(champBase.hpregen, champBase.hpregenperlevel),
        mp: getStatAtLevel(champBase.mp, champBase.mpperlevel),
        mpregen: getStatAtlevel(champBase.mpregen, champBase.mpregenperlevel),
        ad: getStatAtLevel(champBase.attackdamage, champBase.attackdamageperlevel),
        armor: getStatAtLevel(champBase.armor, champBase.armorperlevel),
        spellblock: getStatAtLevel(champBase.spellblock, champBase.spellblockperlevel),
        attackspeed_base: champBase.attackspeed,
        attackspeed: champBase.attackspeed * (1 + (getStatAtLevel(0, champBase.attackspeedperlevel) / 100)),
        crit: 0,
        movespeed: champBase.movespeed
    };

    let itemAttackSpeedBonus = 0;

    if (DDragonData.itemData) {
        for (const itemId of itemIds) {
            const itemStats = DDragonData.itemData[itemId]?.stats;
            if (!itemStats) continue;
            
            totalStats.hp += itemStats.FlatHPPoolMod || 0;
            totalStats.mp += itemStats.FlatMPPoolMod || 0;
            totalStats.ad += itemStats.FlatPhysicalDamageMod || 0;
            totalStats.armor += itemStats.FlatArmorMod || 0;
            totalStats.spellblock += itemStats.FlatSpellBlockMod || 0;
            totalStats.crit += (itemStats.FlatCritChanceMod || 0) * 100;
            totalStats.movespeed += itemStats.FlatMovementSpeedMod || 0;
            totalStats.hpregen += itemStats.FlatHPRegenMod || 0;
            totalStats.mpregen += itemStats.FlatMPRegenMod || 0;
            
            itemAttackSpeedBonus += (itemStats.PercentAttackSpeedMod || 0);
        }
    }
    
    const asBonusFromLevel = (getStatAtLevel(0, champBase.attackspeedperlevel) / 100);
    const asBonusFromItems = itemAttackSpeedBonus;
    
    totalStats.attackspeed = totalStats.attackspeed_base * (1 + asBonusFromLevel + asBonusFromItems);
    
    return totalStats;
}

/**
 * (Refatorado v5.0.6 - FOME 2) Renderiza o "Card RPG"
 */
function renderRPGCard(target, stats) {
    const containerId = (target === 'aliado') ? 'aliado-stats-container' : 'inimigo-stats-container';
    const container = document.getElementById(containerId);
    if (!container) return;

    const updateStat = (statName, value, decimals = 0) => {
        const el = document.getElementById(`${target}-stat-${statName}`);
        if (el) {
            el.innerText = value.toFixed(decimals);
        }
    };

    if (!stats) {
        updateStat('hp', 0);
        updateStat('mp', 0);
        updateStat('hpregen', 0, 1);
        updateStat('mpregen', 0, 1);
        updateStat('ad', 0, 1);
        updateStat('attackspeed', 0, 3);
        updateStat('armor', 0, 1);
        updateStat('spellblock', 0, 1);
        updateStat('crit', 0);
        updateStat('movespeed', 0);
    } else {
        updateStat('hp', stats.hp);
        updateStat('mp', stats.mp);
        updateStat('hpregen', stats.hpregen, 1);
        updateStat('mpregen', stats.mpregen, 1);
        updateStat('ad', stats.ad, 1);
        updateStat('attackspeed', stats.attackspeed, 3);
        updateStat('armor', stats.armor, 1);
        updateStat('spellblock', stats.spellblock, 1);
        updateStat('crit', stats.crit);
        updateStat('movespeed', stats.movespeed);
    }
}


/**
 * Calcula o DPS final (Aliado vs Inimigo)
 */
function calculateDPS(aliadoStats, inimigoStats) {
    if (!aliadoStats) {
        renderDPS(0);
        return;
    }
    
    const targetArmor = inimigoStats ? inimigoStats.armor : 0; 
    
    const effectiveArmor = Math.max(0, targetArmor);
    const damageMultiplier = 100 / (100 + effectiveArmor);

    const critChance = aliadoStats.crit / 100;
    let critDamageBonus = 1.0; 
    
    const aliadoItemIds = currentState.itemIds.filter(id => id !== null);
    const hasInfinityEdge = aliadoItemIds.includes('3031');
    if (hasInfinityEdge) {
        critDamageBonus = 1.5;
    }
    
    const baseDPS = (aliadoStats.ad * aliadoStats.attackspeed) * damageMultiplier;
    const dps = baseDPS * (1 + (critChance * critDamageBonus));

    renderDPS(dps);
}

/**
 * Renderiza o resultado final do DPS na UI
 */
function renderDPS(dps) {
    const dpsElement = document.getElementById('resultado-dps');
    if (dpsElement) {
        dpsElement.innerText = dps.toFixed(0);
    }
}

/**
 * Filtra os itens na biblioteca com base no input E na aba ativa.
 */
function handleFiltro() {
    const termoInput = document.getElementById('filtro-biblioteca');
    if (!termoInput) return;
    const termo = termoInput.value.toLowerCase();
    
    const activeType = currentState.activeTab;
    
    const bibliotecaLista = document.getElementById('biblioteca-lista');
    if (!bibliotecaLista) return;

    const itens = bibliotecaLista.querySelectorAll('div[data-id]'); 
    
    for (const item of itens) {
        const img = item.querySelector('img');
        if (img) {
            const nome = img.alt.toLowerCase();
            const type = item.dataset.type;

            const matchesTermo = nome.includes(termo);
            const matchesTab = (type === activeType);

            if (matchesTermo && matchesTab) {
                item.style.removeProperty('display');
            } else {
                item.style.display = 'none';
            }
        }
    }
}

// --- (CORREÇÃO v4.0.1) ---
// Comentário: Chama a função init() diretamente.
init();
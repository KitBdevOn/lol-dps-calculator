/**
 * app.js v6.2.0 (Refatoração de Layout - Footer Fixo e DPS Triângulo)
 * Cérebro central da Calculadora de DPS.
 *
 * PROTOCOLO DE PERFORMANCE (v5.0.4):
 * 1. Nossa Máxima: Desperdício de energia é fome e desespero.
 * 2. Tudo deve estar comentado: Para guia, debug e brainstorming.
 * 3. Repetir 1 e 2.
 *
 * ATUALIZAÇÃO v6.2.0 (Layout):
 * - (FOME) Corrigido o "footer flutuante" (v6.1.0) envolvendo o 
 * site em um ".site-wrapper" (min-height: 100vh).
 * - (FOME) Corrigido o bloco de Receita (removido flex-grow) 
 * para não "ocupar espaço demais".
 * - (FOME) Otimizado o layout dos balões de DPS para "Triângulo"
 * (AD/AP no topo, Total embaixo) para economizar espaço.
 * - (DESESPERO) Adicionada lógica de fonte dinâmica ao DPS para 
 * prevenir overflow de texto.
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
    console.log("Cérebro carregado. Iniciando protocolo de sobrevivência. Layout v6.2.0 (Layout Fixo) ativo.");
    
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

    // Comentário: (v6.0.0) setupDragAndDrop() foi removido.
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
    
    // Reseta o estado
    currentState.championId = null;
    currentState.itemIds = [null, null, null, null, null, null];
    currentState.enemyChampionId = null;
    currentState.enemyItemIds = [null, null, null, null, null, null];
    
    // Limpa visualmente
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
 * (Modificado v6.0.0)
 */
function clearDropZone(zoneId) {
    const dropzone = document.getElementById(zoneId);
    if (!dropzone) return;

    // Limpa o conteúdo (o ícone)
    dropzone.innerHTML = ''; 

    // Adiciona o placeholder de volta
    const placeholderText = document.createElement('span');
    placeholderText.className = 'text-center text-xs p-1 text-gold-dark';
    placeholderText.innerText = (zoneId === 'campeao-selecionado-dropzone') ? 'Aliado' : 'Inimigo';
    dropzone.appendChild(placeholderText);

    const target = (zoneId === 'campeao-selecionado-dropzone') ? 'aliado' : 'inimigo';
    const nameEl = (target === 'aliado') ? document.getElementById('aliado-champion-name') : document.getElementById('inimigo-champion-name');
    if (nameEl) nameEl.innerText = '';
}

/**
 * Helper para limpar visualmente um SLOT de ITEM
 * (Modificado v6.0.0)
 */
function clearItemSlot(target, slotIndex) {
    const slotId = `${target}-item-slot-${slotIndex}`;
    const slot = document.getElementById(slotId);
    if (!slot) return;
    
    // Limpa o conteúdo (o ícone)
    slot.innerHTML = '';
    
    // Adiciona o placeholder de volta
    const placeholderText = document.createElement('span');
    placeholderText.className = 'item-slot-placeholder text-xs';
    placeholderText.innerText = `Slot ${slotIndex + 1}`;
    slot.appendChild(placeholderText);
}


// --- (INÍCIO DA LÓGICA D&D NATIVO v6.0.0) ---

/**
 * (v6.0.0) Permite que um item seja solto
 */
function allowDrop(evt) {
    evt.preventDefault();
}

/**
 * (v6.0.0) Adiciona/Remove classe de feedback visual
 */
function handleDragEnter(evt) {
    // Comentário: Garante que o evento está no 'alvo' (o slot) e não
    // em um filho (como o placeholder span)
    if (evt.target.classList.contains('item-slot') || evt.target.classList.contains('champion-dropzone')) {
        evt.target.classList.add('drag-over');
    }
}
function handleDragLeave(evt) {
    if (evt.target.classList.contains('item-slot') || evt.target.classList.contains('champion-dropzone')) {
        evt.target.classList.remove('drag-over');
    }
}

/**
 * (v6.0.0) Define o "código" (ID e Tipo) quando o arraste começa
 */
function handleDragStart(evt) {
    // Comentário: Define o ID (ex: "Aatrox") e o TIPO (ex: "champion")
    evt.dataTransfer.setData("text/plain", evt.target.dataset.id);
    evt.dataTransfer.setData("text/type", evt.target.dataset.type);
    evt.target.classList.add('dragging');
}

/**
 * (v6.0.0) Limpa o feedback visual quando o arraste termina
 */
function handleDragEnd(evt) {
    evt.target.classList.remove('dragging');
}

/**
 * (v6.0.0) O "Coração" do D&D. O slot "lê o código" e "retorna a imagem".
 */
function handleDrop(evt, target, expectedType, slotIndex) {
    evt.preventDefault();
    
    // Comentário: 'currentTarget' é mais seguro que 'target' para
    // garantir que pegamos o elemento com o listener (o slot)
    const dropzone = evt.currentTarget;
    dropzone.classList.remove('drag-over');

    // 1. "Lê o código" (ID e Tipo)
    const id = evt.dataTransfer.getData("text/plain");
    const type = evt.dataTransfer.getData("text/type");

    // 2. Validação
    if (type !== expectedType) {
        console.warn(`Rejeitado: Tipo errado. Esperado ${expectedType}, recebido ${type}.`);
        return;
    }
    
    // 3. "Retorna a imagem" (Renderiza)
    const imageUrl = (type === 'champion') 
        ? `${DDragonData.baseUrl}/img/champion/${DDragonData.championData[id].image.full}`
        : `${DDragonData.baseUrl}/img/item/${DDragonData.itemData[id].image.full}`;
    const name = (type === 'champion')
        ? DDragonData.championData[id].name
        : DDragonData.itemData[id].name;

    // Limpa o placeholder
    dropzone.innerHTML = ''; 
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = name;
    img.className = "w-full h-full object-cover rounded-lg";
    img.draggable = false; // Impede que o item solto seja arrastado novamente
    
    // Adiciona o listener de clique para remover
    img.addEventListener('click', (e) => {
        // (FOME) Impede que o clique no item acione o clique na biblioteca
        e.stopPropagation(); 
        handleRemove(target, expectedType, slotIndex);
    });
    
    dropzone.appendChild(img);

    // 4. Atualiza o Estado
    if (type === 'champion') {
        if (target === 'aliado') {
            currentState.championId = id;
            document.getElementById('aliado-champion-name').innerText = name;
            updateAllyStats();
        } else {
            currentState.enemyChampionId = id;
            document.getElementById('inimigo-champion-name').innerText = name;
            updateEnemyStats();
        }
    } else {
        if (target === 'aliado') {
            currentState.itemIds[slotIndex] = id;
            updateAllyStats();
        } else {
            currentState.enemyItemIds[slotIndex] = id;
            updateEnemyStats();
        }
    }
    console.log(`Item ${id} solto em ${target} slot ${slotIndex}`);
}

/**
 * (v6.0.0) Manipula a remoção (clique) de um item ou campeão
 */
function handleRemove(target, type, slotIndex) {
    if (type === 'champion') {
        if (target === 'aliado') {
            currentState.championId = null;
            clearDropZone('campeao-selecionado-dropzone');
            updateAllyStats();
        } else {
            currentState.enemyChampionId = null;
            clearDropZone('inimigo-selecionado-dropzone');
            updateEnemyStats();
        }
    } else {
        if (target === 'aliado') {
            currentState.itemIds[slotIndex] = null;
            clearItemSlot('aliado', slotIndex);
            updateAllyStats();
        } else {
            currentState.enemyItemIds[slotIndex] = null;
            clearItemSlot('inimigo', slotIndex);
            updateEnemyStats();
        }
    }
}

// --- (FIM DA LÓGICA D&D NATIVO v6.0.0) ---


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
 * (Modificado v6.0.0)
 */
function createBibliotecaElement(id, type, name, imageUrl) {
    const div = document.createElement('div');
    div.className = 'biblioteca-item w-20 h-20 rounded-lg cursor-move p-0 relative group group-hover:z-50';
    div.dataset.id = id;
    div.dataset.type = type;
    
    // (D&D Nativo v6.0.0)
    div.draggable = true;
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = name;
    img.className = "w-full h-full object-cover transition-transform duration-200 group-hover:scale-110 rounded-lg";
    img.draggable = false; // Impede que a *imagem* seja arrastada (queremos arrastar o *div*)

    const nameOverlay = document.createElement('span');
    nameOverlay.innerText = name;
    nameOverlay.className = "item-tooltip absolute bottom-0 left-0 w-auto min-w-full text-white text-xs text-center p-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100 rounded-b-lg z-10";

    div.appendChild(img);
    div.appendChild(nameOverlay);
    
    // Comentário: Adiciona o listener de receita ao item da biblioteca.
    div.addEventListener('click', () => showRecipe(id, type));

    return div;
}

/**
 * Mostra a receita de um item clicado
 */
function showRecipe(id, type) {
    const receitaBloco = document.getElementById('receita-bloco');
    if (!receitaBloco) return;

    // (FOME) Impede que o clique no item da biblioteca
    // acione o drop (que também usa 'click' para remover)
    if (event) event.stopPropagation(); 

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
        hpregen: getStatAtLevel(champBase.hpregen, champBase.hpregenperlevel),
        mp: getStatAtLevel(champBase.mp, champBase.mpperlevel),
        mpregen: getStatAtLevel(champBase.mpregen, champBase.mpregenperlevel),
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
        renderDPS(0, 0); // (v6.2.0) Passa 0 para AD e AP
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

    // (v6.2.0) Por enquanto, dpsAd é igual ao dps total. dpsAp é 0.
    renderDPS(dps, 0); 
}

/**
 * (Refatorado v6.2.0) Renderiza o resultado final do DPS na UI
 */
function renderDPS(dpsAd, dpsAp) {
    const dpsTotal = dpsAd + dpsAp;
    
    // Comentário: Chama o helper de fonte dinâmica (v6.2.0)
    updateDPSBubble('resultado-dps-total-value', dpsTotal.toFixed(0), 'text-5xl', 'text-4xl');
    updateDPSBubble('resultado-dps-ad-value', dpsAd.toFixed(0), 'text-4xl', 'text-3xl');
    updateDPSBubble('resultado-dps-ap-value', dpsAp.toFixed(0), 'text-4xl', 'text-3xl');
}

/**
 * (NOVO v6.2.0 - DESESPERO 4) Helper para atualizar o texto do DPS
 * e ajustar dinamicamente o tamanho da fonte se o número for muito grande.
 */
function updateDPSBubble(elementId, value, defaultClass, smallClass) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerText = value;
    
    // Comentário: Se o número tiver 5+ dígitos (ex: 10000), 
    // reduzimos a fonte para evitar overflow.
    if (value.length >= 5) {
        el.classList.remove(defaultClass);
        el.classList.add(smallClass);
    } else {
        el.classList.add(defaultClass);
        el.classList.remove(smallClass);
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
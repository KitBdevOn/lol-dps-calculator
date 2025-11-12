/**
 * app.js v5.0.1 (Atualização de Protocolo)
 * Cérebro central da Calculadora de DPS.
 *
 * PROTOCOLO DE PERFORMANCE (v5.0.1):
 * 1. Nossa Máxima: Desperdício de energia é fome e desespero.
 * 2. Tudo deve estar comentado: Para guia, debug e brainstorming.
 * 3. Gerar um commit com base nos modelos pré-concebidos.
 * 4. Repetir 1 e 2.
 *
 * ATUALIZAÇÃO v5.0.0 (Redesign):
 * - (BUG D&D) O bug do D&D foi CORRIGIDO.
 * - (CAUSA) A causa raiz (overflow:hidden) foi REMOVIDA do index.html.
 * - (SOLUÇÃO) Os hotfixes (fallbackOnBody, forceFallback, z-index) foram REMOVIDOS
 * do `setupDragAndDrop` pois não são mais necessários. O D&D funciona nativamente.
 * - (CSS) `switchTab` foi atualizado para usar as novas classes `.tab-button-gold`.
 * - (CSS) `createBibliotecaElement` foi atualizado para usar as novas classes `.biblioteca-item`.
 * - (CSS) `showRecipe` foi atualizado.
 * - (Fontes) O design agora usa 'Cinzel' e 'Inter'.
 */

// --- Estado Global da Aplicação ---
// Comentário: DDragonData armazena os dados brutos da API da Riot.
let DDragonData = {
    version: "14.13.1", // Versão estável. Rápido e direto.
    baseUrl: "",
    championData: {},
    itemData: {}
};
DDragonData.baseUrl = `https://ddragon.leagueoflegends.com/cdn/${DDragonData.version}`;

// Comentário: (v4.1.0) currentState refatorado para usar arrays fixos de 6 slots para itens.
let currentState = {
    lang: 'pt_BR', // Comentário: (i18n) O idioma padrão (pt_BR ou en_US)
    activeTab: 'champion', // Comentário: (Tarefa 2) Estado inicial da aba

    // Estado do Aliado
    championId: null,
    level: 1,
    itemIds: [null, null, null, null, null, null], // Comentário: (BUG 2) Array fixo de 6 slots

    // Estado do Inimigo (NOVO v3.0.0)
    enemyChampionId: null,
    enemyLevel: 1,
    enemyItemIds: [null, null, null, null, null, null] // Comentário: (BUG 2) Array fixo de 6 slots
};
// ----------------------------------

/**
 * Função de Inicialização
 * Começa o processo de carregamento de dados e configuração da UI.
 */
function init() {
    // Comentário (Debug): Confirma que o JS foi carregado e está executando.
    console.log("Cérebro carregado. Iniciando protocolo de sobrevivência. Layout v5.0.1 (Azul/Dourado) ativo.");
    
    // --- (v3.1.0) Exibe a Versão do Patch ---
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
        filtroInput.addEventListener('input', handleFiltro);
    }
    const tabCampeoes = document.getElementById('tab-campeoes');
    const tabItens = document.getElementById('tab-itens');
    if (tabCampeoes && tabItens) {
        tabCampeoes.addEventListener('click', () => switchTab('champion'));
        tabItens.addEventListener('click', () => switchTab('item'));
    }

    // Comentário: (Refatoração v4.1.0) Configura as 14 zonas de Drag-and-Drop
    setupDragAndDrop();

    // Comentário: Configura os listeners dos inputs (Nível Aliado, Nível Inimigo).
    setupInputListeners();

    // Comentário: Inicia a busca de dados (campeões e itens) do Data Dragon.
    fetchData();
}

/**
 * (v5.0.0) Troca a aba ativa da biblioteca (Campeões/Itens)
 */
function switchTab(tabName) {
    // Comentário (Debug): Registra a troca de aba.
    console.log(`Trocando para aba: ${tabName}`);
    currentState.activeTab = tabName;

    const tabCampeoes = document.getElementById('tab-campeoes');
    const tabItens = document.getElementById('tab-itens');

    // Comentário: (v5.0.0) Lógica atualizada para usar classes Douradas
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

    // Comentário: Chama handleFiltro() para re-filtrar a lista com a nova aba.
    handleFiltro();
}

/**
 * (i18n) Troca o idioma da aplicação
 */
function switchLanguage(lang) {
    if (currentState.lang === lang) return;

    console.log(`Mudando idioma para: ${lang}`);
    currentState.lang = lang; // Atualiza o estado

    const langBR = document.getElementById('lang-br');
    const langUS = document.getElementById('lang-us');
    if (langBR && langUS) {
        langBR.style.opacity = (lang === 'pt_BR') ? '1' : '0.5';
        langUS.style.opacity = (lang === 'en_US') ? '1' : '0.5';
    }

    // Comentário: Reseta o filtro de busca.
    const filtroInput = document.getElementById('filtro-biblioteca');
    if (filtroInput) {
        filtroInput.value = '';
    }
    
    // Comentário: (v4.1.0) Limpa o estado COMPLETO
    currentState.championId = null;
    currentState.itemIds = [null, null, null, null, null, null];
    currentState.enemyChampionId = null;
    currentState.enemyItemIds = [null, null, null, null, null, null];
    
    // Comentário: (v4.1.0) Limpa visualmente as zonas de drop
    clearDropZone('campeao-selecionado-dropzone');
    clearDropZone('inimigo-selecionado-dropzone');
    // Comentário: (v4.1.0) Limpa os 12 slots de item
    for (let i = 0; i < 6; i++) {
        clearItemSlot('aliado', i);
        clearItemSlot('inimigo', i);
    }
    
    // Comentário: Zera os cálculos antes de buscar novos dados
    triggerCalculations();

    // Comentário: Recarrega todos os dados do Data Dragon no novo idioma.
    fetchData();
}

/**
 * (Refatorado v4.1.0) Helper para limpar visualmente uma dropzone de CAMPEÃO
 */
function clearDropZone(zoneId) {
    const dropzone = document.getElementById(zoneId);
    if (!dropzone) return;

    // Remove o campeão/item (elemento com data-id)
    const existingElement = dropzone.querySelector('div[data-id]');
    if (existingElement) existingElement.remove();

    // Comentário: Mostra o placeholder de campeão
    const placeholderText = dropzone.querySelector('span');
    if (placeholderText) placeholderText.style.display = 'flex';

    // Comentário: (v4.1.1) Limpa o nome do campeão
    const target = (zoneId === 'campeao-selecionado-dropzone') ? 'aliado' : 'inimigo';
    const nameEl = (target === 'aliado') ? document.getElementById('aliado-champion-name') : document.getElementById('inimigo-champion-name');
    if (nameEl) nameEl.innerText = ''; // Limpa o nome
}

/**
 * (NOVO v4.1.0 - BUG 2) Helper para limpar visualmente um SLOT de ITEM
 */
function clearItemSlot(target, slotIndex) {
    const slotId = `${target}-item-slot-${slotIndex}`;
    const slot = document.getElementById(slotId);
    if (!slot) return;
    
    // Remove o item (se existir)
    const itemElement = slot.querySelector('div[data-id]');
    if (itemElement) itemElement.remove();
    
    // Mostra o placeholder de texto
    const placeholderText = slot.querySelector('span');
    if (placeholderText) placeholderText.style.display = 'block';
}


/**
 * (Refatorado v5.0.0 - D&D CORRIGIDO) Configura as 14 zonas de Drag-and-Drop
 */
function setupDragAndDrop() {
    console.log("Configurando zonas D&D (v5.0.0 - Estático, Nativo)...");

    const bibliotecaLista = document.getElementById('biblioteca-lista');
    
    // 1. Configuração da Biblioteca (Fonte)
    new Sortable(bibliotecaLista, {
        group: { name: 'biblioteca', pull: 'clone', put: false },
        animation: 150,
        sort: false,
        
        // --- (CORREÇÃO v5.0.0 - BUG D&D MORTO) ---
        // Comentário: Todos os hotfixes (fallbackOnBody, forceFallback, fallbackClass)
        // foram REMOVIDOS. O bug de `overflow: hidden` não existe mais no
        // design v5.0.0, então o D&D funciona nativamente.
        // --- FIM DA CORREÇÃO ---
    });

    // 2. Configuração da Zona do Campeão ALIADO
    const campeaoAliadoDropzone = document.getElementById('campeao-selecionado-dropzone');
    new Sortable(campeaoAliadoDropzone, {
        group: { name: 'campeoes', put: ['biblioteca'] },
        animation: 150,
        onAdd: (evt) => handleChampionDrop(evt, 'aliado')
    });

    // 3. Configuração da Zona do Campeão INIMIGO
    const campeaoInimigoDropzone = document.getElementById('inimigo-selecionado-dropzone');
    new Sortable(campeaoInimigoDropzone, {
        group: { name: 'campeoes', put: ['biblioteca'] },
        animation: 150,
        onAdd: (evt) => handleChampionDrop(evt, 'inimigo')
    });

    // 4. Configuração dos 12 SLOTS DE ITEM (6 Aliado, 6 Inimigo)
    // Comentário: (v4.1.0) Lógica de 12 instâncias Sortable mantida.
    for (let i = 0; i < 6; i++) {
        // Aliado
        const aliadoSlot = document.getElementById(`aliado-item-slot-${i}`);
        if (aliadoSlot) {
            new Sortable(aliadoSlot, {
                group: { name: 'itens', put: ['biblioteca'] },
                animation: 150,
                onAdd: (evt) => handleItemDrop(evt, 'aliado', i)
            });
        }
        
        // Inimigo
        const inimigoSlot = document.getElementById(`inimigo-item-slot-${i}`);
        if (inimigoSlot) {
            new Sortable(inimigoSlot, {
                group: { name: 'itens', put: ['biblioteca'] },
                animation: 150,
                onAdd: (evt) => handleItemDrop(evt, 'inimigo', i)
            });
        }
    }

    console.log("Sortable.js v5.0.0 (Nativo) inicializado.");
}

/**
 * (Refatorado v4.1.0 - BUG 1) Manipula o drop de um CAMPEÃO
 */
function handleChampionDrop(evt, target) {
    const el = evt.item; // O clone que foi solto
    const dropzone = (target === 'aliado') ? document.getElementById('campeao-selecionado-dropzone') : document.getElementById('inimigo-selecionado-dropzone');
    const nameEl = (target === 'aliado') ? document.getElementById('aliado-champion-name') : document.getElementById('inimigo-champion-name');

    // Comentário (Debug): Rejeita o drop se não for um campeão.
    if (el.dataset.type !== 'champion') {
        console.warn(`Rejeitado: Apenas campeões são permitidos na zona do ${target}.`);
        el.parentNode.removeChild(el); // Destrói o clone
        return;
    }

    // Comentário: Remove o campeão antigo (se houver)
    const existingChamp = dropzone.querySelector('div[data-id]');
    if (existingChamp) {
        existingChamp.remove();
    }
    
    // Comentário: Esconde o texto "Aliado" / "Inimigo".
    const placeholder = dropzone.querySelector('span');
    if (placeholder) placeholder.style.display = 'none';

    // Comentário: Atualiza o estado global
    const champId = el.dataset.id;
    if (target === 'aliado') {
        currentState.championId = champId;
        console.log(`Campeão Aliado: ${champId}`);
    } else {
        currentState.enemyChampionId = champId;
        console.log(`Campeão Inimigo: ${champId}`);
    }
    
    // Comentário: (BUG 1) Atualiza o nome do campeão na UI
    if (nameEl && DDragonData.championData && DDragonData.championData[champId]) {
        nameEl.innerText = DDragonData.championData[champId].name;
    }
    
    // Comentário: Adiciona um listener de clique no clone para removê-lo.
    el.addEventListener('click', () => {
        el.remove();
        if (placeholder) placeholder.style.display = 'flex'; // Mostra o placeholder
        
        // Comentário: Limpa o estado
        if (target === 'aliado') {
            currentState.championId = null;
            if (nameEl) nameEl.innerText = ''; // Limpa o nome
        } else {
            currentState.enemyChampionId = null;
            if (nameEl) nameEl.innerText = ''; // Limpa o nome
        }
        
        triggerCalculations(); // Recalcula (para zerar os stats)
    });

    triggerCalculations(); // Dispara o cálculo
}


/**
 * (Refatorado v4.1.0 - BUG 2) Manipula o drop de um ITEM em um SLOT específico
 */
function handleItemDrop(evt, target, slotIndex) {
    const el = evt.item; // O clone que foi solto
    const slot = document.getElementById(`${target}-item-slot-${slotIndex}`);
    if (!slot) return;

    // Comentário (Debug): Rejeita o drop se *não* for um item.
    if (el.dataset.type !== 'item') {
        console.warn(`Rejeitado: Apenas itens são permitidos na zona do ${target}.`);
         el.parentNode.removeChild(el); // Destrói o clone
         return;
    }

    // Comentário: Verifica se o slot já tem um item
    const existingItem = slot.querySelector('div[data-id]');
    if (existingItem) {
        existingItem.remove(); // Remove o item antigo do slot
    }
    
    // Comentário: Esconde o texto do placeholder (ex: "Slot 1")
    const placeholder = slot.querySelector('span');
    if (placeholder) placeholder.style.display = 'none';

    // Comentário: Atualiza o array de IDs de itens no estado global
    const itemId = el.dataset.id;
    if (target === 'aliado') {
        currentState.itemIds[slotIndex] = itemId; // Insere o ID no slot correto
        console.log(`Itens Aliado: [${currentState.itemIds.join(', ')}]`);
    } else {
        currentState.enemyItemIds[slotIndex] = itemId; // Insere o ID no slot correto
        console.log(`Itens Inimigo: [${currentState.enemyItemIds.join(', ')}]`);
    }

    // Comentário: Adiciona listener de clique para remover o item do slot
    el.addEventListener('click', () => {
        el.remove();
        if (placeholder) placeholder.style.display = 'block'; // Mostra o placeholder
        
        // Comentário: Atualiza o estado global (remove o item do slot)
        if (target === 'aliado') {
            currentState.itemIds[slotIndex] = null;
        } else {
            currentState.enemyItemIds[slotIndex] = null;
        }
        
        triggerCalculations(); // Recalcula
    });

    triggerCalculations(); // Dispara o cálculo
}


/**
 * Configura os listeners para os inputs de Nível (Aliado e Inimigo)
 */
function setupInputListeners() {
    const levelInput = document.getElementById('level');
    const enemyLevelInput = document.getElementById('enemy-level');

    levelInput.addEventListener('change', (e) => {
        currentState.level = parseInt(e.target.value) || 1;
        triggerCalculations();
    });
    
    enemyLevelInput.addEventListener('change', (e) => {
        currentState.enemyLevel = parseInt(e.target.value) || 1;
        triggerCalculations();
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

    bibliotecaLista.innerHTML = ''; // Limpa placeholders
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
    // Comentário: (v5.0.0) Usa a nova classe .biblioteca-item (80x80px)
    div.className = 'biblioteca-item w-20 h-20 rounded-lg cursor-move p-0 relative group group-hover:z-50';
    div.dataset.id = id;
    div.dataset.type = type;

auto-scroll
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = name;
    img.className = "w-full h-full object-cover transition-transform duration-200 group-hover:scale-110 rounded-lg";
    img.draggable = false;

    const nameOverlay = document.createElement('span');
    nameOverlay.innerText = name;
    // Comentário: (v5.0.0) Atualizado para o novo estilo de tooltip
    nameOverlay.className = "item-tooltip absolute bottom-0 left-0 w-auto min-w-full text-white text-xs text-center p-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100 rounded-b-lg z-10";

    div.appendChild(img);
    div.appendChild(nameOverlay);
    
    // Comentário: Adiciona listener para mostrar receita
    div.addEventListener('click', () => showRecipe(id, type));

    return div;
}

/**
 * (v3.0.0) Mostra a receita de um item clicado
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

        // Comentário: (v5.0.0) Reutiliza .biblioteca-item (64x64)
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

/**
 * (v3.0.0) Gatilho central para recalcular tudo.
 */
function triggerCalculations() {
    // Comentário: (v4.1.0) Filtra 'null' dos arrays de itens antes de calcular
    const aliadoItemIds = currentState.itemIds.filter(id => id !== null);
    const inimigoItemIds = currentState.enemyItemIds.filter(id => id !== null);

    const aliadoStats = calculateStats(currentState.championId, currentState.level, aliadoItemIds);
    const inimigoStats = calculateStats(currentState.enemyChampionId, currentState.enemyLevel, inimigoItemIds);

    renderRPGCard('aliado', aliadoStats);
    renderRPGCard('inimigo', inimigoStats);

    calculateDPS(aliadoStats, inimigoStats);
}


/**
 * (Refatorado v3.0.0) Calcula todos os status para um alvo (aliado ou inimigo)
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
        hpregen: getStatAtLevel(champBase.hpregen, champBase.hpregenperlevel), // (BUG 3) Adicionado
        mp: getStatAtLevel(champBase.mp, champBase.mpperlevel),
        mpregen: getStatAtLevel(champBase.mpregen, champBase.mpregenperlevel), // (BUG 3) Adicionado
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
            totalStats.hpregen += itemStats.FlatHPRegenMod || 0; // (BUG 3) Adicionado
            totalStats.mpregen += itemStats.FlatMPRegenMod || 0; // (BUG 3) Adicionado
            
            itemAttackSpeedBonus += (itemStats.PercentAttackSpeedMod || 0);
        }
    }
    
    const asBonusFromLevel = (getStatAtLevel(0, champBase.attackspeedperlevel) / 100);
    const asBonusFromItems = itemAttackSpeedBonus;
    
    totalStats.attackspeed = totalStats.attackspeed_base * (1 + asBonusFromLevel + asBonusFromItems);
    
    return totalStats;
}

/**
 * (Refatorado v4.1.0 - BUG 3) Renderiza o "Card RPG" com ícones
 */
function renderRPGCard(target, stats) {
    const containerId = (target === 'aliado') ? 'aliado-stats-container' : 'inimigo-stats-container';
    const container = document.getElementById(containerId);
    if (!container) return;

    // Comentário: Se 'stats' for nulo (sem campeão), limpa o card.
    if (!stats) {
        container.innerHTML = `<span class="text-gray-500 text-sm">Selecione um ${target === 'aliado' ? 'Aliado' : 'Inimigo'}</span>`;
        return;
    }

    // Comentário: Limpa o container antes de adicionar novos stats
    container.innerHTML = '';
    
    // Comentário: (BUG 3) Cria a tabela de stats
    const statsTable = document.createElement('div');
    statsTable.className = 'stats-table';

    // Comentário: Helper para criar uma linha da tabela
    const createStatRow = (iconClass, name, value, decimals = 0) => {
        const item = document.createElement('div');
        item.className = 'stat-item';
        
        const icon = document.createElement('div');
        icon.className = `stat-icon ${iconClass}`;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'stat-text';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'stat-name';
        nameSpan.innerText = name;
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'stat-value';
        valueSpan.innerText = value.toFixed(decimals);
        
        textDiv.appendChild(nameSpan);
        textDiv.appendChild(valueSpan);
        item.appendChild(icon);
        item.appendChild(textDiv);
        return item;
    };
    
    // Comentário: (BUG 3) Adiciona os stats principais
    statsTable.appendChild(createStatRow('stat-icon-hp', 'HP', stats.hp));
    statsTable.appendChild(createStatRow('stat-icon-mp', 'MP', stats.mp));
    statsTable.appendChild(createStatRow('stat-icon-hpregen', 'HP5', stats.hpregen, 1));
    statsTable.appendChild(createStatRow('stat-icon-mpregen', 'MP5', stats.mpregen, 1));
    statsTable.appendChild(createStatRow('stat-icon-ad', 'AD', stats.ad, 1));
    statsTable.appendChild(createStatRow('stat-icon-attackspeed', 'AS', stats.attackspeed, 3));
    statsTable.appendChild(createStatRow('stat-icon-armor', 'Armor', stats.armor, 1));
    statsTable.appendChild(createStatRow('stat-icon-spellblock', 'MR', stats.spellblock, 1));
    statsTable.appendChild(createStatRow('stat-icon-crit', 'Crit %', stats.crit));
    statsTable.appendChild(createStatRow('stat-icon-movespeed', 'MS', stats.movespeed));
    
    container.appendChild(statsTable);
}


/**
 * (Refatorado v3.0.0) Calcula o DPS final (Aliado vs Inimigo)
 */
function calculateDPS(aliadoStats, inimigoStats) {
    if (!aliadoStats) {
        renderDPS(0);
        return;
    }
    
    const targetArmor = inimigoStats ? inimigoStats.armor : 0; // (v4.1.0) Assume 0 se inimigo não estiver
    
    const effectiveArmor = Math.max(0, targetArmor);
    const damageMultiplier = 100 / (100 + effectiveArmor);

    const critChance = aliadoStats.crit / 100;
    let critDamageBonus = 1.0; 
    
    // Comentário: (v4.1.0) Filtra 'null' antes de checar 'includes'
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
    
    // Comentário: (v4.1.0) A biblioteca é um 'grid', usamos 'block'.
    const displayType = 'block'; 

    for (const item of itens) {
        const img = item.querySelector('img');
        if (img) {
            const nome = img.alt.toLowerCase();
            const type = item.dataset.type;

            const matchesTermo = nome.includes(termo);
            const matchesTab = (type === activeType);

            if (matchesTermo && matchesTab) {
                item.style.display = displayType;
            } else {
                item.style.display = 'none';
            }
        }
    }
}

// --- (CORREÇÃO v4.0.1) ---
// Comentário: Chama a função init() diretamente.
init();
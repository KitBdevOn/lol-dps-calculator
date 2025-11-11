/**
 * app.js
 * Cérebro central da Calculadora de DPS.
 * Gerencia a busca de dados, a interface (D&D) e os cálculos.
 * Execução de Comando 2 e 3.
 */

// --- Estado Global da Aplicação ---
let DDragonData = {
    version: "14.13.1", // Versão estável. Rápido e direto.
    baseUrl: "",
    championData: {},
    itemData: {}
};
DDragonData.baseUrl = `https://ddragon.leagueoflegends.com/cdn/${DDragonData.version}`;

let currentState = {
    championId: null,
    level: 1,
    itemIds: [],
    targetArmor: 100,
    targetMr: 100
};
// ----------------------------------

// Ponto de entrada: Espera o HTML estar pronto.
document.addEventListener('DOMContentLoaded', init);

/**
 * Função de Inicialização
 * Começa o processo de carregamento de dados e configuração da UI.
 */
function init() {
    console.log("Cérebro carregado. Iniciando protocolo de sobrevivência. Layout 'Streaming' ativo.");
    
    // 1. Configurar o Drag-and-Drop (Sortable.js)
    setupDragAndDrop();

    // 2. Configurar Listeners de Input
    setupInputListeners();

    // 3. Buscar os dados do Data Dragon (Comando 2)
    fetchData();
}

/**
 * Configura as zonas de Drag-and-Drop (D&D) usando Sortable.js
 */
function setupDragAndDrop() {
    console.log("Configurando zonas D&D...");

    const bibliotecaLista = document.getElementById('biblioteca-lista');
    const campeaoDropzone = document.getElementById('campeao-selecionado-dropzone');
    const itensDropzone = document.getElementById('itens-selecionados-dropzone');

    // 1. Configuração da Biblioteca (de onde se "puxa")
    new Sortable(bibliotecaLista, {
        group: { name: 'biblioteca', pull: 'clone', put: false },
        animation: 150,
        sort: false
    });

    // 2. Configuração da Zona do Campeão (onde se "solta")
    new Sortable(campeaoDropzone, {
        group: { name: 'campeoes', put: ['biblioteca'] },
        animation: 150,
        onAdd: function (evt) {
            const el = evt.item;
            // Permite soltar apenas se for um campeão e a zona estiver vazia
            if (el.dataset.type !== 'champion' || campeaoDropzone.children.length > 1) {
                el.parentNode.removeChild(el); // Rejeita o item
                return;
            }
            
            // Limpa o texto "Solte o Campeão"
            const placeholder = campeaoDropzone.querySelector('span');
            if (placeholder) placeholder.style.display = 'none';

            currentState.championId = el.dataset.id;
            console.log(`Campeão selecionado: ${currentState.championId}`);
            
            // Adiciona evento de clique para remover (e recalcular)
            el.addEventListener('click', () => {
                el.remove();
                if (placeholder) placeholder.style.display = 'block'; // Mostra placeholder de novo
                currentState.championId = null;
                calculateTotalStats(); // Recalcula (para zerar)
            });

            calculateTotalStats(); // Dispara o cálculo
        }
    });

    // 3. Configuração da Zona de Itens (onde se "solta")
    new Sortable(itensDropzone, {
        group: { name: 'itens', put: ['biblioteca'] },
        animation: 150,
        onAdd: function (evt) {
            const el = evt.item;
            // Permite soltar apenas se for um item e tiver menos de 6 itens
            if (el.dataset.type !== 'item' || itensDropzone.children.length > 6) {
                el.parentNode.removeChild(el); // Rejeita o item
                return;
            }

            // Atualiza o estado
            currentState.itemIds = Array.from(itensDropzone.children)
                                       .map(child => child.dataset.id)
                                       .filter(id => id); // Filtra placeholders
            console.log(`Itens: [${currentState.itemIds.join(', ')}]`);

            // Adiciona evento de clique para remover (e recalcular)
            el.addEventListener('click', () => {
                el.remove();
                currentState.itemIds = Array.from(itensDropzone.children)
                                           .map(child => child.dataset.id)
                                           .filter(id => id);
                calculateTotalStats(); // Recalcula
            });

            calculateTotalStats(); // Dispara o cálculo
        }
    });
    console.log("Sortable.js inicializado.");
}

/**
 * Configura os listeners para os inputs de Nível e Alvo
 */
function setupInputListeners() {
    const levelInput = document.getElementById('level');
    const targetArmorInput = document.getElementById('target-armor');
    const targetMrInput = document.getElementById('target-mr');

    levelInput.addEventListener('change', (e) => {
        currentState.level = parseInt(e.target.value) || 1;
        console.log(`Nível alterado: ${currentState.level}`);
        calculateTotalStats();
    });
    targetArmorInput.addEventListener('input', (e) => {
        currentState.targetArmor = parseInt(e.target.value) || 0;
        console.log(`Armadura Alvo: ${currentState.targetArmor}`);
        calculateTotalStats(); // Otimização futura: só recalcular DPS
    });
    targetMrInput.addEventListener('input', (e) => {
        currentState.targetMr = parseInt(e.target.value) || 0;
        console.log(`RM Alvo: ${currentState.targetMr}`);
        calculateTotalStats(); // Otimização futura: só recalcular DPS
    });
}

/**
 * Busca os dados do Data Dragon (Comando 2)
 */
async function fetchData() {
    console.log(`Iniciando busca de dados da versão ${DDragonData.version}...`);
    try {
        // Buscar campeões e itens em paralelo
        const [champResponse, itemResponse] = await Promise.all([
            fetch(`${DDragonData.baseUrl}/data/en_US/champion.json`),
            fetch(`${DDragonData.baseUrl}/data/en_US/item.json`)
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

    // 2. Adiciona Itens (apenas itens compráveis e do Summoner's Rift)
    for (const itemId in itemData) {
        const item = itemData[itemId];
        // Filtro MVP: Itens compráveis, do SR, não-encantamentos, não-consumíveis
        if (item.gold.purchasable && item.maps['11'] && !item.tags.includes('Trinket') && !item.tags.includes('Consumable') && item.depth === 3) {
            const el = createBibliotecaElement(
                itemId,
                'item',
                item.name,
                `${DDragonData.baseUrl}/img/item/${item.image.full}`
            );
            bibliotecaLista.appendChild(el);
        }
    }

    console.log(`Biblioteca populada com ${Object.keys(championData).length} campeões e itens filtrados.`);
}

/**
 * Helper para criar um elemento arrastável para a biblioteca
 */
function createBibliotecaElement(id, type, name, imageUrl) {
    const div = document.createElement('div');
    div.className = 'w-16 h-16 bg-gray-dark rounded-lg cursor-move p-0 relative overflow-hidden group shadow-lg border border-gray-light';
    div.dataset.id = id;
    div.dataset.type = type; // 'champion' or 'item'

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = name;
    img.className = "w-full h-full object-cover transition-transform duration-200 group-hover:scale-110";
    img.draggable = false; // Previne o "ghost image" padrão do HTML5

    const nameOverlay = document.createElement('span');
    nameOverlay.innerText = name;
    nameOverlay.className = "absolute bottom-0 left-0 w-full bg-black bg-opacity-70 text-white text-xs text-center p-1 truncate transition-opacity duration-200 opacity-0 group-hover:opacity-100";

    div.appendChild(img);
    div.appendChild(nameOverlay);
    return div;
}

/**
 * Calcula todos os status (Comando 3 - Coração)
 */
function calculateTotalStats() {
    if (!currentState.championId) {
        // Se não há campeão, zera os campos
        renderRPGCard(null);
        renderDPS(0);
        return;
    }

    const level = currentState.level - 1; // Nível 1 = índice 0
    const champBase = DDragonData.championData[currentState.championId].stats;

    // 1. Calcula Stats Base (Fórmula oficial)
    const getStatAtLevel = (base, perLevel) => {
        return base + (perLevel * level * (0.7025 + (0.0175 * level)));
    };

    let totalStats = {
        hp: getStatAtLevel(champBase.hp, champBase.hpperlevel),
        mp: getStatAtLevel(champBase.mp, champBase.mpperlevel),
        ad: getStatAtLevel(champBase.attackdamage, champBase.attackdamageperlevel),
        armor: getStatAtLevel(champBase.armor, champBase.armorperlevel),
        spellblock: getStatAtLevel(champBase.spellblock, champBase.spellblockperlevel),
        // Attack Speed é especial
        attackspeed: champBase.attackspeed * (1 + (getStatAtLevel(0, champBase.attackspeedperlevel) / 100)),
        crit: 0,
        movespeed: champBase.movespeed
    };

    // 2. Adiciona Stats dos Itens
    for (const itemId of currentState.itemIds) {
        const itemStats = DDragonData.itemData[itemId]?.stats;
        if (!itemStats) continue;
        
        // Mapeia os stats do JSON (ex: FlatPhysicalDamageMod) para o nosso objeto
        totalStats.hp += itemStats.FlatHPPoolMod || 0;
        totalStats.mp += itemStats.FlatMPPoolMod || 0;
        totalStats.ad += itemStats.FlatPhysicalDamageMod || 0;
        totalStats.armor += itemStats.FlatArmorMod || 0;
        totalStats.spellblock += itemStats.FlatSpellBlockMod || 0;
        totalStats.crit += (itemStats.FlatCritChanceMod || 0) * 100; // Crit é 0-100
        totalStats.movespeed += itemStats.FlatMovementSpeedMod || 0;
        // Attack Speed de itens (Percentual)
        totalStats.attackspeed += (champBase.attackspeed * (itemStats.PercentAttackSpeedMod || 0));
    }
    
    // 3. Renderiza o Card RPG
    renderRPGCard(totalStats);

    // 4. Calcula o DPS
    calculateDPS(totalStats);
}

/**
 * Renderiza o "Card RPG" com os status calculados
 */
function renderRPGCard(stats) {
    const card = document.getElementById('card-rpg-stats');
    const pre = card.querySelector('pre');

    if (!stats) {
        pre.innerText = "<!-- Selecione um Campeão -->";
        return;
    }

    // Formata os stats para exibição
    const displayStats = `
Vida (HP):       ${stats.hp.toFixed(0)}
Mana (MP):       ${stats.mp.toFixed(0)}
Dano Atq (AD):   ${stats.ad.toFixed(2)}
Vel. Atq (AS):   ${stats.attackspeed.toFixed(3)}
Armadura:        ${stats.armor.toFixed(2)}
Res. Mágica:     ${stats.spellblock.toFixed(2)}
Chance Crítico:  ${stats.crit.toFixed(0)}%
Vel. Movimento:  ${stats.movespeed.toFixed(0)}
    `;
    pre.innerText = displayStats.trim();
}

/**
 * Calcula o DPS final (Comando 3 - Resultado)
 */
function calculateDPS(totalStats) {
    if (!totalStats) {
        renderDPS(0);
        return;
    }
    
    // Fórmula de Dano (MVP: Apenas Ataque Básico)
    const targetArmor = currentState.targetArmor;
    
    // 1. Multiplicador de Dano (Armadura)
    const damageMultiplier = 100 / (100 + targetArmor);

    // 2. Cálculo de DPS com Crítico (MISSÃO 6 - EXECUTADA)
    
    // Chance de crítico (0.0 a 1.0)
    const critChance = totalStats.crit / 100;
    
    // Dano de crítico (Bônus de 100% = 1.0)
    let critDamageBonus = 1.0; 
    
    // Checa se o Gume do Infinito (ID 3031) está nos itens
    // Gume (14.13+) dá 50% de Dano Crítico (Bônus de 0.5)
    // Nosso bônus total se torna 1.5 (150%)
    const hasInfinityEdge = currentState.itemIds.includes('3031');
    if (hasInfinityEdge) {
        critDamageBonus = 1.5;
    }
    
    // DPS Médio de Ataque Básico:
    // DPS_Médio = DPS_Base * ( 1 + (ChanceDeCritico * BonusDeDanoCritico) )
    const baseDPS = (totalStats.ad * totalStats.attackspeed) * damageMultiplier;
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
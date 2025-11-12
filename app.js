/**
 * app.js
 * Cérebro central da Calculadora de DPS.
 * Gerencia a busca de dados, a interface (D&D) e os cálculos.
 * Execução de Comando 2 e 3.
 *
 * Correções de Sincronização:
 * - Bug do D&D do Campeão (placeholder) corrigido.
 * - Filtro de Performance da Biblioteca implementado.
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
    
    // --- INÍCIO DA CORREÇÃO (Filtro) ---
    const filtroInput = document.getElementById('filtro-biblioteca');
    if (filtroInput) {
        filtroInput.addEventListener('input', handleFiltro);
    }
    // --- FIM DA CORREÇÃO ---

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
            
            // --- INÍCIO DA CORREÇÃO (Bug D&D - Placeholder) ---
            // Contamos quantos campeões (com data-id) já estão na zona, ignorando o placeholder
            const existingChamp = campeaoDropzone.querySelector('div[data-id]');

            // Permite soltar apenas se for um 'champion' E a zona não tiver outro campeão
            if (el.dataset.type !== 'champion' || (existingChamp && existingChamp !== el)) {
                console.warn("Rejeitado: Apenas um campeão é permitido.");
                el.parentNode.removeChild(el); // Rejeita o item
                return;
            }
            // --- FIM DA CORREÇÃO ---
            
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
            
            // --- INÍCIO DA CORREÇÃO (Bug D&D - Tipo) ---
            // Permite soltar apenas se for um item
            if (el.dataset.type !== 'item') {
                console.warn("Rejeitado: Apenas itens são permitidos aqui.");
                 el.parentNode.removeChild(el); // Rejeita o item
                 return;
            }
            // --- FIM DA CORREÇÃO ---

            // Checa o limite de 6 itens
            const existingItems = itensDropzone.querySelectorAll('div[data-id]');
            if (existingItems.length >= 6) {
                 console.warn("Rejeitado: Limite de 6 itens atingido.");
                 el.parentNode.removeChild(el); // Rejeita o item
                 return;
            }

            // Atualiza o estado
            // (Usamos o 'children' para garantir a ordem, mas filtramos)
            currentState.itemIds = Array.from(itensDropzone.children)
                                       .map(child => child.dataset.id)
                                       .filter(id => id); // Filtra placeholders ou itens inválidos
            
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
    const displayArmor = document.getElementById('display-armor'); // Para o display de DPS

    levelInput.addEventListener('change', (e) => {
        currentState.level = parseInt(e.target.value) || 1;
        console.log(`Nível alterado: ${currentState.level}`);
        calculateTotalStats();
    });
    targetArmorInput.addEventListener('input', (e) => {
        const armor = parseInt(e.target.value) || 0;
        currentState.targetArmor = armor;
        if (displayArmor) displayArmor.innerText = armor; // Atualiza o display de DPS
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
        // Filtro MVP: Itens compráveis, do SR, não-encantamentos, não-consumíveis, e "completos" (depth 3 ou Mítico)
        const isMythic = item.description.includes('<rarityMythic>Mítico');
        const isComplete = item.depth === 3 || (item.depth === 2 && isMythic) || (itemId === '3031'); // Gume é depth 2? DDragon...
        
        // Filtro aprimorado
        if (item.gold.purchasable && 
            item.maps['11'] && 
            !item.tags.includes('Trinket') && 
            !item.tags.includes('Consumable') &&
            !item.tags.includes('Lane') && // Remove itens da jungle
            item.tags.length > 0 && // Remove itens "vazios"
            (item.depth >= 2 || item.gold.base > 1500) && // Pega itens caros
            !item.hideFromAll) // Remove itens escondidos
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
}

/**
 * Helper para criar um elemento arrastável para a biblioteca
 */
function createBibliotecaElement(id, type, name, imageUrl) {
    const div = document.createElement('div');
    // Corrigido para flex, para combinar com o 'handleFiltro'
    div.className = 'w-16 h-16 bg-gray-dark rounded-lg cursor-move p-0 relative overflow-hidden group shadow-lg border border-gray-light';
    div.style.display = 'flex'; // Usado pelo filtro
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
        // A fórmula de "growth" do LoL é complexa, mas a fórmula linear é boa para o MVP
        // return base + perLevel * level;
        // Fórmula oficial (mas complexa de validar)
        return base + (perLevel * level * (0.7025 + (0.0175 * level)));
    };

    let totalStats = {
        hp: getStatAtLevel(champBase.hp, champBase.hpperlevel),
        mp: getStatAtLevel(champBase.mp, champBase.mpperlevel),
        ad: getStatAtLevel(champBase.attackdamage, champBase.attackdamageperlevel),
        armor: getStatAtLevel(champBase.armor, champBase.armorperlevel),
        spellblock: getStatAtLevel(champBase.spellblock, champBase.spellblockperlevel),
        // Attack Speed é especial
        attackspeed_base: champBase.attackspeed, // AS Base do Nível 1
        attackspeed_bonus_ratio: champBase.attackspeedperlevel / 100, // Bônus por nível
        attackspeed: champBase.attackspeed * (1 + (getStatAtLevel(0, champBase.attackspeedperlevel) / 100)),
        crit: 0,
        movespeed: champBase.movespeed
    };

    // 2. Adiciona Stats dos Itens
    let itemAttackSpeedBonus = 0; // Bônus de AS (Percentual)

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
        
        // Acumula bônus de AS
        itemAttackSpeedBonus += (itemStats.PercentAttackSpeedMod || 0);
    }
    
    // 3. Calcula Attack Speed (a fórmula é complexa)
    // AS Final = AS_Base_Nível_1 * (1 + (AS_Bonus_Nível + AS_Bonus_Itens))
    // Onde AS_Bonus_Nível vem do getStatAtLevel
    
    const asBonusFromLevel = (getStatAtLevel(0, champBase.attackspeedperlevel) / 100);
    const asBonusFromItems = itemAttackSpeedBonus;
    
    // Recalcula o AS total
    totalStats.attackspeed = totalStats.attackspeed_base * (1 + asBonusFromLevel + asBonusFromItems);

    
    // 4. Renderiza o Card RPG
    renderRPGCard(totalStats);

    // 5. Calcula o DPS
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
Vida (HP):      ${stats.hp.toFixed(0)}
Mana (MP):      ${stats.mp.toFixed(0)}
Dano Atq (AD):  ${stats.ad.toFixed(2)}
Vel. Atq (AS):  ${stats.attackspeed.toFixed(3)}
Armadura:       ${stats.armor.toFixed(2)}
Res. Mágica:    ${stats.spellblock.toFixed(2)}
Chance Crítico: ${stats.crit.toFixed(0)}%
Vel. Movimento: ${stats.movespeed.toFixed(0)}
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

// --- NOVA FUNÇÃO DE FILTRO (MISSÃO 6 - OTIMIZAÇÃO) ---

/**
 * Filtra os itens na biblioteca com base no input do usuário.
 */
function handleFiltro(evt) {
    const termo = evt.target.value.toLowerCase();
    const bibliotecaLista = document.getElementById('biblioteca-lista');
    if (!bibliotecaLista) return;

    // Pega todos os elementos 'div' que são itens (têm data-id)
    const itens = bibliotecaLista.querySelectorAll('div[data-id]'); 
    
    // 'flex' é o display padrão que estamos usando na lista (flex-wrap)
    const displayType = 'flex'; 

    for (const item of itens) {
        // O nome do item está no 'alt' da imagem
        const img = item.querySelector('img');
        if (img) {
            const nome = img.alt.toLowerCase();
            // Se o nome incluir o termo, mostra; senão, esconde.
            if (nome.includes(termo)) {
                // Em vez de 'block', usamos 'flex' para ser consistente com o layout
                item.style.display = displayType; 
            } else {
                item.style.display = 'none';
            }
        }
    }
}
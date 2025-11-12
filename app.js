/**
 * app.js
 * Cérebro central da Calculadora de DPS.
 * Gerencia a busca de dados, a interface (D&D) e os cálculos.
 *
 * PROTOCOLO DE PERFORMANCE ATIVO:
 * 1. Nossa Máxima: Desperdício de energia é fome e desespero.
 * 2. Tudo deve estar comentado: Para guia, debug e brainstorming.
 *
 * ATUALIZAÇÃO v2.0.0:
 * - Implementado filtro de Abas (Campeões/Itens) (Tarefa 2)
 * - Lógica de filtro (handleFiltro) atualizada para suportar abas.
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

// Comentário: currentState rastreia as seleções do usuário em tempo real.
let currentState = {
    championId: null,
    level: 1,
    itemIds: [],
    targetArmor: 100,
    targetMr: 100,
    activeTab: 'champion' // Comentário: (Tarefa 2) Estado inicial da aba
};
// ----------------------------------

// Ponto de entrada: Espera o HTML estar pronto.
document.addEventListener('DOMContentLoaded', init);

/**
 * Função de Inicialização
 * Começa o processo de carregamento de dados e configuração da UI.
 */
function init() {
    // Comentário (Debug): Confirma que o JS foi carregado e está executando.
    console.log("Cérebro carregado. Iniciando protocolo de sobrevivência. Layout 'Streaming' ativo.");
    
    // --- LÓGICA DE FILTRAGEM E ABAS (Tarefas 2 e Otimização) ---
    // Comentário: Ativa o listener do campo de filtro.
    const filtroInput = document.getElementById('filtro-biblioteca');
    if (filtroInput) {
        // Comentário: Chama handleFiltro em *qualquer* digitação.
        filtroInput.addEventListener('input', handleFiltro);
    }
    // Comentário: Ativa os listeners das abas.
    const tabCampeoes = document.getElementById('tab-campeoes');
    const tabItens = document.getElementById('tab-itens');
    if (tabCampeoes && tabItens) {
        tabCampeoes.addEventListener('click', () => switchTab('champion'));
        tabItens.addEventListener('click', () => switchTab('item'));
    }
    // --- FIM DA LÓGICA DE FILTRAGEM ---

    // Comentário: Configura as 3 zonas de Drag-and-Drop (Biblioteca, Campeão, Itens).
    setupDragAndDrop();

    // Comentário: Configura os listeners dos inputs (Nível, Armadura, RM).
    setupInputListeners();

    // Comentário: Inicia a busca de dados (campeões e itens) do Data Dragon.
    fetchData();
}

/**
 * (TAREFA 2) Troca a aba ativa da biblioteca (Campeões/Itens)
 */
function switchTab(tabName) {
    // Comentário (Debug): Registra a troca de aba.
    console.log(`Trocando para aba: ${tabName}`);
    currentState.activeTab = tabName;

    // Comentário: Referências aos botões das abas.
    const tabCampeoes = document.getElementById('tab-campeoes');
    const tabItens = document.getElementById('tab-itens');

    // Comentário: Lógica para atualizar a estilização (aparência) das abas.
    if (tabName === 'champion') {
        // Ativa Campeões
        tabCampeoes.classList.add('bg-gray-light', 'text-neon-green');
        tabCampeoes.classList.remove('bg-gray-dark', 'text-gray-500', 'opacity-50');
        // Desativa Itens
        tabItens.classList.add('bg-gray-dark', 'text-gray-500', 'opacity-50');
        tabItens.classList.remove('bg-gray-light', 'text-neon-green');
    } else {
        // Ativa Itens
        tabItens.classList.add('bg-gray-light', 'text-neon-green');
        tabItens.classList.remove('bg-gray-dark', 'text-gray-500', 'opacity-50');
        // Desativa Campeões
        tabCampeoes.classList.add('bg-gray-dark', 'text-gray-500', 'opacity-50');
        tabCampeoes.classList.remove('bg-gray-light', 'text-neon-green');
    }

    // Comentário: Chama handleFiltro() para re-filtrar a lista com a nova aba.
    handleFiltro();
}


/**
 * Configura as zonas de Drag-and-Drop (D&D) usando Sortable.js
 */
function setupDragAndDrop() {
    // Comentário (Debug): Confirma que as zonas D&D estão sendo configuradas.
    console.log("Configurando zonas D&D...");

    const bibliotecaLista = document.getElementById('biblioteca-lista');
    const campeaoDropzone = document.getElementById('campeao-selecionado-dropzone');
    const itensDropzone = document.getElementById('itens-selecionados-dropzone');

    // 1. Configuração da Biblioteca (de onde se "puxa")
    // Comentário: 'pull: clone' significa que o item original permanece na biblioteca.
    new Sortable(bibliotecaLista, {
        group: { name: 'biblioteca', pull: 'clone', put: false },
        animation: 150,
        sort: false // Não permite reordenar a biblioteca
    });

    // 2. Configuração da Zona do Campeão (onde se "solta")
    new Sortable(campeaoDropzone, {
        group: { name: 'campeoes', put: ['biblioteca'] }, // Aceita itens do grupo 'biblioteca'
        animation: 150,
        onAdd: function (evt) {
            // Comentário: 'evt.item' é o *clone* que foi solto na zona.
            const el = evt.item;
            
            // --- INÍCIO DA CORREÇÃO (Bug D&D - Placeholder) ---
            // Comentário: Procura por um campeão (div com data-id) que *já* esteja na zona.
            const existingChamp = campeaoDropzone.querySelector('div[data-id]');

            // Comentário (Debug): Rejeita o drop se não for um campeão OU se já houver um campeão.
            if (el.dataset.type !== 'champion' || (existingChamp && existingChamp !== el)) {
                console.warn("Rejeitado: Apenas um campeão é permitido.");
                el.parentNode.removeChild(el); // Destrói o clone
                return;
            }
            // --- FIM DA CORREÇÃO ---
            
            // Comentário: Esconde o texto "Solte o Campeão Aqui".
            const placeholder = campeaoDropzone.querySelector('span');
            if (placeholder) placeholder.style.display = 'none';

            // Comentário: Atualiza o estado global com o ID do campeão selecionado.
            currentState.championId = el.dataset.id;
            console.log(`Campeão selecionado: ${currentState.championId}`);
            
            // Comentário: Adiciona um listener de clique no clone para removê-lo.
            el.addEventListener('click', () => {
                el.remove();
                if (placeholder) placeholder.style.display = 'block'; // Mostra o placeholder novamente
                currentState.championId = null; // Limpa o estado
                calculateTotalStats(); // Recalcula (para zerar os stats)
            });

            calculateTotalStats(); // Dispara o cálculo inicial
        }
    });

    // 3. Configuração da Zona de Itens (onde se "solta")
    // Comentário: (Tarefa 1) A dropzone agora é um grid, mas a lógica do Sortable é a mesma.
    new Sortable(itensDropzone, {
        group: { name: 'itens', put: ['biblioteca'] }, // Aceita itens do grupo 'biblioteca'
        animation: 150,
        // Comentário: Removemos os placeholders visuais ao soltar o primeiro item.
        onStart: function(evt) {
            const placeholders = itensDropzone.querySelectorAll('.item-slot-placeholder');
            placeholders.forEach(p => p.style.display = 'none');
        },
        onAdd: function (evt) {
            const el = evt.item;
            
            // --- INÍCIO DA CORREÇÃO (Bug D&D - Tipo) ---
            // Comentário (Debug): Rejeita o drop se *não* for um item (ex: um campeão).
            if (el.dataset.type !== 'item') {
                console.warn("Rejeitado: Apenas itens são permitidos aqui.");
                 el.parentNode.removeChild(el); // Destrói o clone
                 return;
            }
            // --- FIM DA CORREÇÃO ---

            // Comentário: Verifica o limite de 6 itens.
            const existingItems = itensDropzone.querySelectorAll('div[data-id]');
            if (existingItems.length >= 6) {
                 console.warn("Rejeitado: Limite de 6 itens atingido.");
                 el.parentNode.removeChild(el); // Destrói o clone
                 return;
            }

            // Comentário: Atualiza o array de IDs de itens no estado global.
            currentState.itemIds = Array.from(itensDropzone.children)
                                       .map(child => child.dataset.id)
                                       .filter(id => id); // Filtra IDs nulos (placeholders)
            
            console.log(`Itens: [${currentState.itemIds.join(', ')}]`);

            // Comentário: Adiciona listener de clique para remover o item.
            el.addEventListener('click', () => {
                el.remove();
                // Comentário: Atualiza o estado global após a remoção.
                currentState.itemIds = Array.from(itensDropzone.children)
                                           .map(child => child.dataset.id)
                                           .filter(id => id);
                
                // Comentário: (Tarefa 1) Se todos os itens foram removidos, mostra os placeholders.
                if (currentState.itemIds.length === 0) {
                     const placeholders = itensDropzone.querySelectorAll('.item-slot-placeholder');
                     placeholders.forEach(p => p.style.display = 'block');
                }
                
                calculateTotalStats(); // Recalcula
            });

            calculateTotalStats(); // Dispara o cálculo
        }
    });
    // Comentário (Debug): Confirma a finalização da configuração do Sortable.js.
    console.log("Sortable.js inicializado.");
}

/**
 * Configura os listeners para os inputs de Nível e Alvo
 */
function setupInputListeners() {
    // Comentário: (Tarefa 5) Os IDs dos inputs permanecem os mesmos,
    // mesmo que o layout tenha mudado.
    const levelInput = document.getElementById('level');
    const targetArmorInput = document.getElementById('target-armor');
    const targetMrInput = document.getElementById('target-mr');
    const displayArmor = document.getElementById('display-armor'); // Para o display de DPS

    // Comentário: Listener para o Nível do campeão.
    levelInput.addEventListener('change', (e) => {
        currentState.level = parseInt(e.target.value) || 1;
        console.log(`Nível alterado: ${currentState.level}`);
        calculateTotalStats(); // Recálculo total necessário.
    });
    
    // Comentário: Listener para a Armadura do alvo.
    targetArmorInput.addEventListener('input', (e) => {
        const armor = parseInt(e.target.value) || 0;
        currentState.targetArmor = armor;
        if (displayArmor) displayArmor.innerText = armor; // Atualiza o display de DPS
        console.log(`Armadura Alvo: ${currentState.targetArmor}`);
        calculateTotalStats(); // Recálculo total (Otimização futura: recalcular só DPS).
    });

    // Comentário: Listener para a Resistência Mágica do alvo.
    targetMrInput.addEventListener('input', (e) => {
        currentState.targetMr = parseInt(e.target.value) || 0;
        console.log(`RM Alvo: ${currentState.targetMr}`);
        calculateTotalStats(); // Recálculo total (Otimização futura: recalcular só DPS).
    });
}

/**
 * Busca os dados do Data Dragon (Comando 2)
 */
async function fetchData() {
    // Comentário (Debug): Inicia a busca de dados na rede.
    console.log(`Iniciando busca de dados da versão ${DDragonData.version}...`);
    try {
        // Comentário: Otimização - Busca campeões e itens em paralelo (Promise.all).
        const [champResponse, itemResponse] = await Promise.all([
            fetch(`${DDragonData.baseUrl}/data/en_US/champion.json`),
            fetch(`${DDragonData.baseUrl}/data/en_US/item.json`)
        ]);

        // Comentário (Debug): Verifica se as requisições falharam.
        if (!champResponse.ok || !itemResponse.ok) {
            throw new Error(`Falha na rede ao buscar dados.`);
        }

        const champFullData = await champResponse.json();
        const itemFullData = await itemResponse.json();
        
        // Comentário: Armazena os dados brutos no estado global.
        DDragonData.championData = champFullData.data;
        DDragonData.itemData = itemFullData.data;

        console.log("Dados de Campeões e Itens carregados.");

        // Comentário: Chama a função para renderizar a biblioteca agora que temos os dados.
        populateBiblioteca(DDragonData.championData, DDragonData.itemData);

    } catch (error) {
        // Comentário (Debug): Erro crítico. O app não funcionará sem dados.
        console.error("Erro fatal ao buscar dados do Data Dragon:", error);
    }
}

/**
 * Popula a Biblioteca com os dados do Data Dragon (Comando 2)
 */
function populateBiblioteca(championData, itemData) {
    const bibliotecaLista = document.getElementById('biblioteca-lista');
    if (!bibliotecaLista) {
        // Comentário (Debug): Erro crítico de UI.
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
            'champion', // Comentário: Tipo usado pelo filtro de abas
            champ.name,
            `${DDragonData.baseUrl}/img/champion/${champ.image.full}`
        );
        bibliotecaLista.appendChild(el);
    }

    // 2. Adiciona Itens (Filtro de Performance)
    // Comentário: Filtramos os itens para mostrar apenas os relevantes (compráveis, SR, completos).
    for (const itemId in itemData) {
        const item = itemData[itemId];
        
        // Comentário: Lógica de filtro para itens "completos" e relevantes.
        if (item.gold.purchasable && 
            item.maps['11'] && // Apenas Summoner's Rift
            !item.tags.includes('Trinket') && 
            !item.tags.includes('Consumable') &&
            !item.tags.includes('Lane') && // Remove itens da jungle
            item.tags.length > 0 && // Remove itens "vazios"
            (item.depth >= 2 || item.gold.base > 1500) && // Pega itens caros/completos
            !item.hideFromAll) // Remove itens escondidos
        {
            const el = createBibliotecaElement(
                itemId,
                'item', // Comentário: Tipo usado pelo filtro de abas
                item.name,
                `${DDragonData.baseUrl}/img/item/${item.image.full}`
            );
            bibliotecaLista.appendChild(el);
        }
    }
    // Comentário (Debug): Confirma quantos elementos foram renderizados.
    console.log(`Biblioteca populada com ${bibliotecaLista.children.length} elementos.`);

    // Comentário: (Tarefa 2) Chama o filtro inicial para mostrar apenas a aba 'champion'.
    handleFiltro();
}

/**
 * Helper para criar um elemento arrastável para a biblioteca
 * (Função auxiliar de renderização)
 */
function createBibliotecaElement(id, type, name, imageUrl) {
    const div = document.createElement('div');
    // Comentário: 'style.display = 'flex'' é usado pela função de filtro.
    div.className = 'w-16 h-16 bg-gray-dark rounded-lg cursor-move p-0 relative overflow-hidden group shadow-lg border border-gray-light';
    div.style.display = 'flex'; // Usado pelo filtro
    div.dataset.id = id; // ID (ex: "Aatrox" ou "3031")
    div.dataset.type = type; // 'champion' or 'item' (Usado pelo filtro)

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = name; // Usado pelo filtro de busca
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
 * Esta é a função central que recalcula tudo.
 */
function calculateTotalStats() {
    // Comentário: Se nenhum campeão estiver selecionado, zera a UI.
    if (!currentState.championId) {
        renderRPGCard(null); // Limpa o Card RPG
        renderDPS(0); // Zera o DPS
        return;
    }

    // Comentário: Nível 1 = índice 0 para fórmulas de escalonamento.
    const level = currentState.level - 1; 
    const champBase = DDragonData.championData[currentState.championId].stats;

    // 1. Calcula Stats Base (Fórmula oficial)
    // Comentário: Fórmula oficial de escalonamento de status por nível.
    const getStatAtLevel = (base, perLevel) => {
        return base + (perLevel * level * (0.7025 + (0.0175 * level)));
    };

    // Comentário: Objeto que armazena os status totais calculados.
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
        crit: 0, // Crítico começa em 0, vem apenas de itens.
        movespeed: champBase.movespeed
    };

    // 2. Adiciona Stats dos Itens
    let itemAttackSpeedBonus = 0; // Bônus de AS (Percentual)

    // Comentário: Itera sobre os IDs dos itens selecionados.
    for (const itemId of currentState.itemIds) {
        const itemStats = DDragonData.itemData[itemId]?.stats;
        if (!itemStats) continue; // Pula se o item não tiver stats (raro)
        
        // Comentário: Mapeia os stats do JSON (ex: FlatPhysicalDamageMod) para o nosso objeto.
        totalStats.hp += itemStats.FlatHPPoolMod || 0;
        totalStats.mp += itemStats.FlatMPPoolMod || 0;
        totalStats.ad += itemStats.FlatPhysicalDamageMod || 0;
        totalStats.armor += itemStats.FlatArmorMod || 0;
        totalStats.spellblock += itemStats.FlatSpellBlockMod || 0;
        totalStats.crit += (itemStats.FlatCritChanceMod || 0) * 100; // Crit é 0-100
        totalStats.movespeed += itemStats.FlatMovementSpeedMod || 0;
        
        // Comentário: Acumula bônus de AS (que é percentual).
        itemAttackSpeedBonus += (itemStats.PercentAttackSpeedMod || 0);
    }
    
    // 3. Calcula Attack Speed (a fórmula é complexa)
    // Comentário: AS Final = AS_Base_Nível_1 * (1 + (AS_Bonus_Nível + AS_Bonus_Itens))
    const asBonusFromLevel = (getStatAtLevel(0, champBase.attackspeedperlevel) / 100);
    const asBonusFromItems = itemAttackSpeedBonus;
    
    // Comentário: Recalcula o AS total com os bônus percentuais.
    totalStats.attackspeed = totalStats.attackspeed_base * (1 + asBonusFromLevel + asBonusFromItems);
    
    // 4. Renderiza o Card RPG
    // Comentário: Atualiza a UI do Card RPG com os novos status.
    renderRPGCard(totalStats);

    // 5. Calcula o DPS
    // Comentário: Chama a função final de cálculo de dano.
    calculateDPS(totalStats);
}

/**
 * Renderiza o "Card RPG" com os status calculados
 */
function renderRPGCard(stats) {
    const card = document.getElementById('card-rpg-stats');
    const pre = card.querySelector('pre');

    // Comentário: Se 'stats' for nulo (sem campeão), limpa o card.
    if (!stats) {
        pre.innerText = "<!-- Selecione um Campeão -->";
        return;
    }

    // Comentário: Formata os stats para exibição 'pre' (monoespaçado).
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
    // Comentário: Se 'totalStats' for nulo, zera o DPS.
    if (!totalStats) {
        renderDPS(0);
        return;
    }
    
    // Comentário: Pega a armadura do alvo do estado global.
    const targetArmor = currentState.targetArmor;
    
    // 1. Multiplicador de Dano (Armadura)
    // Comentário: Fórmula de redução de dano por armadura.
    const damageMultiplier = 100 / (100 + targetArmor);

    // 2. Cálculo de DPS com Crítico (MISSÃO 6 - EXECUTADA)
    
    // Comentário: Converte a chance de crítico de 0-100 para 0.0-1.0.
    const critChance = totalStats.crit / 100;
    
    // Comentário: Bônus de dano crítico padrão (100% de dano extra).
    let critDamageBonus = 1.0; 
    
    // Comentário: Verifica se Gume do Infinito (ID 3031) está nos itens.
    const hasInfinityEdge = currentState.itemIds.includes('3031');
    if (hasInfinityEdge) {
        // Comentário: Gume (14.13+) aumenta o bônus para 150%.
        critDamageBonus = 1.5;
    }
    
    // Comentário: Fórmula de DPS Médio (incluindo crítico).
    // DPS_Médio = DPS_Base * ( 1 + (ChanceDeCritico * BonusDeDanoCritico) )
    const baseDPS = (totalStats.ad * totalStats.attackspeed) * damageMultiplier;
    const dps = baseDPS * (1 + (critChance * critDamageBonus));

    // Comentário: Renderiza o valor final na UI.
    renderDPS(dps);
}

/**
 * Renderiza o resultado final do DPS na UI
 */
function renderDPS(dps) {
    const dpsElement = document.getElementById('resultado-dps');
    if (dpsElement) {
        // Comentário: Exibe o DPS arredondado para o inteiro mais próximo.
        dpsElement.innerText = dps.toFixed(0);
    }
}

/**
 * (TAREFA 2 / OTIMIZAÇÃO)
 * Filtra os itens na biblioteca com base no input E na aba ativa.
 * Esta função é chamada ao digitar E ao trocar de aba.
 */
function handleFiltro() {
    // Comentário: Pega o termo de busca (em minúsculas) do input.
    const termo = document.getElementById('filtro-biblioteca').value.toLowerCase();
    // Comentário: Pega a aba ativa (champion/item) do estado global.
    const activeType = currentState.activeTab;
    
    const bibliotecaLista = document.getElementById('biblioteca-lista');
    if (!bibliotecaLista) return;

    // Comentário: Pega todos os elementos arrastáveis na biblioteca.
    const itens = bibliotecaLista.querySelectorAll('div[data-id]'); 
    
    // Comentário: 'flex' é o display padrão que definimos no 'createBibliotecaElement'.
    const displayType = 'flex'; 

    for (const item of itens) {
        // Comentário: O nome do item está no 'alt' da imagem.
        const img = item.querySelector('img');
        if (img) {
            const nome = img.alt.toLowerCase();
            const type = item.dataset.type;

            // Comentário: Lógica principal do filtro (Termo E Aba).
            const matchesTermo = nome.includes(termo);
            const matchesTab = (type === activeType);

            if (matchesTermo && matchesTab) {
                item.style.display = displayType; // Mostra
            } else {
                item.style.display = 'none'; // Esconde
            }
        }
    }
}
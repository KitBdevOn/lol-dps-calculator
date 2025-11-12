/**
 * app.js v4.0.0 (Redesign "Glassmorphism")
 * Cérebro central da Calculadora de DPS.
 * Gerencia a busca de dados, a interface (D&D) e os cálculos.
 *
 * PROTOCOLO DE PERFORMANCE ATIVO:
 * 1. Nossa Máxima: Desperdício de energia é fome e desespero.
 * 2. Tudo deve estar comentado: Para guia, debug e brainstorming.
 *
 * ATUALIZAÇÃO v4.0.0 (Redesign):
 * - (CSS) `index.html` agora usa classes "glass-" para o layout.
 * - (JS) `switchTab()` atualizado para usar classes `.tab-button` e `.tab-button-active`.
 * - (JS) `createBibliotecaElement()` atualizado para usar classe `.biblioteca-item`.
 * - (JS) `showRecipe()` atualizado para usar classe `.biblioteca-item`.
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

// Comentário: (v3.0.0) currentState refatorado para Aliado vs Inimigo.
let currentState = {
    lang: 'pt_BR', // Comentário: (i18n) O idioma padrão (pt_BR ou en_US)
    activeTab: 'champion', // Comentário: (Tarefa 2) Estado inicial da aba

    // Estado do Aliado
    championId: null,
    level: 1,
    itemIds: [],

    // Estado do Inimigo (NOVO v3.0.0)
    enemyChampionId: null,
    enemyLevel: 1,
    enemyItemIds: []
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
    console.log("Cérebro carregado. Iniciando protocolo de sobrevivência. Layout v4.0.0 (Glassmorphism) ativo.");
    
    // --- (v3.1.0) Exibe a Versão do Patch ---
    const patchVersionEl = document.getElementById('patch-version');
    if (patchVersionEl) {
        patchVersionEl.innerText = `Patch: ${DDragonData.version}`;
    }
    // --- FIM DA LÓGICA DO PATCH ---

    // --- LÓGICA DE IDIOMA (i18n) ---
    // Comentário: Adiciona listeners aos botões de bandeira.
    const langBR = document.getElementById('lang-br');
    const langUS = document.getElementById('lang-us');
    if (langBR && langUS) {
        langBR.addEventListener('click', () => switchLanguage('pt_BR'));
        langUS.addEventListener('click', () => switchLanguage('en_US'));
    }
    // --- FIM DA LÓGICA DE IDIOMA ---

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

    // Comentário: Configura as zonas de Drag-and-Drop (Biblioteca, Aliado, Inimigo).
    setupDragAndDrop();

    // Comentário: Configura os listeners dos inputs (Nível Aliado, Nível Inimigo).
    setupInputListeners();

    // Comentário: Inicia a busca de dados (campeões e itens) do Data Dragon.
    fetchData();
}

/**
 * (TAREFA 2) Troca a aba ativa da biblioteca (Campeões/Itens)
 * (ATUALIZADO v4.0.0)
 */
function switchTab(tabName) {
    // Comentário (Debug): Registra a troca de aba.
    console.log(`Trocando para aba: ${tabName}`);
    currentState.activeTab = tabName;

    // Comentário: Referências aos botões das abas.
    const tabCampeoes = document.getElementById('tab-campeoes');
    const tabItens = document.getElementById('tab-itens');

    // Comentário: (v4.0.0) Lógica atualizada para usar classes de "vidro"
    if (tabName === 'champion') {
        // Ativa Campeões
        tabCampeoes.classList.add('tab-button-active');
        tabCampeoes.classList.remove('tab-button');
        // Desativa Itens
        tabItens.classList.add('tab-button');
        tabItens.classList.remove('tab-button-active');
    } else {
        // Ativa Itens
        tabItens.classList.add('tab-button-active');
        tabItens.classList.remove('tab-button');
        // Desativa Campeões
        tabCampeoes.classList.add('tab-button');
        tabCampeoes.classList.remove('tab-button-active');
    }

    // Comentário: Chama handleFiltro() para re-filtrar a lista com a nova aba.
    handleFiltro();
}

/**
 * (i18n) Troca o idioma da aplicação
 * Esta função atualiza o estado, o estilo das bandeiras e recarrega os dados.
 */
function switchLanguage(lang) {
    // Comentário (Debug): Não faz nada se o idioma já estiver ativo (economia de energia).
    if (currentState.lang === lang) {
        console.log(`Idioma ${lang} já está ativo.`);
        return;
    }

    // Comentário (Debug): Registra a troca.
    console.log(`Mudando idioma para: ${lang}`);
    currentState.lang = lang; // Atualiza o estado

    // Comentário: Atualiza a opacidade (estilo) das bandeiras.
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
    
    // Comentário: (Debug v3.0.0) Limpa o estado COMPLETO (aliado e inimigo).
    currentState.championId = null;
    currentState.itemIds = [];
    currentState.enemyChampionId = null;
    currentState.enemyItemIds = [];
    
    // Comentário: Limpa visualmente as zonas de drop
    clearDropZone('campeao-selecionado-dropzone');
    clearDropZone('itens-selecionados-dropzone', true);
    clearDropZone('inimigo-selecionado-dropzone');
    clearDropZone('inimigo-itens-dropzone', true);
    
    // Comentário: Zera os cálculos antes de buscar novos dados
    triggerCalculations();

    // Comentário: Recarrega todos os dados do Data Dragon no novo idioma.
    // A função fetchData() já chama a populateBiblioteca().
    fetchData();
}

/**
 * (NOVO v3.0.0) Helper para limpar visualmente uma dropzone
 */
function clearDropZone(zoneId, isItemZone = false) {
    // Comentário: Limpa uma zona de drop ao trocar de idioma ou remover item.
    const dropzone = document.getElementById(zoneId);
    if (!dropzone) return;

    // Remove o campeão/item (elemento com data-id)
    const existingElement = dropzone.querySelector('div[data-id]');
    if (existingElement) existingElement.remove();

    if (isItemZone) {
        // Comentário: (Refatoração v3.0.0) Mostra os placeholders de item
        const placeholders = dropzone.querySelectorAll('.item-slot-placeholder');
        placeholders.forEach(p => p.style.display = 'block');
    } else {
        // Comentário: Mostra o placeholder de campeão
        const placeholderText = dropzone.querySelector('span');
        if (placeholderText) placeholderText.style.display = 'block';
    }
}


/**
 * Configura as zonas de Drag-and-Drop (D&D) usando Sortable.js
 */
function setupDragAndDrop() {
    // Comentário (Debug): Confirma que as zonas D&D estão sendo configuradas.
    console.log("Configurando zonas D&D (v4.0.0)...");

    // Comentário: Referências de UI
    const bibliotecaLista = document.getElementById('biblioteca-lista');
    const campeaoAliadoDropzone = document.getElementById('campeao-selecionado-dropzone');
    const itensAliadoDropzone = document.getElementById('itens-selecionados-dropzone');
    const campeaoInimigoDropzone = document.getElementById('inimigo-selecionado-dropzone');
    const itensInimigoDropzone = document.getElementById('inimigo-itens-dropzone');

    // 1. Configuração da Biblioteca (de onde se "puxa")
    // Comentário: 'pull: clone' significa que o item original permanece na biblioteca.
    new Sortable(bibliotecaLista, {
        group: { name: 'biblioteca', pull: 'clone', put: false },
        animation: 150,
        sort: false // Não permite reordenar a biblioteca
    });

    // 2. Configuração da Zona do Campeão ALIADO
    new Sortable(campeaoAliadoDropzone, {
        group: { name: 'campeoes', put: ['biblioteca'] }, // Aceita itens do grupo 'biblioteca'
        animation: 150,
        onAdd: (evt) => handleChampionDrop(evt, 'aliado') // Comentário: (Refatoração v3.0.0)
    });

    // 3. Configuração da Zona de Itens ALIADO
    // Comentário: (CORREÇÃO v3.0.1 - BUG 2) Verificando se a dropzone existe
    if (itensAliadoDropzone) {
        new Sortable(itensAliadoDropzone, {
            group: { name: 'itens', put: ['biblioteca'] },
            animation: 150,
            onStart: (evt) => handleItemDragStart(itensAliadoDropzone), // Comentário: (Refatoração v3.0.0)
            onAdd: (evt) => handleItemDrop(evt, 'aliado') // Comentário: (Refatoração v3.0.0)
        });
    } else {
        console.error("FALHA CRÍTICA: Dropzone de itens do Aliado NÃO encontrada.");
    }

    // 4. Configuração da Zona do Campeão INIMIGO (NOVO v3.0.0)
    new Sortable(campeaoInimigoDropzone, {
        group: { name: 'campeoes', put: ['biblioteca'] },
        animation: 150,
        onAdd: (evt) => handleChampionDrop(evt, 'inimigo') // Comentário: (Refatoração v3.0.0)
    });

    // 5. Configuração da Zona de Itens INIMIGO (NOVO v3.0.0)
    new Sortable(itensInimigoDropzone, {
        group: { name: 'itens', put: ['biblioteca'] },
        animation: 150,
        onStart: (evt) => handleItemDragStart(itensInimigoDropzone), // Comentário: (Refatoração v3.0.0)
        onAdd: (evt) => handleItemDrop(evt, 'inimigo') // Comentário: (Refatoração v3.0.0)
    });

    // Comentário (Debug): Confirma a finalização da configuração do Sortable.js.
    console.log("Sortable.js v4.0.0 inicializado.");
}

/**
 * (NOVO v3.0.0) Manipula o drop de um CAMPEÃO (Aliado ou Inimigo)
 */
function handleChampionDrop(evt, target) { // target é 'aliado' ou 'inimigo'
    const el = evt.item; // O clone que foi solto
    const dropzone = (target === 'aliado') ? document.getElementById('campeao-selecionado-dropzone') : document.getElementById('inimigo-selecionado-dropzone');

    // Comentário (Debug): Rejeita o drop se não for um campeão.
    if (el.dataset.type !== 'champion') {
        console.warn(`Rejeitado: Apenas campeões são permitidos na zona do ${target}.`);
        el.parentNode.removeChild(el); // Destrói o clone
        return;
    }

    // Comentário: Procura por um campeão (div com data-id) que *já* esteja na zona.
    const existingChamp = dropzone.querySelector('div[data-id]');
    if (existingChamp) {
        existingChamp.remove(); // Remove o campeão antigo
    }
    
    // Comentário: Esconde o texto "Aliado" / "Inimigo".
    const placeholder = dropzone.querySelector('span');
    if (placeholder) placeholder.style.display = 'none';

    // Comentário: Atualiza o estado global com o ID do campeão selecionado.
    if (target === 'aliado') {
        currentState.championId = el.dataset.id;
        console.log(`Campeão Aliado: ${currentState.championId}`);
    } else {
        currentState.enemyChampionId = el.dataset.id;
        console.log(`Campeão Inimigo: ${currentState.enemyChampionId}`);
    }
    
    // Comentário: Adiciona um listener de clique no clone para removê-lo.
    el.addEventListener('click', () => {
        el.remove();
        if (placeholder) placeholder.style.display = 'block'; // Mostra o placeholder novamente
        
        // Comentário: Limpa o estado
        if (target === 'aliado') {
            currentState.championId = null;
        } else {
            currentState.enemyChampionId = null;
        }
        
        triggerCalculations(); // Recalcula (para zerar os stats)
    });

    triggerCalculations(); // Dispara o cálculo
}

/**
 * (NOVO v3.0.0) Esconde placeholders de itens quando o drag inicia
 */
function handleItemDragStart(dropzone) {
    // Comentário: Removemos os placeholders visuais ao soltar o primeiro item.
    const placeholders = dropzone.querySelectorAll('.item-slot-placeholder');
    placeholders.forEach(p => p.style.display = 'none');
}

/**
 * (NOVO v3.0.0) Manipula o drop de um ITEM (Aliado ou Inimigo)
 */
function handleItemDrop(evt, target) { // target é 'aliado' ou 'inimigo'
    const el = evt.item; // O clone que foi solto
    const dropzone = (target === 'aliado') ? document.getElementById('itens-selecionados-dropzone') : document.getElementById('inimigo-itens-dropzone');

    // Comentário (Debug): Rejeita o drop se *não* for um item.
    if (el.dataset.type !== 'item') {
        console.warn(`Rejeitado: Apenas itens são permitidos na zona do ${target}.`);
         el.parentNode.removeChild(el); // Destrói o clone
         return;
    }

    // Comentário: Verifica o limite de 6 itens.
    const existingItems = dropzone.querySelectorAll('div[data-id]');
    
    // Comentário: (CORREÇÃO v3.0.1 - BUG 3) Lógica corrigida para permitir 6 itens.
    if (existingItems.length >= 6) { 
         console.warn(`Rejeitado: Limite de 6 itens atingido para ${target}.`);
         el.parentNode.removeChild(el); // Destrói o clone
         return;
    }

    // Comentário: Atualiza o array de IDs de itens no estado global.
    const newItemList = Array.from(dropzone.children)
                             .map(child => child.dataset.id)
                             .filter(id => id); // Filtra IDs nulos
    
    if (target === 'aliado') {
        currentState.itemIds = newItemList;
        console.log(`Itens Aliado: [${currentState.itemIds.join(', ')}]`);
    } else {
        currentState.enemyItemIds = newItemList;
        console.log(`Itens Inimigo: [${currentState.enemyItemIds.join(', ')}]`);
    }

    // Comentário: Adiciona listener de clique para remover o item.
    el.addEventListener('click', () => {
        el.remove();
        
        // Comentário: Atualiza o estado global após a remoção.
        const currentItemList = Array.from(dropzone.children)
                                     .map(child => child.dataset.id)
                                     .filter(id => id);
        
        if (target === 'aliado') {
            currentState.itemIds = currentItemList;
            // Comentário: Se todos os itens foram removidos, mostra os placeholders.
            if (currentState.itemIds.length === 0) {
                 const placeholders = dropzone.querySelectorAll('.item-slot-placeholder');
                 placeholders.forEach(p => p.style.display = 'block');
            }
        } else {
            currentState.enemyItemIds = currentItemList;
            if (currentState.enemyItemIds.length === 0) {
                 const placeholders = dropzone.querySelectorAll('.item-slot-placeholder');
                 placeholders.forEach(p => p.style.display = 'block');
            }
        }
        
        triggerCalculations(); // Recalcula
    });

    triggerCalculations(); // Dispara o cálculo
}


/**
 * Configura os listeners para os inputs de Nível (Aliado e Inimigo)
 */
function setupInputListeners() {
    // Comentário: (Refatoração v3.0.0) Inputs de Nível
    const levelInput = document.getElementById('level');
    const enemyLevelInput = document.getElementById('enemy-level');

    // Comentário: Listener para o Nível do ALIADO.
    levelInput.addEventListener('change', (e) => {
        currentState.level = parseInt(e.target.value) || 1;
        console.log(`Nível Aliado alterado: ${currentState.level}`);
        triggerCalculations(); // Recálculo total necessário.
    });
    
    // Comentário: Listener para o Nível do INIMIGO.
    enemyLevelInput.addEventListener('change', (e) => {
        currentState.enemyLevel = parseInt(e.target.value) || 1;
        console.log(`Nível Inimigo alterado: ${currentState.enemyLevel}`);
        triggerCalculations(); // Recálculo total necessário.
    });
}

/**
 * Busca os dados do Data Dragon (Comando 2)
 */
async function fetchData() {
    // Comentário (Debug): Inicia a busca de dados na rede.
    console.log(`Iniciando busca de dados da versão ${DDragonData.version}...`);
    try {
        // Comentário (i18n): Usa o idioma do estado global para buscar os dados.
        const lang = currentState.lang;
        console.log(`Buscando dados no idioma: ${lang}`);

        // Comentário: Otimização - Busca campeões e itens em paralelo (Promise.all).
        const [champResponse, itemResponse] = await Promise.all([
            fetch(`${DDragonData.baseUrl}/data/${lang}/champion.json`),
            fetch(`${DDragonData.baseUrl}/data/${lang}/item.json`)
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
 * (ATUALIZADO v4.0.0)
 */
function createBibliotecaElement(id, type, name, imageUrl) {
    const div = document.createElement('div');
    // Comentário: (v4.0.0) Usa a nova classe de "vidro" e mantém os tamanhos (v3.1.0)
    div.className = 'biblioteca-item w-20 h-20 rounded-lg cursor-move p-0 relative group group-hover:z-50';
    div.dataset.id = id; // ID (ex: "Aatrox" ou "3031")
    div.dataset.type = type; // 'champion' or 'item' (Usado pelo filtro)

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = name; // Usado pelo filtro de busca
    img.className = "w-full h-full object-cover transition-transform duration-200 group-hover:scale-110 rounded-lg";
    img.draggable = false; // Previne o "ghost image" padrão do HTML5

    // Comentário: (v4.0.0) Tooltip de "vidro"
    const nameOverlay = document.createElement('span');
    nameOverlay.innerText = name;
    nameOverlay.className = "item-tooltip absolute bottom-0 left-0 w-auto min-w-full text-white text-xs text-center p-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100 rounded-b-lg z-10";

    div.appendChild(img);
    div.appendChild(nameOverlay);
    
    // Comentário: (NOVO v3.0.0) Adiciona listener para mostrar receita
    div.addEventListener('click', () => showRecipe(id, type));

    return div;
}

/**
 * (NOVO v3.0.0) Mostra a receita de um item clicado
 * (ATUALIZADO v4.0.0)
 */
function showRecipe(id, type) {
    const receitaBloco = document.getElementById('receita-bloco');
    if (!receitaBloco) return;

    // Comentário: Limpa o bloco se for um campeão ou item sem receita
    if (type === 'champion') {
        receitaBloco.innerHTML = '<span class="text-gray-500">Clique em um item da biblioteca para ver sua receita.</span>';
        return;
    }

    const item = DDragonData.itemData[id];
    
    // Comentário: Verifica se o item tem a propriedade 'from' (de onde ele vem)
    if (!item || !item.from || item.from.length === 0) {
        receitaBloco.innerHTML = `<span class="text-gray-400">${item.name} não possui receita.</span>`;
        return;
    }

    // Comentário: Se tem receita, limpa o bloco e constrói
    receitaBloco.innerHTML = '';
    
    // Comentário: Itera sobre os IDs dos sub-itens
    item.from.forEach(subItemId => {
        const subItem = DDragonData.subItemId];
        if (!subItem) return;

        // Comentário: (v4.0.0) Reutiliza a classe .biblioteca-item (64x64)
        const div = document.createElement('div');
        div.className = 'biblioteca-item w-16 h-16 rounded-lg relative group';
        div.title = `${subItem.name} (${subItem.gold.total}G)`; // Tooltip nativo

        const img = document.createElement('img');
        img.src = `${DDragonData.baseUrl}/img/item/${subItem.image.full}`;
        img.alt = subItem.name;
        img.className = "w-full h-full object-cover rounded-lg";
        
        div.appendChild(img);
        receitaBloco.appendChild(div);
    });
}

/**
 * (NOVO v3.0.0) Gatilho central para recalcular tudo.
 * Esta função chama os cálculos de stats e depois o cálculo de DPS.
 */
function triggerCalculations() {
    // Comentário: Calcula os status do Aliado
    const aliadoStats = calculateStats(currentState.championId, currentState.level, currentState.itemIds);
    // Comentário: Calcula os status do Inimigo
    const inimigoStats = calculateStats(currentState.enemyChampionId, currentState.enemyLevel, currentState.enemyItemIds);

    // Comentário: Renderiza os dois cards RPG
    renderRPGCard('aliado', aliadoStats);
    renderRPGCard('inimigo', inimigoStats);

    // Comentário: Calcula o DPS final (Aliado vs Inimigo)
    calculateDPS(aliadoStats, inimigoStats);
}


/**
 * (Refatorado v3.0.0) Calcula todos os status para um alvo (aliado ou inimigo)
 * Esta é uma função "pura": ela recebe estado e retorna um resultado.
 */
function calculateStats(championId, level, itemIds) {
    // Comentário: Se nenhum campeão estiver selecionado, retorna nulo.
    if (!championId) {
        return null;
    }
    
    // Comentário: Garante que os dados dos campeões já foram carregados.
    if (!DDragonData.championData[championId]) {
        console.error(`Dados do campeão ${championId} não encontrados.`);
        return null;
    }

    // Comentário: Nível 1 = índice 0 para fórmulas de escalonamento.
    const levelIndex = level - 1; 
    const champBase = DDragonData.championData[championId].stats;

    // 1. Calcula Stats Base (Fórmula oficial)
    // Comentário: Fórmula oficial de escalonamento de status por nível.
    const getStatAtLevel = (base, perLevel) => {
        return base + (perLevel * levelIndex * (0.7025 + (0.0175 * levelIndex)));
    };

    // Comentário: Objeto que armazena os status totais calculados.
    let totalStats = {
        hp: getStatAtLevel(champBase.hp, champBase.hpperlevel),
        mp: getStatAtLevel(champBase.mp, champBase.mpperlevel),
        ad: getStatAtLevel(champBase.attackdamage, champBase.attackdamageperlevel),
        armor: getStatAtLevel(champBase.armor, champBase.armorperlevel),
        spellblock: getStatAtLevel(champBase.spellblock, champBase.spellblockperlevel),
        attackspeed_base: champBase.attackspeed, // AS Base do Nível 1
        attackspeed: champBase.attackspeed * (1 + (getStatAtLevel(0, champBase.attackspeedperlevel) / 100)),
        crit: 0, // Crítico começa em 0, vem apenas de itens.
        movespeed: champBase.movespeed
    };

    // 2. Adiciona Stats dos Itens
    let itemAttackSpeedBonus = 0; // Bônus de AS (Percentual)

    // Comentário: Itera sobre os IDs dos itens selecionados.
    for (const itemId of itemIds) {
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
    
    // Comentário: Retorna o objeto de status final.
    return totalStats;
}

/**
 * (Refatorado v3.0.0) Renderiza o "Card RPG" (Aliado ou Inimigo)
 */
function renderRPGCard(target, stats) { // target é 'aliado' ou 'inimigo'
    const cardId = (target === 'aliado') ? 'card-rpg-stats-aliado' : 'card-rpg-stats-inimigo';
    const card = document.getElementById(cardId);
    if (!card) return; // Sai se o elemento não existir

    const pre = card.querySelector('pre');

    // Comentário: Se 'stats' for nulo (sem campeão), limpa o card.
    if (!stats) {
        pre.innerText = (target === 'aliado') ? "<!-- Selecione um Campeão -->" : "<!-- Selecione um Inimigo -->";
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
 * (Refatorado v3.0.0) Calcula o DPS final (Aliado vs Inimigo)
 */
function calculateDPS(aliadoStats, inimigoStats) {
    // Comentário: Se 'aliadoStats' for nulo, zera o DPS.
    if (!aliadoStats) {
        renderDPS(0);
        return;
    }
    
    // Comentário: Pega a armadura do INIMIGO.
    // Se o inimigo não existir, assume 100 de armadura (padrão antigo).
    const targetArmor = inimigoStats ? inimigoStats.armor : 100;
    
    // 1. Multiplicador de Dano (Armadura)
    // Comentário: Fórmula de redução de dano por armadura.
    // Garante que a armadura não seja negativa (ex: Trundle R)
    const effectiveArmor = Math.max(0, targetArmor);
    const damageMultiplier = 100 / (100 + effectiveArmor);

    // 2. Cálculo de DPS com Crítico (MISSÃO 6 - EXECUTADA)
    
    // Comentário: Converte a chance de crítico do ALIADO de 0-100 para 0.0-1.0.
    const critChance = aliadoStats.crit / 100;
    
    // Comentário: Bônus de dano crítico padrão (100% de dano extra).
    let critDamageBonus = 1.0; 
    
    // Comentário: Verifica se Gume do Infinito (ID 3031) está nos itens do ALIADO.
    const hasInfinityEdge = currentState.itemIds.includes('3031');
    if (hasInfinityEdge) {
        // Comentário: Gume (14.13+) aumenta o bônus para 150%.
        critDamageBonus = 1.5;
    }
    
    // Comentário: Fórmula de DPS Médio (incluindo crítico).
    // DPS_Médio = DPS_Base * ( 1 + (ChanceDeCritico * BonusDeDanoCritico) )
    const baseDPS = (aliadoStats.ad * aliadoStats.attackspeed) * damageMultiplier;
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
    const termoInput = document.getElementById('filtro-biblioteca');
    if (!termoInput) return; // Guarda de segurança
    const termo = termoInput.value.toLowerCase();
    
    // Comentário: Pega a aba ativa (champion/item) do estado global.
    const activeType = currentState.activeTab;
    
    const bibliotecaLista = document.getElementById('biblioteca-lista');
    if (!bibliotecaLista) return;

    // Comentário: Pega todos os elementos arrastáveis na biblioteca.
    const itens = bibliotecaLista.querySelectorAll('div[data-id]'); 
    
    // Comentário: (CORREÇÃO v3.0.1 - BUG 1) A biblioteca é um 'grid',
    // então os filhos devem ser `display: block`.
    const displayType = 'block'; 

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
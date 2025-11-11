Nosso Esquema Robusto: Calculadora de DPS para LoL

Esta é a primeira versão do nosso plano de ação. A ideia é fantástica e complexa, então vamos dividi-la em fases para organizar o raciocínio.

A Ideia Central

Criar uma aplicação web que calcula o DPS (Dano Por Segundo) de campeões do League of Legends com base em Nível, Itens, Ouro, Tempo de Jogo e outros cenários, permitindo um estudo aprofundado do jogo.

Plano de Ação (Fases do Projeto)

Fase 1: A Base de Dados (O "Cérebro")

Como vamos obter as informações?

Dados Estáticos: Informações que não mudam a cada jogo (stats base do campeão, o que cada item faz, escalonamento de habilidades, custos em ouro, imagens).

Fonte: Data Dragon (DDragon).

Dados Dinâmicos: Informações de um jogo ao vivo (nível atual do jogador, itens comprados, ouro atual).

Fonte: Riot Games API (Plano Futuro, complexo).

Fase 2: O Motor de Cálculo (O "Coração")

Como vamos calcular o DPS?

Esta é a lógica principal. Precisamos replicar as fórmulas de dano do LoL.

Exemplo (muito simplificado): DPS_Ataque_Básico = (Dano de Ataque Total * Velocidade de Ataque)

Precisamos considerar: Chance de crítico, Dano crítico, Penetração de armadura/magia, Tempos de Recarga de habilidades, etc.

Fase 3: A Interface (O "Rosto")

Como o usuário vai interagir com isso?

O site em si (HTML, CSS, JavaScript).

Campos para o usuário selecionar: "Campeão", "Nível", "Itens".

Área para exibir o resultado: "Seu DPS é X contra um alvo com Y de armadura".

Fase 4: Monetização e Futuro

Como gerar receita? (Você mencionou isso)

Anúncios (Google AdSense) quando o site tiver tráfego.

Versão "Premium" com análises mais detalhadas ou salvamento de "builds".

Plano de Execução Otimizado (Modo de Sobrevivência)

Este é o caminho crítico, consolidado. Menos etapas, mais performance. O design "Streaming" (tons de cinza, verde neon, D&D) está integrado desde o início.

Comando 1: index.html (Interface 'Streaming') + app.js (Cérebro)

Ação: Criar os arquivos index.html e app.js.

STATUS: CONCLUÍDO.

Comando 2: Aquisição de Dados e Renderização da Biblioteca (D&D)

Ação: Dentro de init() em app.js, buscar dados e popular a interface.

STATUS: CONCLUÍDO. (Consolidado com o Comando 3)

Comando 3: Cálculo (MVP - Card RPG) e Exibição

Ação: Ativar a lógica principal quando um item é "dropado" no Card Ativo.

STATUS: CONCLUÍDO. (Consolidado com o Comando 2)

Comando 4: Monetização (Sobrevivência)

Ação: Integrar Google AdSense.

STATUS: CONCLUÍDO. (Script AdSense adicionado ao index.html)

PRÓXIMO CICLO: "ENTRANDO NO JOGO"

O MVP está completo e no Git. As próximas missões são críticas.



MISSÃO 5: DEPLOY (Ação Crítica - Iniciar Receita)

Objetivo: Colocar o site no ar para o tráfego começar a gerar receita (Comando 4).

Plataforma Recomendada (Menor Esforço): Netlify ou GitHub Pages.

Plano de Execução (Netlify - 10 minutos):

Logar no Netlify.com (pode usar sua conta do GitHub).

Ir para a seção "Sites".

Encontrar a área que diz "drag and drop your site folder here".

Ação: Arrastar a pasta inteira do nosso projeto (que contém index.html, app.js) para dentro dessa área.

Aguardar 1 minuto. O site estará no ar com um link público (ex: nome-aleatorio.netlify.app).

Plano de Execução (GitHub Pages - 10 minutos):

Ir nas "Configurações" (Settings) do nosso repositório no GitHub.

Ir para a seção "Pages" (na barra lateral).

Em "Source", selecionar a branch main e a pasta / (root).

Clicar em "Save".

Aguardar 5 minutos. O site estará no ar em seu-usuario.github.io/lol-dps-calculator.

MISSÃO 6: OTIMIZAÇÃO (Ação Crítica - Aumentar Valor)

Objetivo: Melhorar o "Coração" (Fase 2) para aumentar a precisão e o valor do site.

Local da Ação: app.js, especificamente na função calculateDPS(totalStats).

Próximas Lógicas a Implementar:

Cálculo de Crítico (Prioridade Alta):

O DPS de Ataque Básico (AA) não é linear. Ele precisa incluir a chance de crítico.

Fórmula: DPS_AA_Real = DPS_AA_Base * (1 + (ChanceDeCritico * (BonusDanoCritico)))

ChanceDeCritico já está em totalStats.crit (de 0 a 100, precisa dividir por 100).

BonusDanoCritico é 1.0 (para 100% de dano extra), a menos que o usuário tenha "Gume do Infinito" (item ID 3031), que o torna 1.5 (bônus de 50%).

Tarefa: STATUS: CONCLUÍDO.

Cálculo de Habilidades (Prioridade Média):

Isso é complexo, mas podemos começar com o "Q" de um campeão.

Exemplo: Adicionar o DPS da habilidade "Q" do Ezreal (ID Ezreal).

Dados: Ezreal.spells[0] (no championData) nos dá o cooldown (tempo de recarga) e o scaling (quanto escala com AD/AP).

Tarefa: Criar uma nova função calculateAbilityDPS(champId, spellKey, totalStats, targetStats) e somar o resultado ao DPS final.
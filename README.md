# Análise de Histórico de Manutenção SAP

Aplicação web local para enriquecimento e análise de exportações de manutenção (IW39, IW29, listas de equipamentos, locais funcionais e reservas MB24).

**Privacidade:** este repositório contém apenas código, documentação e testes fictícios. Nenhuma exportação SAP, lista de ativos reais, dados pessoais, nomes de colaboradores, ordens ou reservas da empresa pode ser versionada. O processamento é realizado na sessão do navegador, após seleção manual dos arquivos.

## Objetivo inicial

Analisar o intervalo calendário entre intervenções de material rodante e trocas de esteiras, distinguindo evento executado, evidência insuficiente e ordem planejada. Horas operadas exigem uma fonte adicional de horímetros. Reserva MB24, isoladamente, não comprova consumo efetivo.

## Como usar

Acesse a aplicação via GitHub Pages ou **baixe `standalone.html` e abra-o por duplo clique**. O HTML standalone contém o motor de análise incorporado, evitando o bloqueio de módulos JavaScript em arquivos `file://`. Selecione as exportações locais e navegue entre **Cadastros**, **Materiais** e **Ordens & Rodante**. O sistema também aceita apenas uma exportação IW39 ou IW29 e informa as limitações decorrentes.

Para executar testes sintéticos (Node.js 20+): `npm test`. Para regenerar o HTML único após alterações: `npm run build:standalone`.

A biblioteca de leitura XLSX é obtida do CDN ao abrir o HTML; uma conexão é necessária para XLSX. O código próprio não envia planilhas ao CDN, mas uma biblioteca externa executada no navegador pode ter acesso aos dados: **para conteúdo confidencial, submeter a dependência à revisão de TI ou usá-la instalada localmente e auditada**. CSV funciona offline, sem dependência. Nunca publique exportações reais.

Consulte `SECURITY.md` e `docs/METODOLOGIA.md` antes de interpretar médias de consumo.

## Publicação no GitHub Pages

O workflow `.github/workflows/pages.yml` executa os testes sintéticos e publica **somente** `index.html` e `src/engine.js` (sem nenhuma base corporativa). A URL esperada após ativação é:

`https://pedromaintenance.github.io/analise-historico-manutencao-sap/`

**Ativação inicial pelo proprietário do repositório:** abra `Settings → Pages → Build and deployment → Source: GitHub Actions`. Depois acompanhe `Actions → Publicar aplicativo no GitHub Pages` ou execute `Run workflow`. Não é necessário fazer upload de bancos de dados ao GitHub.

**Segurança:** a versão web ainda usa a biblioteca XLSX externa informada em `SECURITY.md`; o carregamento de arquivos é local, mas, até aprovar/empacotar a dependência JS, não use planilhas classificadas como sigilosas em contexto conectado à rede sem autorização da TI.

## Relatório especial 01 — versão com cronologia e custos

A aba **Ordens & rodante** agora associa os custos previstos e reais da IW39 às ordens candidatas e mostra materiais MB24 por ordem. A classificação separa troca de conjunto, troca mista, reparo parcial, montagem, ajuste e inspeção.

A referência temporal padrão é **Data-base de início → Fim da avaria (IW29) → Data de Entrada (IW39)**. Cada fonte é identificada na exportação. A Data-base é **planejamento**, não comprovação de execução; ordens futuras e ordens sem lado conhecido não criam pares de substituição.

O relatório exportado contém abas independentes: resumo de vida, intervalos, eventos, custos por classe, custos por ordem, materiais por OS e triagem de candidatas. Custos da ordem podem incluir mais que material rodante, e uma reserva MB24 não comprova consumo. Veja a metodologia completa em `docs/METODOLOGIA.md`.

## Primeira vida observada de esteiras

O sistema disponibiliza agora uma aba **PrimeiraVida** no relatório e uma tabela no painel para equipamentos com uma ou mais trocas observadas. A leitura do equipamento aceita `Data de aquisição` e, opcionalmente, `Data de entrada em serviço` / `Data de comissionamento`; o segundo campo prevalece. As origens de datas e a limitação de estimativa são indicadas. O modo prudente evita incluir na vida trocas de parafusos, FPS e outras intervenções parciais ou ordens sem evidência financeira/material. A seleção de eventos com evidência fraca é explicitamente opt-in.

## Versão 0.3 — carga única, backup portátil e ciclo de vida

A ferramenta permite salvar e reabrir as bases sem repetir cinco importações:

- **Exportar pacote Excel completo:** gera o arquivo sap_pacote_enriquecido.xlsx, com abas de Equipamentos, Locais, Ordens IW39, Notas IW29 e Reservas MB24. Cada aba preserva campos SAP e inclui enriquecimentos. Em uma próxima sessão, importe apenas esse arquivo na opção **Carregar pacote único**.
- **Exportar sessão JSON:** gera um backup de todas as linhas importadas e suas origens, com os filtros aplicados. Reimporte em **Restaurar sessão**, sem precisar reconfigurar a análise.
- **Ciclo de vida (tela 04):** tabela por equipamento, lado e Ordem SAP exata, eventos consecutivos e primeira vida estimada, além de auditoria e reservas materiais por OS. Exporta planilha com abas Equipamentos, CiclosPorOS, AuditoriaOS, MateriaisPorOS e CiclosEmAberto.

**Segurança:** tanto o pacote quanto o JSON contêm dados corporativos reais. O download é local. Não compartilhe em GitHub, GitHub Pages, tickets ou canais públicos. O navegador não salva automaticamente a sessão: exporte o backup antes de atualizar, limpar os dados ou fechar a aba.

Uma troca simultânea dos lados esquerdo e direito representa duas esteiras físicas, mas uma única OS e um único custo de ordem. Dados de início de planejamento não comprovam a data da substituição executada. Tempo contado desde aquisição representa estimativa de primeira vida, e não vida comprovada da esteira original.

## Sessões JSON compactadas

O aplicativo aceita tanto sessões **.json** quanto sessões **.json.gz**. O formato compactado usa as APIs nativas CompressionStream e DecompressionStream em navegadores compatíveis, sem biblioteca ou servidor adicional. Para reabrir, selecione qualquer um dos dois formatos na opção Restaurar sessão. As duas variantes preservam todas as fontes carregadas e configurações, inclusive dados confidenciais: mantenha somente em dispositivo ou diretório corporativo autorizado.

O relatório da tela Ciclo de vida preserva o número exato da ordem, o lado da máquina, a OS anterior, as reservas MB24, os custos e a qualidade da identidade do ativo. O campo de ordenação da IW39 e da IW29 é usado para conciliação, e uma TAG encontrada apenas na descrição da OS é sinalizada como vínculo de baixa confiança para revisão.

## Versão 0.4 — Dashboard interativo por equipamento

A nova aba **05 · Dashboard** transforma o ciclo de vida da tela 04 em um relatório executivo e auditável:

- Selecionar/excluir equipamentos individualmente, localizar por TAG/modelo e incluir/excluir todos os resultados filtrados; as escolhas são preservadas no backup de sessão JSON (não são enviadas ao servidor).
- Cada painel de máquina contém **TAG, família de equipamento, modelo e marco inicial de operação**. Quando só houver Data de aquisição, o marco é rotulado como *estimado*.
- Dois indicadores: **ciclo de vida em dias** (priorizando mediana de intervalos consecutivos; na ausência, tempo estimado da primeira troca) e **número de ordens de substituição candidatas**. Uma OS para as duas esteiras conta como uma ordem, não duas.
- Tabela por máquina com **número SAP da OS, descrição, Data-base, Fim da avaria, Data de Entrada, custo real da ordem** e classificação.
- Ao clicar em **Materiais (N)** na mesma linha, abre o detalhamento das reservas MB24. Sem reserva disponível, a tabela informa a limitação sem presumir ausência de consumo.
- Filtro para exibir somente ordens de troca ou todas as intervenções de rodante.
- **Exportar dashboard HTML:** gera no computador um documento interativo independente e sem bibliotecas externas, incorporando **somente os equipamentos selecionados**. Pode ser aberto fora do sistema e impresso em PDF pelo navegador.

**CONFIDENCIALIDADE:** o HTML exportado contém as ordens, valores e materiais das máquinas selecionadas. Não publique os arquivos gerados no repositório, GitHub Pages ou serviços externos. A versão pública contém apenas o gerador sem dados.

Para reabrir as seleções sem repetir cargas, exporte a sessão JSON (normal ou GZIP) após marcar as máquinas e restaure-a na próxima visita.

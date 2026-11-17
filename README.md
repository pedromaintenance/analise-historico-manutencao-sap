# Análise de Histórico de Manutenção SAP

Aplicação web local para enriquecimento e análise de exportações de manutenção (IW39, IW29, listas de equipamentos, locais funcionais e reservas MB24).

**Privacidade:** este repositório contém apenas código, documentação e testes fictícios. Nenhuma exportação SAP, lista de ativos reais, dados pessoais, nomes de colaboradores, ordens ou reservas da empresa pode ser versionada. O processamento é realizado na sessão do navegador, após seleção manual dos arquivos.

## Objetivo inicial

Analisar o intervalo calendário entre intervenções de material rodante e trocas de esteiras, distinguindo evento executado, evidência insuficiente e ordem planejada. Horas operadas exigem uma fonte adicional de horímetros. Reserva MB24, isoladamente, não comprova consumo efetivo.

## Como usar

Abra `index.html` no navegador, selecione as exportações locais e navegue entre **Cadastros**, **Materiais** e **Ordens & Rodante**. O sistema também aceita apenas uma exportação IW39 ou IW29 e informa as limitações decorrentes.

Para executar os testes sintéticos (Node.js 20+): `npm test`.

A biblioteca de leitura XLSX é obtida do CDN ao abrir o HTML; uma conexão é necessária para XLSX. Nenhuma planilha é enviada ao CDN. Para auditoria com isolamento completo de rede, baixe e hospede a dependência localmente ou use CSV offline.

Consulte `SECURITY.md` e `docs/METODOLOGIA.md` antes de interpretar médias de consumo.

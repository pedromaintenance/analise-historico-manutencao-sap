# Metodologia — Análise histórica SAP PM

## Fontes e significado
- Equipamentos: identidade por chave SAP e denominação; o local cadastral pode ser uma oficina genérica.
- Locais de instalação: identidade pela hierarquia funcional, inclusive subcomponentes.
- IW39: ordens, datas, textos, status, tipo, prioridade, equipamento e/ou local.
- IW29: notificações, sintomas e notificador, com ou sem ordem associada.
- MB24: reservas, materiais, quantidades e vínculo com OS. Reserva **não comprova saída física, consumo ou instalação**. Confirmar em movimentos/documentos próprios, inclusive estornos.

## Identidade do ativo
1. Se existe equipamento explícito, usar equipamento.
2. Se existe apenas local específico, percorrer o próprio local e os locais-pai até localizar o **Campo de ordenação**, extraindo a TAG fornecida pela planilha. Relacionar a TAG à denominação/identificador do equipamento apenas se for única. Classificar como confiança média. Não codificar regras da hierarquia de uma empresa no código público.
3. Sem vínculo seguro, manter local como entidade autônoma. Nunca supor que o mesmo local genérico de oficina indica a mesma máquina.
4. Para auditoria histórica definitiva, necessitamos das datas de montagem/desmontagem e transferências Equipamento ↔ Local.

## Relatório 01 — rodante
Componentes distintos: esteira completa, roletes, roda guia, roda motriz, sapatas, tensionamento, material rodante genérico.
A existência de local denominado "Esteira" não é prova de troca. "Corrente de avanço" de perfuratriz não é corrente de esteira.
Palavras como "substituir" e "trocar" são somente intenção ou descrição; não demonstram serviço concluído. Um status conclusivo sem data real é evidência provável, não um evento datado. Estados de cancelamento/não execução devem ser excluídos.
Data real de execução tem precedência. Usar data-base como aproximação é permitido apenas no modo exploratório e deve permanecer explicitamente rotulado.
Para os intervalos, comparar somente trocas sucessivas do mesmo ativo, componente e lado. Múltiplas ordens do mesmo ativo/componente/lado dentro de sete dias são agrupadas provisoriamente: validar casos legítimos de trocas próximas.
Somente dois eventos sucessivos formam um intervalo. Média e mediana são medidas **observadas** e podem sofrer censura temporal e viés de seleção.
Vida em horas exige horímetro registrado na substituição A e na substituição B. Dias de calendário não podem ser convertidos em horas trabalhadas sem uma fonte real de utilização.

## Não misturar indicadores
- Intervalo entre trocas: dias calendário.
- Vida operacional: horas do medidor entre substituições equivalentes.
- Estoque e reserva: necessidade planejada; não prova consumo.
- Custo de manutenção: custos reais não substituem comprovação de aplicação.

## Limitações e backlog
Perfis de status por implantação SAP; cadastros de locação histórica, apropriação MB51, textos longos/operacionais, medidores, revisões manuais de evento, gráfico de sobrevivência com censura e estratificação por severidade operacional ainda exigem evolução.

## Regra de conclusão configurável
Os status indicativos de conclusão e de cancelamento são editáveis na interface. Os valores iniciais são sugestões de trabalho e não uma definição universal do SAP. A execução só é considerada datada quando também houver data real coerente; os estados devem ser validados contra a transação/configuração e o procedimento local.

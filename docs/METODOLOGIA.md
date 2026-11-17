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

**Hierarquia de datas em cada ordem (versão 0.2):**
1. **Data-base do início da IW39** — referência prioritária para a intervenção programada;
2. **Fim da avaria da IW29** — fallback quando não existe Data-base; denota encerramento informado da avaria, **não necessariamente o encerramento administrativo da ordem**;
3. **Data de Entrada da IW39** — fallback final, data de criação da OS.

Todas as três são preservadas e exportadas para auditoria, junto com a fonte efetivamente escolhida. Datas de execução real ficam em coluna independente quando existirem. O intervalo entre Datas-base deve ser nomeado **intervalo calendário estimado entre ordens candidatas**, não duração operacional comprovada da esteira. Referências futuras não formam eventos realizados.

A análise diferencia, por texto e materiais: troca de esteira/conjunto, troca mista, troca parcial/componente, montagem/instalação, ajuste/reposicionamento, inspeção, logística e menções indeterminadas. Troca de módulos, pinos ou sapatas não pode virar troca de esteira completa por simples associação da palavra "esteira". Custo alto aumenta a necessidade de revisar o registro, mas não prova sozinho que o serviço foi concluído.

Para os intervalos, comparar somente dois eventos sucessivos do mesmo ativo, componente e **lado**; eventos sem lado definido permanecem na auditoria de custos, mas não entram na série de vida. Agrupamento de até sete dias é provisório e exige validação.

**Evidências complementares:** status de ordem configuráveis + existência de custo real indicam movimentação contábil, mas não asseguram substituição final. Distinguir datas de referência de comprovação de execução. Prazos podem variar por reprogramação.

## Análise econômica e materiais

- A **IW39** dispõe de Custos totais plan. e Custos tot.reais por OS. A ferramenta sumariza total e mediana de valores positivos por classe de intervenção.
- **Custo real da ordem não é necessariamente custo exclusivo do rodante**: pode agregar serviços, frete, outros componentes e mão de obra.
- A **MB24** fornece códigos, descrições, UM, necessidade, registro, reserva e vínculo com ordem. Os itens sem código SAP são retidos. A ausência de linha na MB24 pode decorrer de extração temporal / reservas encerradas ou fora do filtro e **não prova falta de material aplicado**.
- Somatórios de quantidades respeitam unidades de medida. Preço unitário não está na MB24 fornecida. Não distribuir o custo da OS proporcionalmente aos materiais sem base de preço.
- Para custo real de material por ordem, acrescentar MB51 / movimentos efetivos / estornos, ou relatório de itens de custo da OS.

## Não misturar indicadores
- Intervalo entre trocas: dias calendário.
- Vida operacional: horas do medidor entre substituições equivalentes.
- Estoque e reserva: necessidade planejada; não prova consumo.
- Custo de manutenção: custos reais não substituem comprovação de aplicação.

## Limitações e backlog
Perfis de status por implantação SAP; cadastros de locação histórica, apropriação MB51, textos longos/operacionais, medidores, revisões manuais de evento, gráfico de sobrevivência com censura e estratificação por severidade operacional ainda exigem evolução.

## Regra de conclusão configurável
Os status indicativos de conclusão e de cancelamento são editáveis na interface. Os valores iniciais são sugestões de trabalho e não uma definição universal do SAP. A execução só é considerada datada quando também houver data real coerente; os estados devem ser validados contra a transação/configuração e o procedimento local.

## Primeira esteira e início da vida observada

O cadastro de Equipamentos pode apresentar `Data de aquisição`; uma coluna adicional `Data de entrada em serviço` (ou `Data de comissionamento`) é aceita pelo importador. A entrada em serviço prevalece, e **não** se utiliza `Válido desde` como data de comissionamento: este campo pode representar validade administrativa do cadastro.

Estimativa inicial em dias = Data-base de início da primeira ordem candidata de troca de esteira completa - Data de entrada em serviço. Se somente aquisição existir, apresentar **tempo entre compra e primeira troca observada**, uma estimativa indireta que só pode se aproximar da vida da esteira original se (1) o equipamento era novo, (2) a esteira original estava montada no comissionamento, (3) não houve trocas anteriores fora do horizonte SAP e (4) a ordem selecionada reflete a substituição física. De outro modo, há truncamento/censura à esquerda e a estimativa não comprova vida.

Para evitar estimativas enganadoras, a seleção prudente exige descrição de troca do conjunto, status coerente, custo real positivo e nenhuma reserva restrita a componentes secundários; uma reserva de conjunto e custo positivo aumenta a confiança. Permanece possível ativar o filtro exploratório com evidências fracas para auditoria, mas esses valores não devem ser tratados como resultados consolidados. Serviços de FPS, fixações e tensionamento NÃO devem contar como trocas completas.

Trocas direita e esquerda no mesmo número de OS representam até duas vidas físicas de esteiras, mas **um único evento de manutenção e um único custo de ordem**. Não duplicar custo ou frequência de OS na comparação de frota. Para cálculo de vida em horas, utilizar histórico de horímetros; dias podem refletir utilização distinta.

## Reconstrução de ciclo por equipamento e número exato da OS

A tela 04 reúne simultaneamente equipamentos, locais, ordens, notas e reservas. A tabela de ciclos apresenta número SAP literal da ordem de cada troca, número da ordem anterior, lado, data-base e fonte, intervalo em dias, materiais previstos e qualidade da evidência. Há também uma tabela integral de auditoria com ordens não elegíveis, inclusive serviços parciais de FPS, parafusos, tensão, roletes e regulagem.

Eventos com evidência insuficiente são excluídos por padrão dos intervalos e podem ser incluídos explicitamente no modo exploratório. Ordens sem lado identificado ficam em auditoria, mas não participam de intervalos esquerda/direita. Uma OS contendo os dois lados representa dois ciclos físicos, porém apenas uma OS e custo de ordem não deve ser somado duas vezes.

A primeira vida observada parte da data de entrada em serviço, quando fornecida; caso contrário, a data de aquisição serve apenas como indicador aproximado de tempo desde a compra. A segunda e demais trocas usam a referência de OS anterior do mesmo lado. Eventos em até sete dias podem ser agrupados provisoriamente, preservando todos os números de OS. Ciclos ainda abertos são censurados; não representam troca ocorrida.

## Persistência portátil e controle de acesso

O pacote Excel multiabas preserva os campos originais de cada fonte e uma coluna de identificação da origem. A sessão JSON possui versão explícita e conserva as bases brutas, os nomes de origem e filtros. O JSON não é anonimizado; deve ser mantido em ambiente corporativo autorizado, sem publicação pública e sem upload a sites não autorizados.

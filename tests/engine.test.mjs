import test from "node:test";
import assert from "node:assert/strict";
import {serializeSession,restoreSession,analyzeLifecycle,detectRole,createModel,analyzeRodante,asDate,isoDate,classifyRodante,enrichRows,exportMaterials} from "../src/engine.js";
const equipment=[{Equipamento:"EQ-001","Denominação do objeto técnico":"ESCAVADEIRA FICTÍCIA 021-111","Nº inventário":"021-111"},
 {Equipamento:"EQ-002","Denominação do objeto técnico":"PERFURATRIZ FICTÍCIA 010-222","Nº inventário":"010-222"}];
const ord=(id,d,desc,status="ENTE",date="")=>({
 Ordem:id,"Tipo de ordem":"PM01",Equipamento:"EQ-001",
 "Texto breve":desc,"Status do sistema":status,"Data-base do início":d,"Dta.início real":date
});
test("detecta automaticamente IW39, IW29, MB24 e mestres",()=>{
 assert.equal(detectRole(["Tipo de ordem","Ordem","Texto breve"]),"orders");
 assert.equal(detectRole(["Tipo de nota","Nota","Notificador"]),"notes");
 assert.equal(detectRole(["Nº reserva","Material","Ordem"]),"reservations");
 assert.equal(detectRole(["Equipamento","Denominação do objeto técnico","Nº inventário"]),"equipment");
 assert.equal(detectRole(["Local de instalação","Tipo de objeto"]),"locations");
});
test("preserva uma importação de apenas IW29",()=>{
 const m=createModel({notes:[{"Tipo de nota":"M1","Nota":"N-1",Descrição:"Inspecionar esteira",Notificador:"Técnico Fictício"}]});
 assert.equal(m.orders.length,0);
 assert.equal(m.norm.notes.length,1);
 assert.ok(m.dictionaries.some(x=>x.dimension==="Técnico / Notificador"));
});
test("concilia por equipamento prioritariamente e por local quando único",()=>{
 const m=createModel({equipment,locations:[{"Local de instalação":"PLANT-TECH-0222","Campo de ordenação":"010-222","Tipo de objeto":"TECH"}],orders:[ord("OS-1","2026-01-01","TROCA ESTEIRA") ,
  {Ordem:"OS-2","Tipo de ordem":"PM01","Local de instalação":"PLANT-TECH-0222-UNCR",
   "Texto breve":"SUBSTITUIR ROLETE","Status do sistema":"ENTE"}]});
 assert.equal(m.orders[0].identity.id,"EQ:EQ-001");
 assert.equal(m.orders[1].identity.id,"EQ:EQ-002");
 assert.equal(m.orders[1].identity.confidence,"média");
});
test("não confunde corrente de avanço com esteira",()=>{
 const m=createModel({orders:[ord("OS-3","2026-01-01","TROCA DA CORRENTE DE AVANÇO")]});
 assert.equal(classifyRodante(m.orders[0]).component,"");
});
test("reservas MB24 não comprovam troca realizada",()=>{
 const m=createModel({orders:[ord("OS-4","2026-01-01","BL-SUBSTITUIR ROLETES","ABER")],
 reservations:[{"Nº reserva":"R1","Ordem":"OS-4",Material:"MAT-FICT-1","Texto breve material":"ROLETE FICTICIO","Qtd.necessária":"2"}]});
 assert.equal(classifyRodante(m.orders[0]).evidence,"troca planejada / sem confirmação");
 assert.equal(m.orders[0].reserves.length,1);
 assert.equal(exportMaterials(m)[0]["Ordens distintas"],1);
});
test("converte datas SAP como serial Excel, brasileiro e ISO",()=>{
 assert.equal(isoDate("46023"),"2026-01-01");
 assert.equal(isoDate("01/01/2026"),"2026-01-01");
 assert.equal(isoDate("2026-01-01"),"2026-01-01");
 assert.equal(asDate("31/02/2026"),null);
});
test("calcula intervalos com data real e o mesmo item e lado",()=>{
 const m=createModel({equipment,orders:[
  ord("OS-10","2026-01-01","SUBSTITUIR ESTEIRA LADO DIREITO","ENTE","2026-01-05"),
  ord("OS-11","2026-05-01","SUBSTITUIR ESTEIRA LADO DIREITO","ENCE","2026-05-05"),
  ord("OS-12","2026-06-01","TROCAR ROLETE LD","ENTE","2026-06-05")
 ]});
 const r=analyzeRodante(m,{component:"esteira completa",allowWeak:true});
 assert.equal(r.intervals.length,1); assert.equal(r.intervals[0].days,120);
 assert.equal(r.meanDays,120);
});
test("datas planejadas só entram em modo exploratório",()=>{
 const m=createModel({equipment,orders:[
  ord("OS-21","2026-01-01","SUBSTITUIR ESTEIRA L/D"),
  ord("OS-22","2026-04-11","SUBSTITUIR ESTEIRA L/D")
 ]});
 assert.equal(analyzeRodante(m,{allowProxy:false}).intervals.length,0);
 const r=analyzeRodante(m,{allowProxy:true,allowWeak:true});
 assert.equal(r.intervals.length,1);assert.equal(r.intervals[0].days,100);
 assert.match(r.intervals[0].quality,/estimado/);
});
test("aglutina o mesmo evento em janela de sete dias",()=>{
 const m=createModel({equipment,orders:[
  ord("OS-31","2026-01-01","SUBSTITUIR ESTEIRA LD","ENTE","2026-01-01"),
  ord("OS-32","2026-01-04","SUBSTITUIR ESTEIRA LD","ENTE","2026-01-04"),
  ord("OS-33","2026-04-01","SUBSTITUIR ESTEIRA LD","ENTE","2026-04-01")
 ]});
 const r=analyzeRodante(m,{allowWeak:true});assert.equal(r.audit.length,2);assert.equal(r.intervals.length,1);assert.equal(r.clustered,1);
});
test("enriquecimento preserva todas as colunas originais",()=>{
 const m=createModel({equipment,orders:[{...ord("OS-41","2026-01-01","INSPECIONAR"),"Coluna personalizada":"preservada"}]});
 const row=enrichRows(m,"orders")[0];
 assert.equal(row["Coluna personalizada"],"preservada");
 assert.equal(row["Enriq. Denominação equipamento"],"ESCAVADEIRA FICTÍCIA 021-111");
});
test("a ordem sem texto técnico de esteira não vira troca por possuir reserva do componente",()=>{
 const m=createModel({orders:[ord("OS-51","2026-01-01","TROCAR PEÇA DIVERSA","ENTE","2026-01-02")],
 reservations:[{"Nº reserva":"R5",Ordem:"OS-51",Material:"MAT-FICT-2","Texto breve material":"ROLETE"}]});
 assert.equal(analyzeRodante(m,{component:"roletes"}).intervals.length,0);
});

test("montagem da esteira não conta como substituição confirmada",()=>{
 const m=createModel({equipment,orders:[
  ord("OS-61","2026-01-01","MONTAGEM DA ESTEIRA LD","ENTE","2026-01-05"),
  ord("OS-62","2026-04-01","INSTALAR ESTEIRA LD","ENTE","2026-04-05")
 ]});
 const candidates=analyzeRodante(m);
 assert.equal(candidates.eligible.length,0);
 assert.equal(candidates.intervals.length,0);
});
test("status customizados funcionam e cancelamento tem precedência",()=>{
 const m=createModel({equipment,orders:[
  ord("OS-71","2026-01-01","SUBSTITUIR ESTEIRA LD","FINAL","2026-01-05"),
  ord("OS-72","2026-04-01","SUBSTITUIR ESTEIRA LD","FINAL","2026-04-05"),
  ord("OS-73","2026-07-01","SUBSTITUIR ESTEIRA LD","FINAL VOID","2026-07-05")
 ]});
 const r=analyzeRodante(m,{completionStatuses:["FINAL"],cancellationStatuses:["VOID"],allowWeak:true});
 assert.equal(r.intervals.length,1);assert.equal(r.eligible.length,2);
});
test("não agrega médias de componentes diferentes num indicador global",()=>{
 const m=createModel({equipment,orders:[
  ord("OS-81","2026-01-01","SUBSTITUIR ESTEIRA LD","ENTE","2026-01-05"),
  ord("OS-82","2026-04-01","SUBSTITUIR ESTEIRA LD","ENTE","2026-04-05"),
  ord("OS-83","2026-01-01","SUBSTITUIR ROLETE LD","ENTE","2026-01-07"),
  ord("OS-84","2026-05-01","SUBSTITUIR ROLETE LD","ENTE","2026-05-07")
 ]});
 const r=analyzeRodante(m,{component:"todos",allowWeak:true});
 assert.equal(r.intervals.length,2);
 assert.equal(r.meanDays,null);
 assert.equal(r.mixingComponents,true);
});

test("lê corretamente datas Excel e formatos brasileiros com ano de dois dígitos",()=>{
 assert.equal(isoDate(46348),"2026-11-22");
 assert.equal(isoDate("22/11/26"),"2026-11-22");
 assert.equal(isoDate("22.11.26"),"2026-11-22");
});
test("prioriza Data-base, depois Fim da avaria e depois Entrada, preservando fonte",()=>{
 const m=createModel({orders:[
  {Ordem:"A", "Tipo de ordem":"PM01","Texto breve":"TROCAR ESTEIRA LD",
   "Data-base do início":46348,"Data de entrada":46320},
  {Ordem:"B", "Tipo de ordem":"PM01","Texto breve":"TROCAR ESTEIRA LD",
   "Data de entrada":46200}
 ],notes:[{"Tipo de nota":"M1","Nota":"N2",Ordem:"B",
   "Fim da avaria":46210}]});
 const a=classifyRodante(m.orders[0]);
 const b=classifyRodante(m.orders[1]);
 assert.equal(a.source,"Data-base do início");
 assert.equal(a.reference,"2026-11-22");
 assert.equal(b.source,"Fim da avaria");
 assert.equal(b.reference,"2026-07-07");
});
test("não calcula intervalo com lado desconhecido",()=>{
 const m=createModel({equipment,orders:[
  ord("A","2026-01-01","SUBSTITUIR ESTEIRA","ENTE"),
  ord("B","2026-08-01","SUBSTITUIR ESTEIRA","ENTE")
 ]});
 const r=analyzeRodante(m);
 assert.equal(r.missingSide,2);
 assert.equal(r.intervals.length,0);
});
test("material sem código SAP permanece no catálogo e na OS",()=>{
 const m=createModel({orders:[ord("OS-77","2026-01-01","INSPECIONAR ESTEIRA")],
 reservations:[{"Nº reserva":"R-77",Ordem:"OS-77",Material:"",
 "Texto breve material":"PEÇA FICTÍCIA SEM CADASTRO","Qtd.necessária":2,"Unid.medida básica":"UN"}]});
 const list=exportMaterials(m);
 assert.equal(list.length,1);
 assert.equal(list[0]["Sem cadastro"],"SIM");
 assert.equal(m.orders[0].reserves.length,1);
});
test("separa custo total da OS do material reservado",()=>{
 const m=createModel({equipment,orders:[
  {...ord("OS-A","2026-01-01","TROCAR ESTEIRA LD","ENTE"),"Custos tot.reais":100000,"Custos totais plan.":120000},
  {...ord("OS-B","2026-06-01","AJUSTAR ESTEIRA LD","ENTE"),"Custos tot.reais":250}
 ],reservations:[{"Nº reserva":"R-A",Ordem:"OS-A",Material:"MAT-SINT-1",
 "Texto breve material":"CORRENTE DA ESTEIRA","Qtd.necessária":1,"Unid.medida básica":"UN"}]});
 const r=analyzeRodante(m);
 assert.equal(r.costByClass.find(x=>x.operationClass==="troca de esteira / conjunto").totalReal,100000);
 assert.equal(r.costByClass.find(x=>x.operationClass==="ajuste / reposicionamento").totalReal,250);
 assert.equal(r.materialsByOrder.length,1);
 assert.equal(r.materialsByOrder[0].costOrderReal,100000);
});
test("troca de módulos é parcial, e não substituição da esteira completa",()=>{
 const m=createModel({orders:[ord("M1","2026-01-01","TROCAR MÓDULOS DA ESTEIRA LD","ENTE")]});
 assert.equal(classifyRodante(m.orders[0]).operationClass,"troca parcial / componente");
});

test("data-base futura não gera evento retroativo",()=>{
 const m=createModel({equipment,orders:[
   ord("OS-T01","2026-01-01","TROCAR ESTEIRA LD","ENTE"),
   ord("OS-T02","2026-12-01","TROCAR ESTEIRA LD","ENTE")
 ]});
 const r=analyzeRodante(m,{asOf:"2026-06-01"});
 assert.equal(r.futureDated,1);
 assert.equal(r.intervals.length,0);
});

test("data de aquisição funciona como aproximação quando comissionamento falta",()=>{
 const eq=[{Equipamento:"EQ-TRACK", "Denominação do objeto técnico":"TRATOR FICTICIO 050-888",
   "Nº inventário":"050-888","Data de aquisição":"01/01/2025"}];
 const orders=[{Ordem:"OS-888","Tipo de ordem":"PM01",Equipamento:"EQ-TRACK",
   "Texto breve":"TROCAR ESTEIRAS LD E LE","Data-base do início":"01/01/2026",
   "Status do sistema":"ENTE","Custos tot.reais":100000}];
 const m=createModel({equipment:eq,orders,reservations:[{"Nº reserva":"RES-888",
   Ordem:"OS-888",Material:"MAT-888","Texto breve material":"ESTEIRA COMPLETA",
   "Qtd.necessária":2}]});
 const r=analyzeRodante(m,{asOf:"2026-11-17"});
 assert.equal(r.initialLifeEstimates.length,2);
 assert.equal(r.initialLifeEstimates[0].elapsedDays,365);
 assert.equal(r.initialLifeEstimates[0].originSource,"aquisição (não é comissionamento)");
});
test("comissionamento explícito tem precedência sobre aquisição",()=>{
 const eq=[{Equipamento:"EQ-TRACK", "Denominação do objeto técnico":"TRATOR FICTICIO 050-888",
   "Data de aquisição":"01/01/2025","Data de entrada em serviço":"01/03/2025"}];
 const m=createModel({equipment:eq,orders:[{Ordem:"OS-888","Tipo de ordem":"PM01",
   Equipamento:"EQ-TRACK","Texto breve":"TROCAR ESTEIRA LD","Data-base do início":"01/03/2026",
   "Status do sistema":"ENTE","Custos tot.reais":100000}]});
 const r=analyzeRodante(m,{asOf:"2026-11-17"});
 assert.equal(r.initialLifeEstimates.length,1);
 assert.equal(r.initialLifeEstimates[0].elapsedDays,365);
 assert.equal(r.initialLifeEstimates[0].originSource,"entrada em serviço");
});
test("FPS e parafusos da esteira não viram troca de conjunto",()=>{
 const m=createModel({orders:[
  {Ordem:"A","Tipo de ordem":"PM01","Texto breve":"SUBSTITUIR PARAFUSOS DA ESTEIRA LD","Status do sistema":"ENTE","Custos tot.reais":1000},
  {Ordem:"B","Tipo de ordem":"PM01","Texto breve":"SUBSTITUIÇÃO FPS","Status do sistema":"ENTE","Custos tot.reais":1000}
 ],notes:[{"Tipo de nota":"M1","Nota":"N1",Ordem:"B","Texto breve":"TROCA ESTEIRA"}]});
 assert.equal(classifyRodante(m.orders[0]).operationClass,"troca parcial / componente");
 assert.equal(classifyRodante(m.orders[1]).operationClass,"troca parcial / componente");
 assert.equal(analyzeRodante(m,{asOf:"2026-11-17"}).intervals.length,0);
});
test("reserva apenas de parafusos não valida troca completa, mesmo com status e custo",()=>{
 const m=createModel({orders:[{Ordem:"A","Tipo de ordem":"PM01","Texto breve":"TROCAR ESTEIRA LD",
   "Status do sistema":"ENTE","Custos tot.reais":1000,"Data-base do início":"01/01/2026"}],
   reservations:[{"Nº reserva":"A-1",Ordem:"A",Material:"MAT-P","Texto breve material":"PARAFUSO SEXTAVADO"}]});
 assert.equal(classifyRodante(m.orders[0]).eventStrong,false);
 assert.equal(analyzeRodante(m,{asOf:"2026-11-17"}).initialLifeEstimates.length,0);
});

test("catalogo de esteira e lagarta com código e sem palavra 'completa' é evidência de conjunto",()=>{
 const m=createModel({equipment:[{Equipamento:"EQ-A","Denominação do objeto técnico":"TRATOR FICTÍCIO 050-888","Data de aquisição":"01/01/2025"}],
 orders:[{Ordem:"A","Tipo de ordem":"PM01","Equipamento":"EQ-A","Texto breve":"TROCAR ESTEIRAS LD LE",
   "Status do sistema":"ENTE","Data-base do início":"01/01/2026","Custos tot.reais":200000}],
 reservations:[{"Nº reserva":"R-A",Ordem:"A","Texto breve material":"LAGARTA 12345 FABRICANTE","Qtd.necessária":2}]});
 assert.equal(classifyRodante(m.orders[0]).eventStrong,true);
 assert.equal(analyzeRodante(m,{asOf:"2026-11-17"}).initialLifeEstimates.length,2);
});


test("backup JSON restaura todas as bases, metadados e filtros sem perda",()=>{
 const bases={equipment:[{"Equipamento":"EQ-TESTE","Denominação do objeto técnico":"TRATOR DE ESTEIRAS FICTICIO 050-999"}],
   orders:[{"Ordem":"OS-111","Tipo de ordem":"PM01","Texto breve":"TROCAR ESTEIRA LD"}],
   reservations:[{"Nº reserva":"RES-111","Ordem":"OS-111","Material":"MAT-111"}],
   notes:[{"Nota":"N-111","Tipo de nota":"M1"}],locations:[]};
 const session=serializeSession(bases,[{file:"base-ficticia.xlsx",role:"orders"}],
   {lifeAllowWeak:true,lifeAsOf:"2026-11-17"});
 const restored=restoreSession(JSON.parse(JSON.stringify(session)));
 assert.equal(restored.bases.orders[0].Ordem,"OS-111");
 assert.equal(restored.bases.reservations[0].Material,"MAT-111");
 assert.equal(restored.bases.equipment[0].Equipamento,"EQ-TESTE");
 assert.equal(restored.settings.lifeAsOf,"2026-11-17");
 assert.equal(restored.settings.lifeAllowWeak,true);
});
test("sessão JSON inválida é rejeitada sem alterar contexto",()=>{
 assert.throws(()=>restoreSession({format:"dado inventado",version:1,bases:{}}));
});
test("ciclo de vida lista a ordem exata por equipamento e lado",()=>{
 const m=createModel({equipment:[{Equipamento:"EQ-D9",
   "Denominação do objeto técnico":"TRATOR DE ESTEIRAS FICTICIO 050-999",
   "Data de aquisição":"01/01/2025","Data de entrada em serviço":"01/03/2025"}],
  orders:[
   {Ordem:"OS-PRIMEIRA","Tipo de ordem":"PM01",Equipamento:"EQ-D9",
    "Texto breve":"SUBSTITUIR ESTEIRA LD","Data-base do início":"01/03/2026",
    "Custos tot.reais":90000,"Status do sistema":"ENTE"},
   {Ordem:"OS-SEGUNDA","Tipo de ordem":"PM01",Equipamento:"EQ-D9",
    "Texto breve":"SUBSTITUIR ESTEIRA LD","Data-base do início":"01/08/2026",
    "Custos tot.reais":120000,"Status do sistema":"ENCE"}],
  reservations:[
   {"Nº reserva":"RS1",Ordem:"OS-PRIMEIRA","Material":"M1","Texto breve material":"ESTEIRA COMPLETA"},
   {"Nº reserva":"RS2",Ordem:"OS-SEGUNDA","Material":"M2","Texto breve material":"GRUPO DE ESTEIRA"}]
 });
 const r=analyzeLifecycle(m,{asOf:"2026-11-17"});
 assert.equal(r.equipmentSummary.length,1);
 assert.equal(r.cycles.length,2);
 assert.equal(r.cycles[0].order,"OS-PRIMEIRA");
 assert.equal(r.cycles[0].days,365);
 assert.equal(r.cycles[1].order,"OS-SEGUNDA");
 assert.equal(r.cycles[1].previousOrder,"OS-PRIMEIRA");
 assert.equal(r.cycles[1].days,153);
 assert.equal(r.materialDetails.length,2);
 assert.equal(r.metrics.approvedOrders,2);
});
test("troca dos dois lados na mesma OS conta uma ordem, duas esteiras",()=>{
 const m=createModel({equipment:[{Equipamento:"EQ-A",
   "Denominação do objeto técnico":"TRATOR DE ESTEIRAS FICTICIO 050-999",
   "Data de aquisição":"01/01/2025"}],
   orders:[{Ordem:"OS-BOTH","Tipo de ordem":"PM01",Equipamento:"EQ-A",
    "Texto breve":"SUBSTITUIR ESTEIRAS LD LE","Data-base do início":"01/01/2026",
    "Custos tot.reais":100000,"Status do sistema":"ENCE"}]});
 const r=analyzeLifecycle(m,{asOf:"2026-11-17"});
 assert.equal(r.cycles.length,2);
 assert.equal(r.equipmentSummary[0].acceptedOrders,1);
 assert.equal(r.equipmentSummary[0].observedSides,2);
});
test("materiais de ajuste não são tratados como troca e ficam auditáveis",()=>{
 const m=createModel({equipment:[{Equipamento:"EQ-A",
   "Denominação do objeto técnico":"PERFURATRIZ FICTICIA DR410 010-888"}],
   orders:[{Ordem:"OS-AJUSTE","Tipo de ordem":"PM01",Equipamento:"EQ-A",
    "Texto breve":"AJUSTAR TENSIONAMENTO ESTEIRA LD","Data-base do início":"01/01/2026"}],
   reservations:[{"Nº reserva":"R-A",Ordem:"OS-AJUSTE","Material":"M-T",
    "Texto breve material":"VALVULA TENSORA"}]});
 const r=analyzeLifecycle(m,{asOf:"2026-11-17"});
 assert.equal(r.equipmentSummary.length,1);
 assert.equal(r.equipmentSummary[0].acceptedOrders,0);
 assert.equal(r.audit[0].order,"OS-AJUSTE");
 assert.equal(r.materialDetails[0].order,"OS-AJUSTE");
});
test("ordem sem lado conhecido permanece na auditoria, sem produzir vida calculada",()=>{
 const m=createModel({equipment:[{Equipamento:"EQ-A",
   "Denominação do objeto técnico":"ESCAVADEIRA FICTICIA CAT 395 021-888"}],
   orders:[{Ordem:"OS-SEM-LADO","Tipo de ordem":"PM01",Equipamento:"EQ-A",
    "Texto breve":"SUBSTITUIR ESTEIRA COMPLETA","Data-base do início":"01/01/2026",
    "Custos tot.reais":100000,"Status do sistema":"ENCE"}]});
 const r=analyzeLifecycle(m,{asOf:"2026-11-17"});
 assert.equal(r.cycles.length,0);
 assert.equal(r.audit[0].order,"OS-SEM-LADO");
 assert.equal(r.metrics.missingSide,1);
});

test("a TAG da escavadeira CAT 395 não é confundida com o modelo",()=>{
 const m=createModel({equipment:[{Equipamento:"EQ-395",
   "Denominação do objeto técnico":"ESCAVADEIRA HIDRÁULICA CAT 395 021-004"}]});
 assert.equal(m.byTag.get("021-004")[0].id,"EQ-395");
 assert.equal(m.byTag.has("395-021"),false);
});
test("nota sem ordem própria é localizada pela nota vinculada na IW39",()=>{
 const m=createModel({equipment:[{Equipamento:"EQ-TR",
  "Denominação do objeto técnico":"TRATOR DE ESTEIRAS FICTICIO 050-999"}],
  orders:[{Ordem:"OS-007","Tipo de ordem":"PM01","Nota":"N-007",
   "Equipamento":"EQ-TR","Texto breve":"SUBSTITUIR ESTEIRA LD",
   "Data-base do início":"01/01/2026"}],
  notes:[{"Tipo de nota":"M1","Nota":"N-007","Fim da avaria":"04/01/2026"}]});
 assert.equal(m.orders[0].notes.length,1);
 assert.equal(m.orders[0].notes[0].id,"N-007");
 assert.equal(classifyRodante(m.orders[0]).faultEnd,"2026-01-04");
});

test("pacote enriquecido conserva as cinco fontes e pode ser reprocessado",()=>{
 const originals={
  equipment:[{Equipamento:"EQ-FICT","Denominação do objeto técnico":"TRATOR DE ESTEIRAS FICTÍCIO 050-999","Data de aquisição":"01/01/2025"}],
  locations:[{"Local de instalação":"L-FICT","Tipo de objeto":"MAQUINA"}],
  orders:[{Ordem:"OS-FICT","Tipo de ordem":"PM01",Equipamento:"EQ-FICT",
   "Texto breve":"SUBSTITUIR ESTEIRA LD","Status do sistema":"ENCE",
   "Custos tot.reais":1000,"Data-base do início":"01/01/2026"}],
  notes:[{"Nota":"N-FICT","Tipo de nota":"M1","Ordem":"OS-FICT","Fim da avaria":"02/01/2026"}],
  reservations:[{"Nº reserva":"RES-FICT",Ordem:"OS-FICT","Material":"MAT-FICT",
   "Texto breve material":"ESTEIRA COMPLETA","Qtd.necessária":1}]
 };
 const first=createModel(originals);
 const roundtrip=Object.fromEntries(["equipment","locations","orders","notes","reservations"].map(role=>
   [role,enrichRows(first,role).map(row=>({...row,__SAP_ROLE:role}))]));
 const second=createModel(roundtrip);
 assert.equal(second.orders.length,1);
 assert.equal(second.orders[0].reserves[0].material,"MAT-FICT");
 assert.equal(second.orders[0].notes[0].id,"N-FICT");
 assert.equal(second.byEquip.get("EQ-FICT").acquisitionDate,"01/01/2025");
});

test("exportação enriquecida oferece data de entrada em serviço editável",()=>{
 const m=createModel({equipment:[{Equipamento:"EQ-NEW",
  "Denominação do objeto técnico":"PERFURATRIZ FICTÍCIA 010-999",
  "Data de aquisição":"01/01/2026"}]});
 const rows=enrichRows(m,"equipment");
 assert.ok(Object.hasOwn(rows[0],"Data de entrada em serviço"));
 const edited={...rows[0],"Data de entrada em serviço":"01/02/2026"};
 assert.equal(createModel({equipment:[edited]}).byEquip.get("EQ-NEW").serviceStart,"01/02/2026");
});
test("reserva eliminada não demonstra presença de conjunto completo",()=>{
 const m=createModel({equipment:[{Equipamento:"EQ-NEW",
  "Denominação do objeto técnico":"TRATOR DE ESTEIRAS FICTÍCIO 050-999"}],
  orders:[{Ordem:"OS-RED","Tipo de ordem":"PM01",Equipamento:"EQ-NEW",
   "Texto breve":"TROCAR ESTEIRA LD","Data-base do início":"01/01/2026",
   "Status do sistema":"ENTE","Custos tot.reais":1000}],
  reservations:[{"Nº reserva":"RES-RED",Ordem:"OS-RED","Material":"MAT-FICT",
   "Texto breve material":"ESTEIRA COMPLETA","Item foi eliminado":"X"}]});
 const result=classifyRodante(m.orders[0]);
 assert.equal(result.fullMaterial,false);
 assert.equal(result.evidenceLevel,"média (sem MB24 da troca)");
});

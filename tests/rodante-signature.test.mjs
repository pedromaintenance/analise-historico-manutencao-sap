import test from "node:test";
import assert from "node:assert/strict";
import {classifyRodante,createModel,analyzeLifecycle,rodanteMaterialSignature} from "../src/engine.js";

const equip=(tag="021-999")=>[{
 Equipamento:"EQ-FAKE-100", "Denominação do objeto técnico":"ESCAVADEIRA HIDRÁULICA CAT 395 "+tag,
 "Data de aquisição":"01/01/2024"
}];
const row=(os,description,date="2025-04-09",cost=220000,status="ENTE CAPC DMNV MOME NOAP")=>({
 Ordem:os,Equipamento:"EQ-FAKE-100","Tipo de ordem":"PM01",
 "Texto breve":description,"Data-base do início":date,
 "Custos tot.reais":cost,"Status do sistema":status
});
const reservation=(os,description,qty,i)=>({
 "Nº reserva":"R-SYNTH-10",Ordem:os,Material:"M-SYNTH-"+os+"-"+i,
 "Texto breve material":description,"Qtd.necessária":qty,"Unid.medida básica":"UN"
});
const kit=(os)=>[
 ["CONJUNTO ELOS DA ESTEIRA",2],
 ["SAPATA ESTEIRA",97],
 ["PARAFUSO ESTEIRA",386],
 ["PORCA ESTEIRA",386],
 ["RODA GUIA",2],
 ["RODA MOTRIZ",2]
].map(([desc,n],i)=>reservation(os,desc,n,i));

test("montagem explícita com kit, custo e status vira provável troca integral",()=>{
 const m=createModel({equipment:equip(),orders:[row("OS-SYNTH-MOUNT","MONTAGEM DA ESTEIRA EQUIPE EXTERNA")],
 reservations:kit("OS-SYNTH-MOUNT")});
 const a=classifyRodante(m.orders[0]);
 assert.equal(a.operationClass,"troca de esteira / conjunto");
 assert.equal(a.materialSignature.complete,true);
 assert.equal(a.eventStrong,true);
 assert.equal(analyzeLifecycle(m,{asOf:"2026-11-18"}).metrics.approvedOrders,1);
});
test("backlog esteira completa + elos/sapatas/fixações/custo é provável troca, não simples texto",()=>{
 const os="OS-SYNTH-BACKLOG";
 const items=[
  reservation(os,"CONJUNTO ELOS ESTER",2,0),
  reservation(os,"SAPATA ESTEIRA",98,1),
  reservation(os,"PARAFUSO ESTEIRA",398,2),
  reservation(os,"PORCA ESTEIRA",398,3)
 ];
 const m=createModel({equipment:equip(),orders:[row(os,"BACKLOG ESTEIRA COMPLETA.", "2025-02-10",215000)],
 reservations:items});
 assert.equal(classifyRodante(m.orders[0]).eventStrong,true);
});
test("material rodante + esteira/roletes/roda motriz + custo identifica conjunto",()=>{
 const os="OS-SYNTH-ROD";
 const items=[reservation(os,"ESTEIRA 5704136 FABRICANTE",2,0),
 reservation(os,"ROLETE SIMPLES INFERIOR",15,1),
 reservation(os,"RODA MOTRIZ",2,2)];
 const m=createModel({equipment:equip(),orders:[row(os,"MATERIAL RODANTE","2025-09-23",404000)],
 reservations:items});
 const a=classifyRodante(m.orders[0]);
 assert.equal(a.materialSignature.complete,true);
 assert.equal(a.operationClass,"troca de esteira / conjunto");
 assert.equal(a.eventStrong,true);
 assert.equal(a.eventDate,"2025-09-23");
});
test("montagem de corrente com sapatas e fixações é integral mesmo sem ENTE",()=>{
 const os="OS-SYNTH-LIB";
 const items=[reservation(os,"CORRENTE EH395",2,0),reservation(os,"SAPATA PN 111",102,1),
 reservation(os,"PARAFUSO PN 222",404,2),reservation(os,"PORCA DE 333",406,3)];
 const m=createModel({equipment:equip(),orders:[row(os,"SERVICO DE MONTAGEM DA ESTEIRA 395-FAKE","2026-01-27",617000,"LIB CAPC DMNV MOME")],
 reservations:items});
 assert.equal(classifyRodante(m.orders[0]).eventStrong,true);
 assert.equal(analyzeLifecycle(m,{asOf:"2026-11-18"}).metrics.approvedOrders,1);
});
test("fim da avaria depois da data-base é o marco escolhido para o evento",()=>{
 const os="OS-SYNTH-END";
 const m=createModel({equipment:equip(),orders:[row(os,"MONTAGEM DA ESTEIRA","2025-04-09",265000)],
 notes:[{"Nota":"N-END","Tipo de nota":"M1",Ordem:os,"Fim da avaria":"14/12/2025"}],
 reservations:kit(os)});
 const r=analyzeLifecycle(m,{asOf:"2026-11-18"});
 assert.equal(r.equipmentEvents[0].date,"2025-12-14");
 assert.equal(r.equipmentEvents[0].dateSource,"Fim da avaria");
});
test("OS com custo e kit conecta uma OS posterior de substituição sem duplicar",()=>{
 const os="OS-SYNTH-KIT";
 const m=createModel({equipment:equip(),orders:[
 row(os,"SERVICO DE MONTAGEM DA ESTEIRA","2026-01-27",617000,"LIB CAPC DMNV MOME"),
 row("OS-SYNTH-SCOPE","SUBSTITUICAO ESTEIRA LD/LE","2026-02-23",0)
 ],reservations:kit(os)});
 const r=analyzeLifecycle(m,{asOf:"2026-11-18"});
 assert.equal(r.metrics.approvedOrders,1);
 assert.equal(r.equipmentEvents[0].relatedOrders,"OS-SYNTH-SCOPE");
 assert.equal(r.equipmentEvents[0].date,"2026-02-23");
 assert.equal(r.equipmentEvents[0].side,"ambos");
 assert.equal(r.equipmentEvents[0].dateSource,"Data-base de OS relacionada (inferência; validar)");
});
test("backlog sem custos/kit pode apoiar mas não ser contado como troca",()=>{
 const os="OS-SYNTH-COST";
 const m=createModel({equipment:equip(),orders:[
 row(os,"MONTAGEM DA ESTEIRA","2025-04-09",265000),
 row("OS-SYNTH-ZERO","BACKLOG - MATERIAL RODANTE COMPLETO","2025-05-28",0)
 ],notes:[
 {"Nota":"N-COST","Tipo de nota":"M1",Ordem:os,"Fim da avaria":"14/12/2025"},
 {"Nota":"N-ZERO","Tipo de nota":"M1",Ordem:"OS-SYNTH-ZERO","Fim da avaria":"14/12/2025"}
 ],reservations:kit(os)});
 const r=analyzeLifecycle(m,{asOf:"2026-11-18"});
 assert.equal(r.metrics.approvedOrders,1);
 assert.equal(r.equipmentEvents[0].relatedOrders,"OS-SYNTH-ZERO");
 assert.equal(r.equipmentEvents[0].date,"2025-12-14");
});
test("custo elevado sem corrente e sem kit NÃO caracteriza substituição integral",()=>{
 const os="OS-SYNTH-FALSE";
 const m=createModel({equipment:equip(),orders:[row(os,"TROCA DE ROLETES","2025-04-09",490000)],
 reservations:[reservation(os,"ROLETES INFERIORES",15,0),
 reservation(os,"PARAFUSOS",400,1)]});
 const r=analyzeLifecycle(m,{asOf:"2026-11-18"});
 assert.equal(classifyRodante(m.orders[0]).eventStrong,false);
 assert.equal(r.metrics.approvedOrders,0);
});
test("custo elevadíssimo sem material e sem evidência cruzada não se transforma em troca integral",()=>{
 const os="OS-SYNTH-NO-KIT";
 const m=createModel({equipment:equip(),orders:[row(os,"SUBSTITUIR ESTEIRA LD LE","2025-04-09",600000)]});
 assert.equal(classifyRodante(m.orders[0]).eventStrong,false);
 assert.equal(analyzeLifecycle(m,{asOf:"2026-11-18"}).metrics.approvedOrders,0);
});
test("serviço genérico de transporte não é kit de substituição",()=>{
 const m=createModel({equipment:equip(),orders:[row("OS-SYNTH-TRANSP","ENVIO DAS ESTEIRAS PARA MONTAGEM","2026-04-01",190000)],
 reservations:[reservation("OS-SYNTH-TRANSP","TRANSPORTE RODOVIARIO DE CARGAS",19099,0)]});
 assert.equal(classifyRodante(m.orders[0]).eventStrong,false);
 assert.equal(analyzeLifecycle(m,{asOf:"2026-11-18"}).metrics.approvedOrders,0);
});

test("item de reserva marcado eliminado continua quando quantidade registrada foi positiva",()=>{
 const os="OS-SYNTH-POSTED";
 const posted=kit(os).map(r=>({
   ...r,"Item foi eliminado":"X","Com registro final":"X",
   "Qtd.  UM registro":r["Qtd.necessária"]
 }));
 const m=createModel({equipment:equip(),orders:[
  row(os,"MONTAGEM DA ESTEIRA","2025-04-09",265000)
 ],reservations:posted});
 const a=classifyRodante(m.orders[0]);
 assert.equal(a.materialSignature.complete,true);
 assert.equal(a.materialSignature.postedCore,true);
 assert.equal(a.materialSignature.postedRows,6);
 assert.equal(a.eventStrong,true);
 assert.match(a.evidenceLevel,/materiais registrados/);
});
test("posição eliminada sem quantidade registrada não comprova montagem",()=>{
 const os="OS-SYNTH-DELETED";
 const cancelledItems=kit(os).map(r=>({...r,"Item foi eliminado":"X","Qtd.  UM registro":0}));
 const m=createModel({equipment:equip(),orders:[
   row(os,"MONTAGEM DA ESTEIRA","2025-04-09",265000)
 ],reservations:cancelledItems});
 assert.equal(classifyRodante(m.orders[0]).materialSignature.complete,false);
 assert.equal(classifyRodante(m.orders[0]).eventStrong,false);
});

test("escopo completo pode listar roletes sem ser tratado como troca isolada",()=>{
 const os="OS-SYNTH-MIX";
 const m=createModel({equipment:equip(),orders:[
 row(os,"SUBSTITUIR MATERIAL RODANTE COMPLETO E ROLETES","2026-03-01",350000)
 ],reservations:kit(os).concat([reservation(os,"ROLETES INFERIORES",12,9)])});
 const a=classifyRodante(m.orders[0]);
 assert.equal(a.operationClass,"troca de esteira / conjunto");
 assert.equal(a.eventStrong,true);
});

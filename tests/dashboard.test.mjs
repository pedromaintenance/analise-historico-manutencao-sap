import test from "node:test";
import assert from "node:assert/strict";
import {buildDashboardData,renderDashboardCards,generateStandaloneDashboard,inferEquipmentModel} from "../src/dashboard.js";
const makeData=()=>({
 equipmentSummary:[{equipment:"EQ-FICT-001",asset:"TRATOR DE ESTEIRAS CAT D9 050-999",tag:"050-999",
 family:"Tratores de esteiras",commissioning:"2025-03-01",acquisition:"2025-01-01"},
 {equipment:"EQ-FICT-002",asset:"ESCAVADEIRA CAT 395 021-999",tag:"021-999",
 family:"Escavadeiras",commissioning:"",acquisition:"2022-01-01"}],
 cycles:[{equipment:"EQ-FICT-001",asset:"TRATOR DE ESTEIRAS CAT D9 050-999",side:"direito",cycleType:"Primeira troca observada",days:365,order:"OS-100"},
  {equipment:"EQ-FICT-001",asset:"TRATOR DE ESTEIRAS CAT D9 050-999",side:"direito",cycleType:"Troca subsequente",days:200,order:"OS-200"},
  {equipment:"EQ-FICT-001",asset:"TRATOR DE ESTEIRAS CAT D9 050-999",side:"esquerdo",cycleType:"Primeira troca observada",days:365,order:"OS-100"}],
 audit:[{equipment:"EQ-FICT-001",asset:"TRATOR DE ESTEIRAS CAT D9 050-999",order:"OS-100",
   description:"TROCAR ESTEIRAS DIREITA E ESQUERDA",dateBase:"2026-03-01",
   faultEnd:"2026-03-02",entry:"2026-02-28",costReal:100000,operationClass:"troca de esteira / conjunto"},
  {equipment:"EQ-FICT-001",asset:"TRATOR DE ESTEIRAS CAT D9 050-999",order:"OS-200",
   description:"TROCAR ESTEIRA DIREITA",dateBase:"2026-09-17",costReal:50000,operationClass:"troca de esteira / conjunto"},
  {equipment:"EQ-FICT-002",asset:"ESCAVADEIRA CAT 395 021-999",order:"OS-300",
   description:"AJUSTAR TENSÃO DE ESTEIRA",dateBase:"2026-01-01",costReal:450,operationClass:"ajuste / reposicionamento"}],
 materialDetails:[{equipment:"EQ-FICT-001",order:"OS-100",reservation:"RES-1",material:"MAT-1",
   description:"ESTEIRA COMPLETA",required:2,unit:"UN"}]
});
test("infere o modelo sem confundir TAG com o modelo",()=>{
 assert.equal(inferEquipmentModel("ESCAVADEIRA CAT 395 021-999"),"395");
 assert.equal(inferEquipmentModel("TRATOR DE ESTEIRAS CAT D9 050-999"),"D9");
});
test("gera um card para cada equipamento, com tag, família e modelo",()=>{
 const payload=buildDashboardData(makeData());
 assert.equal(payload.machines.length,2);
 assert.equal(payload.machines[0].tag,"050-999");
 assert.equal(payload.machines[0].model,"D9");
 assert.equal(payload.machines[0].operationalStart,"2025-03-01");
});
test("não duplica OS quando troca direita e esquerda na mesma ordem",()=>{
 const machine=buildDashboardData(makeData()).machines[0];
 assert.equal(machine.changeOrders,2);
 assert.equal(machine.trackedSides,3);
 assert.equal(machine.days,200);
 assert.equal(machine.daysKind,"Mediana entre substituições");
});
test("preserva custo, datas e vínculo de material por OS",()=>{
 const machine=buildDashboardData(makeData()).machines[0];
 assert.equal(machine.orders.find(o=>o.order==="OS-100").costReal,100000);
 assert.equal(machine.orders.find(o=>o.order==="OS-100").faultEnd,"2026-03-02");
 assert.equal(machine.orders.find(o=>o.order==="OS-100").materials[0].material,"MAT-1");
});
test("a seleção pode excluir equipamentos específicos do HTML",()=>{
 const payload=buildDashboardData(makeData(),{excluded:["EQ-FICT-002"],includeAll:false});
 assert.equal(payload.machines.length,1);
 assert.equal(payload.machines[0].tag,"050-999");
 const html=generateStandaloneDashboard(payload);
 assert.ok(html.includes("050-999"));
 assert.ok(!html.includes("021-999"));
});
test("escapa HTML e script injetado no texto da ordem",()=>{
 const life=makeData();
 life.audit[0].description='TROCA </script><script>alert("x")</script>';
 const html=generateStandaloneDashboard(buildDashboardData(life));
 assert.ok(!html.includes("</script><script>alert("));
 assert.ok(html.includes("&lt;/script&gt;"));
});
test("card permite consultar materiais na linha da OS sem navegar",()=>{
 const html=renderDashboardCards(buildDashboardData(makeData()),{includeOther:true});
 assert.ok(html.includes("<details>"));
 assert.ok(html.includes("Materiais (1)"));
 assert.ok(html.includes("RES-1"));
});
test("sem trocas, mostra referência negativa e não inventa ciclo",()=>{
 const payload=buildDashboardData(makeData());
 const machine=payload.machines[1];
 assert.equal(machine.changeOrders,0);
 assert.equal(machine.days,null);
 assert.ok(machine.noChangeMessage.includes("Nenhuma troca"));
});

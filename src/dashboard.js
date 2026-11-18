/* Gerador de relatório local — somente código, nenhum cadastro real. */
export const DASHBOARD_VERSION="1.0";
const toText=v=>v==null?"":String(v);
const escapeHtml=v=>toText(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateBR=v=>{const s=toText(v);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+"/"+m[2]+"/"+m[1]:s||"—";};
const money=v=>Number.isFinite(Number(v))?Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}):"—";
const days=v=>Number.isFinite(Number(v))&&v!==""?Math.round(Number(v)).toLocaleString("pt-BR"):"—";
const median=xs=>{if(!xs.length)return null;const s=[...xs].sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2};
export function inferEquipmentModel(asset,model=""){
 const s=(toText(model)+" "+toText(asset)).toUpperCase();
 const match=s.match(/\b(DR410I|DI650I|D560|D9T|D9R|D9|D8|D7|D6|6030|395|374|352|336|320|313|303\.5|PC[0-9]+)\b/);
 return match?match[1]:toText(model)||"Não identificado";
}
export function buildDashboardData(lifecycle,{excluded=[],includeAll=true,createdAt=new Date().toISOString(),title="Ciclo de Vida — Material Rodante"}={}){
 if(!lifecycle||!Array.isArray(lifecycle.equipmentSummary)||!Array.isArray(lifecycle.audit))throw new Error("Relatório de ciclo de vida inválido.");
 const excludedIds=new Set(excluded.map(toText));
 const machines=lifecycle.equipmentSummary.map(m=>{
  const id=toText(m.equipment||m.objectId||m.tag||m.asset);
  const audits=lifecycle.audit.filter(a=>toText(a.equipment||a.objectId||a.tag)===id||(!a.equipment&&a.asset===m.asset))
   .sort((a,b)=>toText(b.dateReference||b.reference).localeCompare(toText(a.dateReference||a.reference)));
  const unique=new Map();
  for(const a of audits){const os=toText(a.order);if(os&&!unique.has(os))unique.set(os,a);}
  const cycles=(lifecycle.cycles||[]).filter(c=>toText(c.equipment||c.objectId||c.tag)===id||(!c.equipment&&c.asset===m.asset));
  const machineEvents=(lifecycle.equipmentEvents||[]).filter(x=>
    toText(x.equipment||x.tag)===id||(!x.equipment&&x.asset===m.asset));
  const knownFirst=cycles.filter(c=>toText(c.cycleType||c.kind).toLowerCase().includes("primeira")&&Number.isFinite(Number(c.days??c.elapsedDays))&&toText(c.days??c.elapsedDays)!=="").map(c=>Number(c.days??c.elapsedDays));
  const subsequent=cycles.filter(c=>toText(c.cycleType||c.kind).toLowerCase().includes("subsequente")&&Number.isFinite(Number(c.days??c.elapsedDays))&&toText(c.days??c.elapsedDays)!=="").map(c=>Number(c.days??c.elapsedDays));
  const firstEventDays=machineEvents.map(x=>x.firstElapsedDays).filter(x=>x!=null&&Number.isFinite(+x)).map(Number);
  const stat=subsequent.length?median(subsequent):knownFirst.length?median(knownFirst):firstEventDays.length?Math.min(...firstEventDays):null;
  const statKind=subsequent.length?"Mediana entre substituições":knownFirst.length?"Tempo até 1ª troca (estimado)":firstEventDays.length?"Tempo até primeira intervenção integral (estimado)":"Sem ciclo estimável";
  const approvedAudit=[...unique.values()].filter(a=>a.accepted==="SIM");
  const acceptedOS=new Set([...cycles.map(c=>toText(c.order)),
    ...approvedAudit.map(a=>toText(a.order))].filter(Boolean));

  const materialDetails=(lifecycle.materialDetails||[]).filter(x=>toText(x.equipment||x.objectId||x.tag)===id||(!x.equipment&&x.asset===m.asset));
  const materialByOrder=new Map();
  for(const r of materialDetails){const os=toText(r.order);if(!materialByOrder.has(os))materialByOrder.set(os,[]);materialByOrder.get(os).push({
   reservation:toText(r.reservation),material:toText(r.material||r.code),description:toText(r.description),
   qty:toText(r.required??r.qty),unit:toText(r.unit),deleted:toText(r.deleted),finalFlag:toText(r.finalFlag)
  });}
  const orders=[...unique.values()].map(a=>{
    const os=toText(a.order);
    const materials=materialByOrder.get(os)||[];
    return {
     order:os,description:toText(a.description),dateBase:toText(a.dateBase),
     faultEnd:toText(a.faultEnd),entry:toText(a.entry),dateReference:toText(a.dateReference||a.reference),
     referenceSource:toText(a.referenceSource||a.dateSource),costReal:Number(a.costReal??a.cost??0)||0,
     costPlanned:Number(a.costPlanned??a.planned??0)||0,
     classification:toText(a.operationClass||a.classification),status:toText(a.status),
     evidence:toText(a.evidence||a.confidence),reason:toText(a.reason||a.justification),
     materialEvidence:toText(a.materialEvidence),materialFamilies:toText(a.materialFamilies),
     supportingOrders:toText(a.supportingOrders),
     eventDateSource:toText(a.referenceSource),
     scopeEvidence:toText(a.scopeEvidence),
     isChange:acceptedOS.has(os),side:toText(a.side),materials,
     materialCount:materials.length||Number(a.reserveCount??a.materialCount??0)||0
    };
  });
  const operationalStart=toText(m.commissioning||m.commissioned||m.serviceStart||m.acquisition);
  const operationalSource=m.commissioning||m.commissioned||m.serviceStart?"Início em serviço":"Aquisição — estimativa";
  return {
   id,equipment:toText(m.equipment||""),tag:toText(m.tag),asset:toText(m.asset),
   family:toText(m.family),model:inferEquipmentModel(m.asset,m.model),
   operationalStart,operationalSource,days:stat,daysKind:statKind,
   intervalCount:subsequent.length,firstCount:knownFirst.length||firstEventDays.length,
   changeOrders:acceptedOS.size,trackedSides:cycles.length,
   orders,selected:!excludedIds.has(id),
   noChangeMessage:acceptedOS.size?"":"Nenhuma troca de conjunto qualificada no recorte; ordens de inspeção e reparo permanecem para consulta."
  };
 });
 return {format:"sap-rodante-dashboard",version:DASHBOARD_VERSION,title,createdAt,
  disclaimer:"Datas-base são planejadas e não comprovam execução. Aquisição não comprova início de serviço nem instalação da esteira original. Valores monetários são custos da OS, não necessariamente apenas do material rodante. Reservas não comprovam consumo físico.",
  machines:includeAll?machines:machines.filter(m=>m.selected)};
}


/** Identificador estável de decisão: mesmo código de OS pode existir em ativos distintos. */
export function reviewOrderKey(assetId,orderId) {
 return String(assetId)+"|"+String(orderId);
}
export function normalizeReviewDecisions(raw) {
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return {};
 const out={},validSides=new Set(["não informado","direito","esquerdo","ambos"]);
 let count=0;
 for(const [id,v] of Object.entries(raw)){
  if(++count>100000)throw new Error("Arquivo de revisões excede limite de decisões.");
  if(typeof id!=="string"||!id.includes("|")||id.length>250||!v||typeof v!=="object"||Array.isArray(v))continue;
  const d={};
  if(typeof v.selected==="boolean")d.selected=v.selected;
  if(typeof v.side==="string"&&validSides.has(v.side))d.side=v.side;
  if(typeof v.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v.date))d.date=v.date;
  if(typeof v.note==="string")d.note=v.note.slice(0,1000);
  if(Object.keys(d).length)out[id]=d;
 }
 return out;
}
export function exportReviewFile(reviews) {
 return {format:"sap-rodante-reviews",version:1,
  exportedAt:new Date().toISOString(),reviews:normalizeReviewDecisions(reviews)};
}
export function importReviewFile(file) {
 if(!file||file.format!=="sap-rodante-reviews"||file.version!==1)
  throw new Error("Arquivo de decisões incompatível.");
 return normalizeReviewDecisions(file.reviews);
}
function isoToDay(value) {
 const v=toText(value),m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(!m)return null;
 const ts=Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]));
 const d=new Date(ts);
 return d.toISOString().slice(0,10)===v?ts/86400000:null;
}
/** Recalcula indicadores SEM depender da classificação rígida.
 * A revisão do analista substitui só a aceitação, data e lado informados,
 * conservando classificações e evidências originais para comparação.
 */
export function recalculateReviewedDashboard(data,reviews={}) {
 const decisions=normalizeReviewDecisions(reviews);
 const result={...data,machines:(data.machines||[]).map(m=>{
  const orders=(m.orders||[]).map(o=>{
    const id=reviewOrderKey(m.id,o.order),manual=decisions[id]||{};
    const selected=typeof manual.selected==="boolean"?manual.selected:Boolean(o.isChange);
    const side=manual.side||o.side||"não informado";
    const date=manual.date||o.dateReference||o.faultEnd||o.dateBase||o.entry||"";
    return {...o,reviewKey:id,selected,side,date,
      reviewNote:manual.note||"",reviewStatus:typeof manual.selected==="boolean"?"Decisão manual":"Sugestão automática"};
  });
  const chosen=orders.filter(x=>x.selected);
  const timeline={direito:[],esquerdo:[]};
  const seen=new Set();
  for(const o of chosen) {
    if(seen.has(o.order))continue;
    seen.add(o.order);
    const day=isoToDay(o.date);
    if(day===null)continue;
    const sides=o.side==="ambos"?["direito","esquerdo"]:[o.side];
    for(const side of sides)if(timeline[side])timeline[side].push({day,order:o.order});
  }
  let intervalCount=0;
  const periods=[];
  for(const side of ["direito","esquerdo"]){
    const sorted=timeline[side].sort((a,b)=>a.day-b.day||a.order.localeCompare(b.order));
    for(let i=1;i<sorted.length;i++){
      const span=sorted[i].day-sorted[i-1].day;
      if(span>0){periods.push(span);intervalCount++;}
    }
  }
  const startDay=isoToDay(m.operationalStart);
  const allDated=chosen.map(x=>isoToDay(x.date)).filter(x=>x!==null);
  const firstDay=allDated.length?Math.min(...allDated):null;
  const firstAge=startDay!==null&&firstDay!==null&&firstDay>=startDay?firstDay-startDay:null;
  const computedDays=periods.length?median(periods):firstAge;
  const kind=periods.length?"Mediana entre trocas revisadas (por lado)":
    firstAge!==null?"Tempo desde "+(m.operationalSource?.startsWith("Aquisição")?"aquisição":"início em serviço")+
      " até 1ª OS de troca revisada":"Sem ciclo estimável";
  const manualCount=orders.filter(x=>x.reviewStatus==="Decisão manual").length;
  const totalCost=chosen.reduce((sum,x)=>sum+(Number(x.costReal)||0),0);
  return {...m,orders,days:computedDays,daysKind:kind,
   changeOrders:chosen.length,intervalCount,firstCount:firstAge!==null?1:0,
   trackedSides:timeline.direito.length+timeline.esquerdo.length,
   reviewedOrders:manualCount,reviewedCostTotal:totalCost,
   firstDate:firstDay===null?"":new Date(firstDay*86400000).toISOString().slice(0,10),
   noChangeMessage:chosen.length?"":"Nenhuma OS marcada como troca nesta revisão."};
 })};
 return result;
}

export const DASHBOARD_STYLE=[
".report-app{font-family:Segoe UI,Arial,sans-serif;color:#173042;font-size:14px;line-height:1.52}",
".report-app *{box-sizing:border-box}.report-app .report-grid{display:grid;gap:16px}",
".report-app .report-machine{background:#fff;border:1px solid #d8e3e7;border-radius:15px;overflow:hidden;box-shadow:0 7px 26px #143f4e0d}",
".report-app .report-machine-header{padding:18px 20px;background:linear-gradient(110deg,#073d51,#005471);color:white;display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap;border-bottom:3px solid #c3942c}",
".report-app .report-tag{font-weight:850;font-size:24px;letter-spacing:.03em;color:#f3d181}",
".report-app .report-type{font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:#bcd9e3}",
".report-app .report-name{font-size:15px;font-weight:700;margin:4px 0}",
".report-app .report-sub{font-size:12px;color:#e1ecf0}",
".report-app .report-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:16px 18px 12px}",
".report-app .report-kpi{padding:15px;background:#f4f8fa;border:1px solid #dbe5e9;border-radius:12px}",
".report-app .report-kpi .value{font-size:26px;font-weight:850;color:#005471;line-height:1.12}",
".report-app .report-kpi .label{color:#57717f;font-size:12px;margin-top:5px}",
".report-app .report-note{padding:0 18px 12px;color:#607783;font-size:12px}",
".report-app .report-section-head{padding:11px 18px;font-weight:800;background:#f5f8f9;border-top:1px solid #e2eaed;color:#254d60}",
".report-app .report-table-scroller{overflow:auto;max-width:100%}",
".report-app table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap;font-size:12px}",
".report-app th{font-weight:800;background:#e9f0f3;color:#2e4d5c;padding:10px 11px}",
".report-app td{padding:10px 11px;border-top:1px solid #e3eaee;vertical-align:top}",
".report-app td.description{min-width:190px;max-width:410px;white-space:normal}",
".report-app tr:hover td{background:#f7fafb}",
".report-app .report-pill{font-size:11px;display:inline-block;padding:3px 9px;border-radius:99px;background:#eaf5ed;color:#166949;font-weight:800}",
".report-app .report-pill.review{background:#fff1dd;color:#8d6322}",
".report-app .report-evidence{display:block;white-space:normal;color:#56717e;font-size:11px;margin-top:5px;min-width:180px;max-width:310px}",
".report-app .report-edit{min-width:190px;display:grid;gap:5px;font-size:11px;color:#526875}",
".report-app .report-edit label{display:flex;align-items:center;gap:6px;white-space:normal}",
".report-app .report-edit select,.report-app .report-edit input[type=date],.report-app .report-edit input[type=text]{border:1px solid #cadce4;border-radius:5px;padding:5px;font:inherit;max-width:215px}",
".report-app .report-edit .report-change-check{width:16px;height:16px;accent-color:#005471}",
".report-app .report-tr-change td{background:#f1faf6}",
".report-app details summary{cursor:pointer;color:#005471;font-weight:750;white-space:nowrap;list-style:none}",
".report-app details summary::before{content:'▸ ';color:#c3942c}.report-app details[open] summary::before{content:'▾ '}",
".report-app .report-materials{margin-top:10px;max-width:540px;border:1px solid #d8e5e9;border-radius:8px;overflow:auto;max-height:240px}",
".report-app .report-materials table{font-size:11px}.report-app .report-materials td,.report-app .report-materials th{padding:7px}",
".report-app .report-materials p{padding:9px;white-space:normal;color:#6a7d85;margin:0}",
".report-app .report-footer{padding:13px 18px;color:#536b75;font-size:12px;background:#f7fafb}",
".report-app .report-empty{padding:14px 18px;color:#667f8b}",
".report-app:not(.report-show-other) tr.report-other{display:none}",
".report-app .report-nochange{padding:6px 18px 16px;color:#976e2e;font-size:12px}",
"@media(max-width:700px){.report-app .report-kpis{grid-template-columns:1fr 1fr}.report-app .report-machine-header{padding:15px}.report-app .report-tag{font-size:20px}.report-app .report-kpi .value{font-size:22px}}",
"@media print{.report-app .report-machine{break-inside:avoid;box-shadow:none;margin-bottom:10px}.report-app details:not([open]) .report-materials{display:none}}"
].join("");

export function renderDashboardCards(data,{includeOther=false,editable=true}={}){
 if(!data||!Array.isArray(data.machines))throw new Error("Dados do dashboard inválidos.");
 const visible=data.machines.filter(m=>m.selected!==false);
 const head='<div class="report-app'+(includeOther?' report-show-other':'')+'"><div class="report-grid">';
 const html=visible.map(m=>{
  const start=m.operationalStart?dateBR(m.operationalStart):"Não disponível";
  const source=m.operationalStart?m.operationalSource:"Sem data de entrada em serviço ou aquisição";
  const body=m.orders.map(o=>{
   const checked=o.selected??o.isChange;
   const rows=o.materials||[];
   const materialContent=rows.length?
    '<table><thead><tr><th>Reserva</th><th>Material</th><th>Descrição</th><th>Qtd.</th><th>UM</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+escapeHtml(r.reservation)+'</td><td>'+escapeHtml(r.material)+'</td><td>'+escapeHtml(r.description)+'</td><td>'+escapeHtml(r.qty)+'</td><td>'+escapeHtml(r.unit)+'</td></tr>').join('')+
    '</tbody></table>':
    '<p>Não há itens de reserva nesta exportação. Isso não demonstra ausência de material aplicado.</p>';
   const choice=editable?'<div class="report-edit"><label><input class="report-change-check" data-review-select type="checkbox"'+(checked?' checked':'')+'> Conta como troca</label>'+
    '<label>Lado <select data-review-side>'+["não informado","direito","esquerdo","ambos"].map(v=>'<option value="'+v+'"'+((o.side||"não informado")===v?' selected':'')+'>'+escapeHtml(v)+'</option>').join("")+'</select></label>'+
    '<label>Data do evento <input data-review-date type="date" value="'+escapeHtml(o.date||o.dateReference||"")+'"></label>'+
    '<label>Justificativa <input data-review-note type="text" maxlength="1000" value="'+escapeHtml(o.reviewNote||"")+'" placeholder="Evidência observada"></label></div>':"";
   return '<tr data-order="'+escapeHtml(o.order)+'" class="'+(checked?'report-change report-tr-change':'report-other')+'"><td><strong>'+escapeHtml(o.order)+'</strong></td>'+
    '<td class="description">'+escapeHtml(o.description)+'</td>'+
    '<td>'+dateBR(o.dateBase)+'</td><td>'+dateBR(o.faultEnd)+'</td><td>'+dateBR(o.entry)+'</td>'+
    '<td>'+money(o.costReal)+'</td>'+
    '<td><span class="report-pill'+(checked?'':' review')+'">'+(checked?'Conta como troca':'Não conta como troca')+'</span>'+
     '<small class="report-evidence">'+escapeHtml(o.materialEvidence||o.evidence)+
     (o.supportingOrders?' · OS associada: '+escapeHtml(o.supportingOrders):'')+
     (o.isChange&&o.eventDateSource?' · Data: '+escapeHtml(o.eventDateSource):'')+
     ' · '+escapeHtml(o.reviewStatus||'Sugestão automática')+'</small></td>'+
    '<td>'+choice+'</td><td><details><summary>Materiais ('+o.materialCount+')</summary><div class="report-materials">'+materialContent+'</div></details></td></tr>';
  }).join('');
  const table='<div class="report-table-scroller"><table><thead><tr><th>Ordem SAP</th><th>Descrição da OS</th><th>Data-base</th><th>Fim da avaria</th><th>Entrada</th><th>Custo total da OS*</th><th>Classificação</th><th>Revisão do analista</th><th>Detalhes</th></tr></thead><tbody>'+body+'</tbody></table></div>';
  return '<section class="report-machine" data-asset="'+escapeHtml(m.id)+'" data-search="'+escapeHtml([m.tag,m.family,m.model,m.asset,m.equipment].join(' ').toLowerCase())+'">'+
   '<header class="report-machine-header"><div><div class="report-type">'+escapeHtml(m.family)+' · '+escapeHtml(m.model)+'</div>'+
   '<div class="report-tag">'+escapeHtml(m.tag||m.equipment||m.asset)+'</div>'+
   '<div class="report-name">'+escapeHtml(m.asset)+'</div></div>'+
   '<div class="report-sub">Início de operação aproximado: <strong>'+escapeHtml(start)+'</strong><div>'+escapeHtml(source)+'</div></div></header>'+
   '<div class="report-kpis"><div class="report-kpi"><div class="value">'+(m.days==null?'—':days(m.days)+' dias')+'</div><div class="label">'+escapeHtml(m.daysKind)+'</div></div>'+
   '<div class="report-kpi"><div class="value">'+m.changeOrders+'</div><div class="label">Ordens marcadas como troca ('+m.trackedSides+' eventos por lado identificado)</div></div></div>'+
   '<div class="report-note">Equipamento SAP: '+escapeHtml(m.equipment||'não localizado')+' · '+m.intervalCount+' intervalo(s) entre trocas consecutivas'+
   (m.firstCount?' · '+m.firstCount+' primeira(s) troca(s) estimada(s)':'')+'</div>'+
   (m.noChangeMessage?'<div class="report-nochange">'+escapeHtml(m.noChangeMessage)+'</div>':'')+
   '<div class="report-section-head">Histórico de ordens e custos</div>'+
   (m.orders.length?table:'<div class="report-empty">Sem ordens associadas na base analisada.</div>')+
   '<footer class="report-footer">*Custo total registrado na ordem, não necessariamente custo exclusivo do material rodante. Material MB24 é reserva, não comprovação de consumo.</footer></section>';
 }).join('');
 return head+html+'</div></div>';
}


/* Executada exclusivamente no HTML privado exportado; não persiste dados no navegador. */
function offlineReviewRuntime(){
 "use strict";
 const initial=JSON.parse(document.getElementById("report-data").textContent);
 let decisions=importReviewFile(JSON.parse(document.getElementById("review-data").textContent));
 const report=document.getElementById("report");
 const search=document.getElementById("find");
 const other=document.getElementById("other");
 const counter=document.getElementById("decision-count");
 function download(name,content,type){
  const blob=new Blob([content],{type:type||"application/octet-stream"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2500);
 }
 function filter(){
  const q=search.value.toLowerCase().trim();
  report.querySelectorAll(".report-machine").forEach(el=>{
   el.style.display=!q||el.dataset.search.includes(q)?"":"none";
  });
 }
 function redraw(){
  const data=recalculateReviewedDashboard(initial,decisions);
  report.innerHTML=renderDashboardCards(data,{includeOther:other.checked,editable:true});
  filter();
  const edits=Object.values(decisions).filter(x=>typeof x.selected==="boolean").length;
  const selected=data.machines.filter(x=>x.selected!==false).reduce((n,m)=>n+m.changeOrders,0);
  counter.textContent=edits+" decisões manuais · "+selected+" OS marcadas como troca";
 }
 report.addEventListener("change",event=>{
  const element=event.target;
  const field=element.matches("[data-review-select]")?"selected":
    element.matches("[data-review-side]")?"side":
    element.matches("[data-review-date]")?"date":
    element.matches("[data-review-note]")?"note":"";
  if(!field)return;
  const card=element.closest(".report-machine");
  const row=element.closest("tr[data-order]");
  if(!card||!row)return;
  const id=reviewOrderKey(card.dataset.asset,row.dataset.order);
  const current={...(decisions[id]||{})};
  current[field]=field==="selected"?element.checked:element.value;
  decisions[id]=current;
  redraw();
 });
 search.addEventListener("input",filter);
 other.addEventListener("change",redraw);
 document.getElementById("print").addEventListener("click",()=>window.print());
 document.getElementById("save-decisions").addEventListener("click",()=>{
  download("revisao_ordens_rodante.json",JSON.stringify(exportReviewFile(decisions),null,2),"application/json");
 });
 document.getElementById("load-decisions").addEventListener("click",()=>{
  document.getElementById("review-file").click();
 });
 document.getElementById("review-file").addEventListener("change",async event=>{
  const file=event.target.files[0];if(!file)return;
  try{decisions={...decisions,...importReviewFile(JSON.parse(await file.text()))};redraw();}
  catch(e){alert("Arquivo de revisão inválido: "+e.message);}
  event.target.value="";
 });
 document.getElementById("save-reviewed").addEventListener("click",()=>{
  const html=generateStandaloneDashboard(initial,{includeOther:other.checked,reviews:decisions});
  download("dashboard_rodante_revisado.html",html,"text/html;charset=utf-8");
 });
 redraw();
}

/* Gera documento privado inteiramente funcional sem bibliotecas externas. */
export function generateStandaloneDashboard(data,{includeOther=true,reviews={}}={}){
 const choices=normalizeReviewDecisions(reviews);
 const reviewed=recalculateReviewedDashboard(data,choices);
 const safeJSON=value=>JSON.stringify(value).replace(/</g,"\\u003c")
   .replace(/>/g,"\\u003e").replace(/&/g,"\\u0026")
   .replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
 const title=escapeHtml(data.title||"Ciclo de Vida — Material Rodante");
 const helperSource=[
  "const toText="+toText.toString()+";",
  "const escapeHtml="+escapeHtml.toString()+";",
  "const dateBR="+dateBR.toString()+";",
  "const money="+money.toString()+";",
  "const days="+days.toString()+";",
  "const median="+median.toString()+";",
  "const DASHBOARD_STYLE="+JSON.stringify(DASHBOARD_STYLE)+";",
  reviewOrderKey.toString(),normalizeReviewDecisions.toString(),
  exportReviewFile.toString(),importReviewFile.toString(),isoToDay.toString(),
  recalculateReviewedDashboard.toString(),renderDashboardCards.toString(),
  generateStandaloneDashboard.toString(),offlineReviewRuntime.toString(),
  "offlineReviewRuntime();"
 ].join("\n");
 const safeHelpers=helperSource.replace(/<\/script/gi,"<\\/script");
 const css="body{margin:0;background:#eff4f6;font:14px Segoe UI,Arial,sans-serif;color:#173042}"+
 ".shell{max-width:1550px;margin:auto;padding:22px}"+
 ".mast{background:#073d51;color:#fff;padding:26px 24px;border-bottom:5px solid #c3942c}"+
 ".mast-inner{max-width:1550px;margin:auto}"+
 ".mast h1{font-size:clamp(23px,3vw,32px);margin:4px 0 10px}"+
 ".mast p{color:#c7dce3;margin:0}"+
 ".controls{background:#fff;border:1px solid #d6e0e5;padding:14px;border-radius:14px;margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}"+
 ".controls input[type=text]{padding:11px;border:1px solid #cbd9de;border-radius:8px;min-width:180px;flex:1}"+
 ".controls button{background:#005471;border:0;border-radius:8px;color:#fff;padding:10px 14px;cursor:pointer;font-weight:750}"+
 ".controls button.alt{background:#e4edf0;color:#214b5c}"+
 ".disclaimer{color:#627784;font-size:12px;margin:10px 0 20px}"+
 DASHBOARD_STYLE+
 "@media print{.mast{background:white!important;color:black!important}.mast p{color:black}.controls{display:none!important}.shell{padding:0}.report-app .report-edit{display:none!important}.report-app .report-machine{break-inside:avoid}body{background:white}}";
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="referrer" content="no-referrer"><title>'+title+'</title><style>'+css+'</style></head><body>'+
 '<header class="mast"><div class="mast-inner"><small>ENGENHARIA DE MANUTENÇÃO · REVISÃO TÉCNICA</small>'+
 '<h1>'+title+'</h1><p>Relatório revisável offline · '+reviewed.machines.filter(m=>m.selected!==false).length+
 ' equipamentos selecionados</p></div></header>'+
 '<main class="shell"><div class="controls">'+
 '<input type="text" id="find" placeholder="Buscar equipamento, TAG ou modelo">'+
 '<label><input type="checkbox" id="other"'+(includeOther?' checked':'')+'> Mostrar todas as OS</label>'+
 '<button id="save-decisions">Exportar decisões JSON</button>'+
 '<button id="load-decisions" class="alt">Importar decisões</button>'+
 '<input id="review-file" type="file" accept=".json" style="display:none">'+
 '<button id="save-reviewed">Exportar HTML revisado</button>'+
 '<button id="print" class="alt">Imprimir / PDF</button>'+
 '<small id="decision-count" aria-live="polite"></small></div>'+
 '<p class="disclaimer">'+escapeHtml(data.disclaimer)+
 ' A revisão altera os KPIs locais e não modifica registros SAP. Salve HTML ou JSON antes de fechar.</p>'+
 '<div id="report">'+renderDashboardCards(reviewed,{includeOther,editable:true})+'</div></main>'+
 '<script id="report-data" type="application/json">'+safeJSON(data)+'</script>'+
 '<script id="review-data" type="application/json">'+safeJSON(exportReviewFile(choices))+'</script>'+
 '<script>'+safeHelpers+'</script></body></html>';
}

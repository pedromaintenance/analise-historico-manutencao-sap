/* Motor genérico de análise SAP PM.
 * Não contém cadastros, valores de operação, nomes ou identificadores reais.
 * Todas as funções são puras: as exportações ficam em memória no navegador.
 */
export const VERSION = "0.1.0";
export const ROLES = ["equipment", "locations", "orders", "notes", "reservations"];

export function text(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
export function key(value) {
  return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
const fields = {
  id: ["Ordem", "Nº ordem", "Numero da ordem", "Nº de ordem"],
  note: ["Nota", "Notificação", "Notificacao"],
  equipment: ["Equipamento", "Equipamento SAP", "Número equipamento"],
  fl: ["Local de instalação", "Local instalacao", "Local funcional", "Local de instalacao"],
  object: ["Denominação do objeto técnico", "Descrição do objeto técnico", "Denominação", "Descricao do objeto tecnico"],
  flLabel: ["Denominação do loc.instalação", "Denominação do local", "Denominacao do loc instalacao"],
  description: ["Texto breve", "Descrição", "Descricao", "Texto breve da ordem"],
  sys: ["Status do sistema", "Status SAP"],
  usr: ["Status usuário", "Status do usuário", "Status usuario"],
  priority: ["Prioridade"],
  priorityText: ["Texto prioridade"],
  activity: ["Tipo atividad.manut.", "Tipo da atividade de manutenção", "Tipo de atividade de manutenção"],
  createdBy: ["Criado por"],
  notifier: ["Notificador", "Técnico", "Tecnico"],
  orderType: ["Tipo de ordem"], noteType: ["Tipo de nota"],
  plannedDate: ["Data-base do início", "Data base do inicio", "Início programado"],
  actualStart: ["Dta.início real", "Data de início real", "Inicio real da ordem"],
  actualEnd: ["Data fim real da ordem", "Data fim real", "Fim real"],
  closedDate: ["Data de conclusão", "Data de conclusao"],
  createdDate: ["Data de entrada", "Criado em", "Data da nota"],
  model: ["Denominação do tipo", "Modelo"],
  manufacturer: ["Fabricante do imobilizado", "Fabricante"],
  inventory: ["Nº inventário", "TAG conciliado", "TAG descrição"],
  sortKey: ["Campo de ordenação", "TAG / Campo ordenação", "TAG conciliado"],
  reservation: ["Nº reserva", "Número reserva"],
  material: ["Material"],
  materialText: ["Texto breve material", "Descrição material"],
  qty: ["Qtd.necessária", "Quantidade necessária"],
  qtyPosted: ["Qtd.  UM registro", "Qtd UM registro"],
  qtyDiff: ["Quantidade diferença"],
  finalFlag: ["Com registro final"],
  deletedFlag: ["Item foi eliminado"],
  needDate: ["Data da necessidade"],
  workCenter: ["CenTrabalho princ.", "Centro de trabalho"],
  planner: ["Grupo planej."], costCenter: ["Centro custo"],
  damage: ["Texto descritivo", "Conjunto"],
  code: ["Grupo de códigos", "Code codificação"],
  typeObject: ["Tipo de objeto"], category: ["Ctg.loc.instalação", "Ctg.equipamento"]
};
const aliases = Object.fromEntries(Object.entries(fields).map(([k,v]) => [k, v.map(key)]));
function lookup(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) out[key(k)] = text(v);
  return out;
}
function pick(row, field) {
  for (const a of aliases[field] || []) if (Object.prototype.hasOwnProperty.call(row,a) && row[a] !== "") return row[a];
  return "";
}
export function detectRole(headers) {
  const h = new Set(headers.map(key));
  const has = (s) => h.has(key(s));
  if (has("Nº reserva") && has("Material")) return "reservations";
  if (has("Tipo de ordem") && has("Ordem")) return "orders";
  if (has("Tipo de nota") && has("Nota")) return "notes";
  if ((has("Equipamento") || has("Equipamento SAP")) && (has("Denominação do objeto técnico") || has("Descrição do objeto técnico")) && (has("Fabricante do imobilizado") || has("Nº inventário") || has("Status SAP"))) return "equipment";
  if (has("Local de instalação") && (has("Tipo de objeto") || has("Ctg.loc.instalação") || has("Categoria do local"))) return "locations";
  if (has("Ordem") && has("Texto breve")) return "orders";
  if (has("Nota") && has("Notificador")) return "notes";
  if ((has("Equipamento") || has("Equipamento SAP")) && (has("Denominação do objeto técnico") || has("Descrição do objeto técnico"))) return "equipment";
  if (has("Local de instalação") && (has("Denominação do loc.instalação") || has("Denominação do local"))) return "locations";
  return null;
}
export function normalizeRows(role, rows) {
  if (!ROLES.includes(role)) throw new Error("Tipo de fonte desconhecido: " + role);
  return rows.map((source, i) => {
    const m = lookup(source);
    const common = {
      sourceIndex: i + 2, role, raw: source,
      equipment: pick(m,"equipment"), fl: pick(m,"fl"),
      object: pick(m,"object"), flLabel: pick(m,"flLabel"),
      sys: pick(m,"sys"), usr: pick(m,"usr"),
      createdBy: pick(m,"createdBy"), activity: pick(m,"activity"),
      priority: pick(m,"priority"), priorityText: pick(m,"priorityText"),
      workCenter: pick(m,"workCenter"), planner: pick(m,"planner"),
      costCenter: pick(m,"costCenter"), createdDate: pick(m,"createdDate")
    };
    if (role === "orders") return {...common,
      id: pick(m,"id"), note: pick(m,"note"), description: pick(m,"description"),
      type: pick(m,"orderType"), plannedDate: pick(m,"plannedDate"),
      actualStart: pick(m,"actualStart"), actualEnd: pick(m,"actualEnd"),
      closedDate: pick(m,"closedDate"), materialText: pick(m,"materialText") };
    if (role === "notes") return {...common,
      id: pick(m,"note"), order: pick(m,"id"), description: pick(m,"description"),
      type: pick(m,"noteType"), notifier: pick(m,"notifier"),
      damage: pick(m,"damage"), code: pick(m,"code") };
    if (role === "equipment") return {...common,
      id: pick(m,"equipment"), model: pick(m,"model"),
      manufacturer: pick(m,"manufacturer"), inventory: pick(m,"inventory"),
      category: pick(m,"category") };
    if (role === "locations") return {...common,
      id: pick(m,"fl"), type: pick(m,"typeObject"), category: pick(m,"category"),sortKey:pick(m,"sortKey") };
    return {...common, id: pick(m,"reservation"), order: pick(m,"id"),
      material: pick(m,"material"), description: pick(m,"materialText"),
      qty: pick(m,"qty"), qtyPosted: pick(m,"qtyPosted"), qtyDiff: pick(m,"qtyDiff"),
      finalFlag: pick(m,"finalFlag"), deletedFlag: pick(m,"deletedFlag"),
      needDate: pick(m,"needDate")};
  });
}
export function asDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate()));
  const s = text(value); if (!s || s === "0") return null;
  if (/^\d{5}(?:\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n < 20000 || n > 100000) return null;
    return new Date(Date.UTC(1899,11,30) + Math.floor(n)*86400000);
  }
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return checkedDate(+m[1],+m[2],+m[3]);
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return checkedDate(+m[3],+m[2],+m[1]);
  return null;
}
function checkedDate(y,m,d) {
  const v = new Date(Date.UTC(y,m-1,d));
  return v.getUTCFullYear()===y && v.getUTCMonth()===m-1 && v.getUTCDate()===d?v:null;
}
export function isoDate(v) { const d=asDate(v); return d?d.toISOString().slice(0,10):""; }
export function machineTag(desc) {
  const m = text(desc).match(/\b\d{3}[- ]\d{3}\b/);
  return m ? m[0].replace(" ","-") : "";
}
export function createModel(bases) {
  const norm = {};
  for (const role of ROLES) norm[role] = normalizeRows(role,bases[role] || []);
  const byEquip = new Map(), byFL = new Map(), byTag = new Map(), materials = new Map();
  const counts = {};
  for (const role of ROLES) counts[role] = norm[role].length;
  for (const e of norm.equipment) {
    if (e.id) byEquip.set(e.id,e);
    const tag = machineTag(e.object) || machineTag(e.inventory);
    if (tag) {
      if (!byTag.has(tag)) byTag.set(tag,[]);
      byTag.get(tag).push(e);
    }
  }
  for (const fl of norm.locations) if (fl.id) byFL.set(fl.id,fl);
  for (const item of norm.reservations) {
    if (!item.material) continue;
    if (!materials.has(item.material)) materials.set(item.material,{material:item.material,description:item.description,rows:0,orders:new Set(),qty:0});
    const mat=materials.get(item.material);
    mat.rows++; if(item.order)mat.orders.add(item.order);
    mat.qty+=Number(text(item.qty).replace(",", "."))||0;
    if(!mat.description && item.description) mat.description=item.description;
  }
  const noteByOrder = new Map(), reservesByOrder = new Map();
  for (const n of norm.notes) if (n.order) {
    if(!noteByOrder.has(n.order)) noteByOrder.set(n.order,[]);
    noteByOrder.get(n.order).push(n);
  }
  for (const r of norm.reservations) if (r.order) {
    if(!reservesByOrder.has(r.order)) reservesByOrder.set(r.order,[]);
    reservesByOrder.get(r.order).push(r);
  }
  const byOrder = new Map();
  for (const o of norm.orders) {
    if (!o.id) continue;
    if (!byOrder.has(o.id)) byOrder.set(o.id,{...o,duplicateRows:1});
    else {
      const current=byOrder.get(o.id); current.duplicateRows++;
      for (const name of ["equipment","fl","object","flLabel","sys","usr","description","actualStart","actualEnd","closedDate","plannedDate"])
        if (!current[name] && o[name]) current[name]=o[name];
    }
  }
  const orders=[];
  for (const o of byOrder.values()) {
    const linkedNotes=noteByOrder.get(o.id)||[];
    const linkedMaterials=reservesByOrder.get(o.id)||[];
    const n=linkedNotes[0]||null;
    const eq=o.equipment||(n?.equipment||"");
    const fl=o.fl||(n?.fl||"");
    const identity=resolveAsset(eq,fl,o.object||(n?.object||""),byEquip,byFL,byTag);
    orders.push({...o, equipment:eq, fl, identity, notes:linkedNotes, reserves:linkedMaterials,
      description:o.description||(n?.description||""), notifier:n?.notifier||"",
      materialCount:linkedMaterials.length,
      materialCodes:[...new Set(linkedMaterials.map(r=>r.material).filter(Boolean))],
      noteDescription:n?.description||""});
  }
  const stats=buildDictionaries(norm,byEquip,byFL);
  return {norm, counts, byEquip, byFL, byTag, materials, orders, dictionaries:stats,
    orphans:{notes:norm.notes.filter(n=>!n.order).length,
      reservations:norm.reservations.filter(r=>r.order&&!byOrder.has(r.order)).length}};
}
export function resolveAsset(equipment,fl,desc,byEquip,byFL,byTag) {
  const eq=text(equipment), loc=text(fl);
  if (eq) {
    const e=byEquip.get(eq);
    return {id:"EQ:"+eq,level:"equipment",label:e?.object||desc||eq,
      tag:machineTag(e?.object||desc),method:e?"cadastro de equipamento":"identificador da ordem",confidence:"alta"};
  }
  // Sem codificar a hierarquia de nenhuma empresa. O usuário fornece o
  // vínculo pelo campo de ordenação dos locais técnicos e pelo mestre de equipamentos.
  if (loc) {
    let current=loc,tag="",matchedLocation="";
    while(current) {
      const record=byFL.get(current);
      if(record) {
        const t=machineTag(record.sortKey);
        if(t){tag=t;matchedLocation=current;break;}
      }
      const dash=current.lastIndexOf("-");
      if(dash<0)break;
      current=current.slice(0,dash);
    }
    const matches=tag?(byTag.get(tag)||[]):[];
    if(matches.length===1) {
      return {id:"EQ:"+matches[0].id,level:"equipment",label:matches[0].object,
        tag,method:"campo de ordenação do local técnico + TAG do equipamento",confidence:"média"};
    }
    // Quando existe TAG do local sem equipamento único, não inventar correspondência.
    if(tag) {
      return {id:"FLTAG:"+tag,level:"functional_location",
        label:byFL.get(matchedLocation)?.flLabel||"Local técnico "+tag,tag,
        method:matches.length?"TAG ambígua no mestre de equipamentos":"TAG sem equipamento correspondente",
        confidence:"baixa"};
    }
    return {id:"FL:"+loc,level:"functional_location",
      label:byFL.get(loc)?.flLabel||loc,tag:"",
      method:"local de instalação (sem conciliação)",confidence:"baixa"};
  }
  return {id:"UNRESOLVED",level:"unresolved",label:"Objeto técnico não identificado",
    tag:"",method:"ausente",confidence:"baixa"};
}
const dictionaryFields=[
  ["Equipamento","equipment","object"],["Local de instalação","fl","flLabel"],
  ["Status do sistema","sys"],["Status do usuário","usr"],
  ["Tipo de atividade de manutenção","activity"],["Prioridade","priority","priorityText"],
  ["Criado por","createdBy"],["Técnico / Notificador","notifier"],
  ["Tipo de ordem / nota","type"],["Centro de trabalho","workCenter"],
  ["Grupo planejador","planner"],["Centro de custo","costCenter"],
  ["Modelo","model"],["Fabricante","manufacturer"],["Categoria","category"],["Campo de ordenação","sortKey"],
  ["Código de catálogo","code"],["Material","material","description"]
];
export function buildDictionaries(norm,byEquip,byFL) {
  const index=new Map();
  for(const [role,rows] of Object.entries(norm)) for(const row of rows) {
    for(const [dimension,col,label] of dictionaryFields) {
      let value=text(row[col]); if(!value)continue;
      let title=text(row[label]);
      if(col==="equipment"&&!title)title=byEquip.get(value)?.object||"";
      if(col==="fl"&&!title)title=byFL.get(value)?.flLabel||"";
      const id=dimension+"|"+value;
      if (!index.has(id))index.set(id,{dimension,code:value,description:title,count:0,sources:new Set()});
      const entry=index.get(id);entry.count++;entry.sources.add(role);
      if(!entry.description && title) entry.description=title;
    }
  }
  return [...index.values()].map(x=>({...x,sources:[...x.sources].join(", ")}));
}
const patterns={
  "roletes":/\bROLET(?:E|ES)\b|\bROLLER[S]?\b/,
  "roda guia":/RODA\s+GUIA|\bIDLER\b/,
  "roda motriz / segmento":/RODA\s+MOTRIZ|\bSPROCKET\b|SEGMENTO[S]?\s+(?:DA\s+)?RODA/,
  "sapatas / fixações":/\bSAPATAS?\b|PARAFUSO[S]?\s+(?:DE\s+)?SAPATA/,
  "tensionamento":/\bTENSOR\b|\bESTICADOR\b|AJUSTADOR\s+(?:DE\s+)?ESTEIRA/,
  "pinos e buchas":/\bPINOS?\b|\bBUCHAS?\b|\bELOS?\b/,
  "proteções":/\bPROTE[TÇC][AÃAO]+\b|\bPROTETOR(?:ES)?\b/,
  "esteira completa":/(?:\bESTEIRAS?\b|TRACK\s+(?:CHAIN|GROUP|ASSEMBLY)|CORRENTE\s+(?:DE\s+)?ESTEIRA)/,
  "material rodante geral":/MATERIAL\s+RODANTE|\bRODANTE\b|\bUNDERCARRIAGE\b/
};
const activityPattern=/\b(TROC\w*|SUBST\w*|REPLAC\w*|RENOV\w*)\b/;
const installationPattern=/\b(MONTAGEM|INSTAL\w*|REINSTAL\w*)\b/;
const preventivePattern=/\b(INSPEC\w*|VERIFIC\w*|LUBRIF\w*|AVALI\w*|MEDI\w*|TENSION\w*|AJUST\w*|DIAGNOSTIC\w*)\b/;
export function classifyRodante(order) {
  const main=key([order.description,order.noteDescription].filter(Boolean).join(" "));
  const reserveText=key((order.reserves||[]).map(x=>x.description).join(" "));
  const materialText=key(order.materialText);
  const context=key(order.flLabel);
  // Evidência textual da atividade é diferente de uma reserva de material.
  let component="";
  for (const [name,re] of Object.entries(patterns)) if(re.test(main)) {component=name;break;}
  const narrativeComponent=component;
  if(!component)for (const [name,re] of Object.entries(patterns)) if(re.test(reserveText+" "+materialText)) {component=name;break;}
  const materialOnly=Boolean(component&&!narrativeComponent);
  // Evita associar corrente de avanço da perfuratriz à corrente de esteira.
  if (/CORRENTE\s+DE\s+AVANCO/.test(main) && !/ESTEIR|RODANTE|ROLETE|RODA\s+GUIA|RODA\s+MOTRIZ/.test(main))
    component="";
  const replacement=activityPattern.test(main);
  const installation=installationPattern.test(main) && !replacement;
  const inspection=preventivePattern.test(main) && !replacement && !installation;
  const status=key(order.sys).split(" ");
  const cancelled=status.includes("NEXE") || status.includes("CANC");
  const closed=status.includes("ENTE") || status.includes("ENCE");
  const actual=isoDate(order.actualEnd)||isoDate(order.actualStart);
  const proxy=isoDate(order.plannedDate)||isoDate(order.createdDate);
  let evidence="não classificado";
  if(component && materialOnly)evidence="indício apenas por material reservado";
  else if(component && replacement) {
    if(cancelled)evidence="cancelado / não executado";
    else if(closed && actual)evidence="confirmado por status e data real";
    else if(closed)evidence="provável (sem data real)";
    else evidence="planejado / pendente";
  } else if(component && installation)evidence="montagem / instalação — verificar se houve substituição";
  else if(component && inspection)evidence="inspeção / ajuste";
  else if(component)evidence="menção sem troca identificada";
  const right=/\bL\s*D\b|LADO\s+DIREITO|DIREITA\b/.test(main);
  const left=/\bL\s*E\b|LADO\s+ESQUERDO|ESQUERDA\b/.test(main);
  const both=(left&&right)||/AMBOS\s+OS\s+LADOS|PAR\s+DE\s+ESTEIRAS/.test(main);
  const side=both?"ambos":right?"direito":left?"esquerdo":"não informado";
  return {component,side,replacement,installation,inspection,evidence,dateReal:actual,dateProxy:proxy,materialOnly,
    isCandidate:Boolean(component&&replacement&&!cancelled&&!materialOnly),
    contextOnly:!component&&Boolean(context.match(/ESTEIR|RODANTE/))};
}
const diffDays=(a,b)=>(asDate(b).getTime()-asDate(a).getTime())/86400000;
const mean=v=>v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
const median=v=>{if(!v.length)return null;const t=[...v].sort((a,b)=>a-b);return t.length%2?t[(t.length-1)/2]:(t[t.length/2-1]+t[t.length/2])/2;};
export function analyzeRodante(model,{allowProxy=false,component="esteira completa",assetPrefix=""}={}) {
  const candidates=[];
  for(const order of model.orders){
    const analysis=classifyRodante(order);
    if(!analysis.component || (component!=="todos"&&analysis.component!==component))continue;
    if(assetPrefix && !key(order.identity.label+" "+order.identity.tag).includes(key(assetPrefix)))continue;
    candidates.push({...order,analysis});
  }
  const eligible = candidates.filter(c=>c.analysis.isCandidate);
  const samples=[];
  for (const c of eligible) {
    const a=c.analysis;
    if(a.dateReal&&a.evidence==="confirmado por status e data real") {
      for(const side of a.side==="ambos"?["direito","esquerdo"]:[a.side])
        samples.push({asset:c.identity.id,label:c.identity.label,tag:c.identity.tag,component:a.component,side,
          date:a.dateReal,order:c.id,confidence:"data real",source:c});
    } else if(allowProxy&&a.evidence==="provável (sem data real)"&&a.dateProxy) {
      for(const side of a.side==="ambos"?["direito","esquerdo"]:[a.side])
        samples.push({asset:c.identity.id,label:c.identity.label,tag:c.identity.tag,component:a.component,side,
          date:a.dateProxy,order:c.id,confidence:"data substituta",source:c});
    }
  }
  const groups=new Map();
  for(const s of samples){
    if(s.asset==="UNRESOLVED")continue;
    const k=[s.asset,s.component,s.side].join("|");
    if(!groups.has(k))groups.set(k,[]);
    groups.get(k).push(s);
  }
  const intervals=[]; const audit=[];let clusters=0;
  for(const [group,events] of groups){
    events.sort((a,b)=>a.date.localeCompare(b.date)||a.order.localeCompare(b.order));
    const distinct=[];
    for(const e of events){
      const last=distinct.at(-1);
      if(last&&diffDays(last.date,e.date)<=7){
        last.orders.push(e.order);last.proxies ||= e.confidence==="data substituta";
        clusters++;continue;
      }
      distinct.push({...e,orders:[e.order],proxies:e.confidence==="data substituta"});
    }
    audit.push(...distinct.map(x=>({asset:x.label,tag:x.tag,component:x.component,side:x.side,date:x.date,orders:x.orders.join("; "),origin:x.proxies?"data substituta":"data real"})));
    for(let i=1;i<distinct.length;i++){
      const earlier=distinct[i-1],later=distinct[i];
      const days=diffDays(earlier.date,later.date);
      if(days>0)intervals.push({asset:later.label,tag:later.tag,component:later.component,side:later.side,
        first:earlier.date,last:later.date,days,orders:earlier.orders.join("; ")+" → "+later.orders.join("; "),
        quality:earlier.proxies||later.proxies?"estimativa":"verificado"});
    }
  }
  const byAsset=new Map();
  for(const x of intervals){
    const k=x.asset+"|"+x.component+"|"+x.side;
    if(!byAsset.has(k))byAsset.set(k,[]);
    byAsset.get(k).push(x.days);
  }
  const summary=[...byAsset.entries()].map(([k,days])=>{
    const [asset,component,side]=k.split("|");
    return {asset,component,side,intervals:days.length,meanDays:mean(days),medianDays:median(days),minDays:Math.min(...days),maxDays:Math.max(...days)};
  }).sort((a,b)=>b.intervals-a.intervals);
  const allComponents=new Set(intervals.map(x=>x.component));
  const mixingComponents=allComponents.size>1;
  return {candidates,eligible,intervals,audit,summary,meanDays:mixingComponents?null:mean(intervals.map(x=>x.days)),
    medianDays:mixingComponents?null:median(intervals.map(x=>x.days)),mixingComponents,clustered:clusters,
    dataMode:allowProxy?"inclui datas substitutas":"somente datas reais",
    excluded:eligible.filter(x=>!x.analysis.dateReal && !(allowProxy&&x.analysis.dateProxy)).length};
}
export function enrichRows(model,role) {
  const items=model.norm[role]||[];
  return items.map(r=>{
    const eq=model.byEquip.get(r.equipment);
    const fl=model.byFL.get(r.fl);
    const identity=resolveAsset(r.equipment,r.fl,r.object,model.byEquip,model.byFL,model.byTag);
    return {...r.raw,
      "Enriq. Equipamento":r.equipment,
      "Enriq. Denominação equipamento":eq?.object||r.object||"",
      "Enriq. Local de instalação":r.fl,
      "Enriq. Denominação local":fl?.flLabel||r.flLabel||"",
      "Enriq. Chave do ativo":identity.id,
      "Enriq. Método vínculo":identity.method,
      "Enriq. Confiança vínculo":identity.confidence,
      "Enriq. Status do sistema":r.sys,
      "Enriq. Status do usuário":r.usr,
      "Enriq. Atividade":r.activity,
      "Enriq. Prioridade":r.priorityText||r.priority,
      "Enriq. Criado por":r.createdBy,
      "Enriq. Notificador":r.notifier||""
    };
  });
}
export function exportMaterials(model) {
  return [...model.materials.values()].map(m=>({Material:m.material,Descrição:m.description,
    "Linhas MB24":m.rows,"Ordens distintas":m.orders.size,
    "Quantidade solicitada (heterogênea: verificar UM)":m.qty,
    "Natureza":"Reserva / necessidade — não comprova saída física"}));
}

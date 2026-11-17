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
  plannedEnd: ["Data-base do fim", "Data base do fim"],
  entryDate: ["Data de entrada", "Data entrada"],
  breakdownEnd: ["Fim da avaria", "Fim avaria"],
  breakdownStart: ["Início da avaria", "Inicio da avaria"],
  costReal: ["Custos tot.reais", "Custos totais reais"],
  costPlanned: ["Custos totais plan.", "Custos totais planejados"],
  unit: ["Unid.medida básica","Unidade medida básica","Unidade de medida","UM"],
  actualStart: ["Dta.início real", "Data de início real", "Inicio real da ordem"],
  actualEnd: ["Data fim real da ordem", "Data fim real", "Fim real"],
  closedDate: ["Data de conclusão", "Data de conclusao"],
  createdDate: ["Data de entrada", "Criado em", "Data da nota"],
  model: ["Denominação do tipo", "Modelo"],
  acquisitionDate: ["Data de aquisição", "Data aquisição", "Dt. aquisição"],
  serviceStart: ["Data entrada em serviço","Data de entrada em serviço","Data de comissionamento","Início em serviço","Início de operação","Data de início de operação"],
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
      plannedEnd: pick(m,"plannedEnd"), entryDate:pick(m,"entryDate"),
      costReal:pick(m,"costReal"),costPlanned:pick(m,"costPlanned"),
      actualStart: pick(m,"actualStart"), actualEnd: pick(m,"actualEnd"),
      closedDate: pick(m,"closedDate"), materialText: pick(m,"materialText") };
    if (role === "notes") return {...common,
      id: pick(m,"note"), order: pick(m,"id"), description: pick(m,"description"),
      type: pick(m,"noteType"), notifier: pick(m,"notifier"),
      damage: pick(m,"damage"), code: pick(m,"code"),
      breakdownStart: pick(m,"breakdownStart"),breakdownEnd:pick(m,"breakdownEnd") };
    if (role === "equipment") return {...common,
      id: pick(m,"equipment"), model: pick(m,"model"),
      manufacturer: pick(m,"manufacturer"), inventory: pick(m,"inventory"),
      acquisitionDate:pick(m,"acquisitionDate"),serviceStart:pick(m,"serviceStart"),
      category: pick(m,"category") };
    if (role === "locations") return {...common,
      id: pick(m,"fl"), type: pick(m,"typeObject"), category: pick(m,"category"),sortKey:pick(m,"sortKey") };
    return {...common, id: pick(m,"reservation"), order: pick(m,"id"),
      material: pick(m,"material"), description: pick(m,"materialText"), unit:pick(m,"unit"),
      qty: pick(m,"qty"), qtyPosted: pick(m,"qtyPosted"), qtyDiff: pick(m,"qtyDiff"),
      finalFlag: pick(m,"finalFlag"), deletedFlag: pick(m,"deletedFlag"),
      needDate: pick(m,"needDate")};
  });
}
export function asDate(value) {
  if(value instanceof Date && !isNaN(value.getTime()))
    return new Date(Date.UTC(value.getFullYear(),value.getMonth(),value.getDate()));
  const s=text(value);if(!s||s==="0")return null;
  if(/^\d{5}(?:\.\d+)?$/.test(s)){
    const n=Number(s);if(n<20000||n>100000)return null;
    return new Date(Date.UTC(1899,11,30)+Math.floor(n)*86400000);
  }
  let m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if(m)return checkedDate(+m[1],+m[2],+m[3]);
  m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if(m)return checkedDate(+m[3]<100?2000+Number(m[3]):+m[3],+m[2],+m[1]);
  return null;
}
function checkedDate(y,m,d) {
  const v=new Date(Date.UTC(y,m-1,d));
  return v.getUTCFullYear()===y&&v.getUTCMonth()===m-1&&v.getUTCDate()===d?v:null;
}
export function isoDate(v) {const d=asDate(v);return d?d.toISOString().slice(0,10):"";}
export function parseNumber(v) {
  if(typeof v==="number")return Number.isFinite(v)?v:0;
  const s=text(v).replace(/\s/g,"");if(!s)return 0;
  if(s.includes(",")&&s.includes("."))return Number(s.lastIndexOf(",")>s.lastIndexOf(".")?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,""))||0;
  if(s.includes(","))return Number(s.replace(",","."))||0;
  return Number(s)||0;
}
export function chronology(order) {
  const dateBase=isoDate(order.plannedDate);
  const faultEnd=isoDate(order.breakdownEnd)||
    (order.notes||[]).map(n=>isoDate(n.breakdownEnd)).find(Boolean)||"";
  const entry=isoDate(order.entryDate)||isoDate(order.createdDate)||isoDate(order.noteDate)||"";
  const actual=isoDate(order.actualEnd)||isoDate(order.actualStart)||"";
  const reference=dateBase||faultEnd||entry||"";
  const source=dateBase?"Data-base do início":faultEnd?"Fim da avaria":entry?"Data de Entrada":"sem data";
  return {dateBase,faultEnd,entry,actual,reference,source,hasTimeline:Boolean(reference)};
}
export function machineTag(desc) {
  const name=text(desc);
  // A TAG 021-004 tem prioridade sobre o modelo "395" imediatamente anterior.
  const exact=[...name.matchAll(/\b\d{3}-\d{3}\b/g)].at(-1);
  if(exact)return exact[0];
  const spaced=[...name.matchAll(/\b\d{3}\s+\d{3}\b/g)].at(-1);
  return spaced?spaced[0].replace(/\s+/g,"-"):"";
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
    // Material sem código SAP também representa demanda; respeitar unidade de medida.
    const materialKey=item.material?"COD:"+item.material+"|"+item.unit:
      "SEM_COD:"+key(item.description||"SEM DESCRICAO")+"|"+item.unit;
    if(!materials.has(materialKey))materials.set(materialKey,{
      material:item.material,description:item.description,unit:item.unit,
      uncoded:!item.material,rows:0,orders:new Set(),qty:0
    });
    const mat=materials.get(materialKey);
    mat.rows++;if(item.order)mat.orders.add(item.order);
    mat.qty+=parseNumber(item.qty);
    if(!mat.description && item.description)mat.description=item.description;
  }
  const noteByOrder = new Map(), notesById=new Map(), reservesByOrder = new Map();
  for(const n of norm.notes)if(n.id)notesById.set(n.id,n);
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
      for (const name of ["equipment","fl","object","flLabel","sys","usr","description","actualStart","actualEnd","closedDate","plannedDate","plannedEnd","entryDate","costReal","costPlanned"])
        if (!current[name] && o[name]) current[name]=o[name];
    }
  }
  const orders=[];
  for (const o of byOrder.values()) {
    const linkedNotes=noteByOrder.get(o.id)||[];
    // Algumas exportações IW29 não trazem Ordem preenchida.
    // Conciliar pelo número da Nota informada na IW39, sem duplicar.
    if(o.note){
      const byId=notesById.get(o.note);
      if(byId&&!linkedNotes.some(n=>n.id===byId.id))linkedNotes.push(byId);
    }
    const linkedMaterials=reservesByOrder.get(o.id)||[];
    const n=linkedNotes[0]||null;
    const eq=o.equipment||(n?.equipment||"");
    const fl=o.fl||(n?.fl||"");
    const identity=resolveAsset(eq,fl,o.object||(n?.object||""),byEquip,byFL,byTag);
    orders.push({...o, equipment:eq, fl, identity, notes:linkedNotes, reserves:linkedMaterials,
      description:o.description||(n?.description||""), notifier:n?.notifier||"",
      materialCount:linkedMaterials.length,
      materialCodes:[...new Set(linkedMaterials.map(r=>r.material).filter(Boolean))],
      noteDescription:n?.description||"",
      breakdownEnd:n?.breakdownEnd||"",breakdownStart:n?.breakdownStart||"",
      noteDate:n?.createdDate||""});
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
  ["Modelo","model"],["Fabricante","manufacturer"],["Categoria","category"],
  ["Data de aquisição","acquisitionDate"],["Entrada em serviço","serviceStart"],["Campo de ordenação","sortKey"],
  ["Código de catálogo","code"],["Material","material","description"],
  ["Unidade de medida","unit"]
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
  "roletes":/\bROLET(?:E|ES)\b|\bROLLERS?\b/,
  "roda guia":/RODAS?\s+GUIAS?|\bIDLER\b/,
  "roda motriz / segmento":/RODA\s+MOTRIZ|\bSPROCKET\b|SEGMENTO[S]?\s+(?:DA\s+)?RODA/,
  "sapatas / fixações":/\bSAPATAS?\b|\bPARAFUSOS?\s+(?:DE\s+)?SAPATA|\bPORCAS?\s+(?:DE\s+)?SAPATA/,
  "tensionamento":/\bTENSOR\b|\bESTICADOR\b|\bTENSION\w*\b|\bTENCION\w*\b|\bESTIC\w*\b/,
  "módulos":/\bMODULOS?\b/,
  "pinos e buchas":/\bPINOS?\b|\bBUCHAS?\b|\bELOS?\b/,
  "proteções":/\bPROTETOR(?:ES)?\b|\bPROTECOES?\b/,
  "esteira completa":/\bESTEIRAS?\b|\bESTIRAS?\b|TRACK\s+(?:CHAIN|GROUP|ASSEMBLY)|CORRENTE\s+(?:DE|DA)\s+ESTEIRA/,
  "material rodante geral":/MATERIAL\s+RODANTE|\bRODANTE\b|\bUNDERCARRIAGE\b/
};
const activityPattern=/\b(TROC\w*|SUBST\w*|REPLAC\w*|RENOV\w*)\b/;
const installationPattern=/\b(MONTAGEM|INSTAL\w*|REINSTAL\w*)\b/;
const preventivePattern=/\b(INSPEC\w*|VERIFIC\w*|LUBRIF\w*|AVALI\w*|MEDI\w*|TENSION\w*|AJUST\w*|DIAGNOSTIC\w*)\b/;
export function classifyRodante(order,{completionStatuses=["ENTE","ENCE"],cancellationStatuses=["NEXE","CANC"]}={}) {
  // A descrição da OS prevalece. Texto da notificação é contexto, não prova da intervenção.
  const main=key(order.description||order.noteDescription);
  const reserveText=key((order.reserves||[]).map(x=>x.description).join(" "));
  const timeline=chronology(order);
  let component="";
  for(const [name,re] of Object.entries(patterns))if(re.test(main)){component=name;break;}
  const narrativeComponent=component;
  if(!component)for(const [name,re] of Object.entries(patterns))
    if(re.test(reserveText+" "+key(order.materialText))){component=name;break;}
  const materialOnly=Boolean(component&&!narrativeComponent);
  if(/CORRENTE\s+DE\s+AVANCO/.test(main)&&!/ESTEIR|RODANTE|ROLETE|RODA\s+GUIA|RODA\s+MOTRIZ/.test(main))component="";
  const replacement=activityPattern.test(main);
  const hasFasteners=/\b(PARAFUSOS?|PORCAS?|ARRUELAS?|PRESILHAS?)\b/.test(main);
  const hasPins=/\b(PINOS?|BUCHAS?|ELOS?)\b/.test(main);
  const hasSegments=/\b(SEGMENTOS?|RODA\s+GUIA|ROLE(TES?|RS?))\b/.test(main);
  const hasTension=/\b(TENSOR|VALVULA\s+TENS\w*|TENSION\w*)\b/.test(main);
  const partialOnly=hasFasteners||hasPins||hasSegments||hasTension||/\b(MODULOS?|FPS|SAPATAS?)\b/.test(main);
  const installation=installationPattern.test(main)&&!replacement;
  const adjustment=/\b(AJUST\w*|REPOSIC\w*|RECOLOC\w*|TENSION\w*|TENCION\w*|ESTIC\w*|ALINH\w*)\b|CAIU\s+(?:A\s+)?ESTEIRA|ESTEIRA\s+SAIU/.test(main)&&!replacement;
  const inspection=preventivePattern.test(main)&&!replacement&&!installation&&!adjustment;
  const logistics=/\b(TRANSPORTE|FRETE|ENVIO|COMPRA|AQUISICAO|FORNECIMENTO|MATERIAL\s+PARA|ORCAMENTO|COTACAO)\b/.test(main)&&!replacement;
  const hasTrack=/\bESTEIRAS?\b|\bESTIRAS?\b|TRACK\s+(?:CHAIN|GROUP|ASSEMBLY)|CORRENTE\s+(?:DE|DA)\s+ESTEIRA/.test(main);
  const hasPart=partialOnly||Object.entries(patterns).some(([name,re])=>name!=="esteira completa"&&name!=="material rodante geral"&&re.test(main));
  let operationClass="menção / indeterminado";
  if(logistics)operationClass="materiais / logística";
  else if(materialOnly)operationClass="indício apenas por reserva";
  else if(replacement&&hasTrack&&!hasPart)operationClass="troca de esteira / conjunto";
  else if(replacement&&hasTrack&&hasPart)operationClass="troca parcial / componente";
  else if(replacement)operationClass="troca parcial / componente";
  else if(adjustment)operationClass="ajuste / reposicionamento";
  else if(inspection)operationClass="inspeção / diagnóstico";
  else if(installation)operationClass="montagem / instalação";
  const reservationRows=(order.reserves||[]).filter(x=>
    !["X","TRUE","SIM"].includes(key(x.deletedFlag)));
  const fullMaterial=reservationRows.some(x=>
    /ESTEIRA\s+COMPLETA|^ESTEIRA\s+(?:\d|CAT|D9|D6|GRUPO)|^LAGARTA\s+\w+|GRUPO\s+(?:DE\s+)?ESTEIRA|CONJ(?:UNTO)?\s+(?:DE\s+)?ELOS\s+CORRENTE|TRACK\s+(?:CHAIN|GROUP|ASSEMBLY)|CORRENTE\s+COMPLETA/.test(key(x.description)));
  const reservationHasParts=reservationRows.length>0&&!fullMaterial;
  // Evidência de material reservado serve para triangulação, não prova aplicação.
  const status=key(order.sys).split(" ");
  const cancelled=cancellationStatuses.map(key).some(x=>status.includes(x));
  const closed=completionStatuses.map(key).some(x=>status.includes(x));
  const costReal=parseNumber(order.costReal);
  const costPlanned=parseNumber(order.costPlanned);
  const right=/\bL\s*D\b|LADO\s+(?:DIR|DIREITO)|\bDIREITA\b|\bDIR\b/.test(main);
  const left=/\bL\s*E\b|LADO\s+(?:ESQ|ESQUERDO)|\bESQUERDA\b|\bESQ\b/.test(main);
  const both=(right&&left)||/AMBOS\s+OS\s+LADOS|PAR\s+DE\s+ESTEIRAS|LADOS\s+DIR\s*\/\s*ESQ/.test(main);
  const side=both?"ambos":right?"direito":left?"esquerdo":"não informado";
  const possibleReplacement=(operationClass==="troca de esteira / conjunto"||operationClass==="troca mista / componentes adicionais"||operationClass==="troca parcial / componente");
  const isCandidate=Boolean(component&&possibleReplacement&&!cancelled&&!materialOnly);
  let evidence="menção sem troca identificada";
  if(cancelled)evidence="cancelado / não executado";
  else if(materialOnly)evidence="indício apenas por material reservado";
  else if(inspection||adjustment)evidence="inspeção / ajuste";
  else if(installation)evidence="montagem / instalação — verificar substituição";
  else if(isCandidate&&closed)evidence="troca indicada por texto e status";
  else if(isCandidate&&costReal>0)evidence="troca indicada por texto e custo registrado";
  else if(isCandidate)evidence="troca planejada / sem confirmação";
  else if(logistics)evidence="material / logística — não comprova instalação";
  const eventStrong=Boolean(isCandidate&&closed&&costReal>0&&
    operationClass==="troca de esteira / conjunto"&&
    (!reservationHasParts));
  const evidenceLevel=cancelled?"excluída":
    eventStrong&&fullMaterial?"alta (triangulação)":
    eventStrong?"média (sem MB24 da troca)":
    isCandidate?"revisão necessária":"não elegível";
  return {component,side,replacement,installation,inspection,adjustment,operationClass,
    evidence,evidenceLevel,isCandidate,eventStrong,fullMaterial,reservationHasParts,
    closed,cancelled,costReal,costPlanned,materialOnly,
    ...timeline,dateReal:timeline.actual,dateProxy:timeline.reference,
    contextOnly:!component&&/ESTEIR|RODANTE/.test(key(order.flLabel))};
}
const diffDays=(a,b)=>(asDate(b).getTime()-asDate(a).getTime())/86400000;
const mean=v=>v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
const median=v=>{if(!v.length)return null;const t=[...v].sort((a,b)=>a-b);return t.length%2?t[(t.length-1)/2]:(t[t.length/2-1]+t[t.length/2])/2;};
export function analyzeRodante(model,{
  allowProxy=true,allowWeak=false,component="esteira completa",assetPrefix="",asOf=isoDate(new Date()),
  completionStatuses=["ENTE","ENCE"],cancellationStatuses=["NEXE","CANC"]
}={}) {
  const candidates=[];
  for(const order of model.orders){
    const analysis=classifyRodante(order,{completionStatuses,cancellationStatuses});
    if(!analysis.component||(component!=="todos"&&analysis.component!==component))continue;
    if(assetPrefix&&!key(order.identity.label+" "+order.identity.tag).includes(key(assetPrefix)))continue;
    candidates.push({...order,analysis});
  }
  const eligible=candidates.filter(x=>x.analysis.isCandidate);
  const financialOrders=candidates.map(x=>({
    order:x.id,asset:x.identity.label,component:x.analysis.component,
    operationClass:x.analysis.operationClass,side:x.analysis.side,
    description:x.description,status:x.sys,activity:x.activity,
    evidence:x.analysis.evidence,evidenceLevel:x.analysis.evidenceLevel,
    costReal:x.analysis.costReal,costPlanned:x.analysis.costPlanned,
    reserveLines:x.reserves.length,reservedMaterials:x.reserves.map(r=>r.material).filter(Boolean).join("; "),
    dateBase:x.analysis.dateBase,faultEnd:x.analysis.faultEnd,entry:x.analysis.entry,
    reference:x.analysis.reference,referenceSource:x.analysis.source,
    technician:x.notifier
  }));
  const costGroups=new Map();
  for(const r of financialOrders){
    if(!costGroups.has(r.operationClass))costGroups.set(r.operationClass,[]);
    costGroups.get(r.operationClass).push(r);
  }
  const costByClass=[...costGroups.entries()].map(([name,rows])=>{
    const positive=rows.map(x=>x.costReal).filter(x=>x>0);
    return {operationClass:name,orders:rows.length,
      withRealCost:positive.length,zeroRealCost:rows.length-positive.length,
      totalReal:rows.reduce((a,x)=>a+x.costReal,0),
      totalPlanned:rows.reduce((a,x)=>a+x.costPlanned,0),
      meanPositive:mean(positive),medianPositive:median(positive),
      withReservation:rows.filter(x=>x.reserveLines>0).length,
      reservationLines:rows.reduce((a,x)=>a+x.reserveLines,0)};
  }).sort((a,b)=>b.totalReal-a.totalReal);
  const materialsByOrder=[];
  for(const x of candidates)for(const r of x.reserves){
    materialsByOrder.push({order:x.id,asset:x.identity.label,operationClass:x.analysis.operationClass,
      code:r.material||"SEM CÓDIGO SAP",description:r.description,unit:r.unit,
      required:parseNumber(r.qty),registered:parseNumber(r.qtyPosted),difference:parseNumber(r.qtyDiff),
      deleted:r.deletedFlag,finalFlag:r.finalFlag,reservation:r.id,
      costOrderReal:x.analysis.costReal,
      note:"Reserva não comprova aplicação; custo da ordem não é preço do material"});
  }
  const samples=[];
  for(const c of eligible){
    const a=c.analysis;
    const supported=a.eventStrong||(allowWeak&&(a.closed||a.costReal>0));
    const dated=Boolean(a.reference);
    // Componente ou lado desconhecido não forma sequência de trocas comparável.
    if(!supported||!dated||a.side==="não informado"||(asOf&&a.reference>asOf))continue;
    if(!allowProxy&&!a.actual)continue;
    if(component==="esteira completa"&&a.operationClass!=="troca de esteira / conjunto")continue;
    if(a.operationClass==="troca mista / componentes adicionais")continue;
    const selectedDate=allowProxy?a.reference:a.actual;
    for(const side of a.side==="ambos"?["direito","esquerdo"]:[a.side])
      samples.push({asset:c.identity.id,label:c.identity.label,tag:c.identity.tag,
        component:a.component,side,date:selectedDate,dateSource:allowProxy?a.source:"data real",
        order:c.id,confidence:a.evidenceLevel,
        costReal:a.costReal,costPlanned:a.costPlanned,
        source:c});
  }
  const groups=new Map();
  for(const item of samples){
    if(item.asset==="UNRESOLVED")continue;
    const group=[item.asset,item.component,item.side].join("|");
    if(!groups.has(group))groups.set(group,[]);
    groups.get(group).push(item);
  }
  const intervals=[],audit=[],initialLifeEstimates=[];let clustered=0;
  for(const [group,events] of groups){
    events.sort((a,b)=>a.date.localeCompare(b.date)||a.order.localeCompare(b.order));
    const distinct=[];
    for(const e of events){
      const last=distinct.at(-1);
      if(last&&diffDays(last.date,e.date)<=7){
        last.orders.push(e.order);last.costReal+=e.costReal;last.costPlanned+=e.costPlanned;
        last.dateSources.add(e.dateSource);clustered++;continue;
      }
      distinct.push({...e,orders:[e.order],dateSources:new Set([e.dateSource])});
    }
    audit.push(...distinct.map(x=>({asset:x.label,tag:x.tag,component:x.component,
      side:x.side,date:x.date,dateSource:[...x.dateSources].join(" + "),
      orders:x.orders.join("; "),realCost:x.costReal,plannedCost:x.costPlanned,
      origin:allowProxy?"referência de planejamento/avaria/entrada":"data de execução",
      warning:"Agrupamento de até 7 dias é provisório e exige validação técnica"})));
    // Primeira troca observada: utilizar entrada real em serviço quando fornecida;
    // aquisição apenas aproxima/limita tempo desde compra.
    if(distinct.length) {
      const first=distinct[0];
      const eq=first.asset.startsWith("EQ:")?model.byEquip.get(first.asset.slice(3)):null;
      const serviceDate=isoDate(eq?.serviceStart);
      const acquisition=isoDate(eq?.acquisitionDate);
      const originDate=serviceDate||acquisition;
      const source=serviceDate?"entrada em serviço":"aquisição (não é comissionamento)";
      if(originDate&&first.date>=originDate) {
        initialLifeEstimates.push({asset:first.label,tag:first.tag,component:first.component,
          side:first.side,originDate,originSource:source,firstDate:first.date,
          elapsedDays:diffDays(originDate,first.date),observedReplacements:distinct.length,
          orders:first.orders.join("; "),evidence:first.confidence,
          quality:serviceDate
            ?"estimativa da primeira esteira se o histórico desde entrada em serviço for completo"
            :"tempo máximo desde aquisição até a primeira troca observada; não é vida comprovada",
          costFirstOrder:first.costReal});
      }
    }
    for(let i=1;i<distinct.length;i++){
      const earlier=distinct[i-1],later=distinct[i];
      const days=diffDays(earlier.date,later.date);
      if(days>0)intervals.push({asset:later.label,tag:later.tag,component:later.component,
        side:later.side,first:earlier.date,last:later.date,days,
        orders:earlier.orders.join("; ")+" → "+later.orders.join("; "),
        quality:allowProxy?"intervalo entre datas de referência (estimado)":"intervalo real",
        dateSources:[...new Set([...earlier.dateSources,...later.dateSources])].join("; ")});
    }
  }
  const byAsset=new Map();
  for(const x of intervals){
    const k=[x.asset,x.component,x.side].join("|");
    if(!byAsset.has(k))byAsset.set(k,[]);
    byAsset.get(k).push(x.days);
  }
  const summary=[...byAsset.entries()].map(([k,days])=>{
    const [asset,component,side]=k.split("|");
    return {asset,component,side,intervals:days.length,meanDays:mean(days),
      medianDays:median(days),minDays:Math.min(...days),maxDays:Math.max(...days)};
  }).sort((a,b)=>b.intervals-a.intervals);
  const allComponents=new Set(intervals.map(x=>x.component));
  const mixingComponents=allComponents.size>1;
  return {candidates,eligible,financialOrders,costByClass,materialsByOrder,
    intervals,audit,initialLifeEstimates,summary,meanDays:mixingComponents?null:mean(intervals.map(x=>x.days)),
    medianDays:mixingComponents?null:median(intervals.map(x=>x.days)),
    mixingComponents,clustered,
    missingSide:eligible.filter(x=>x.analysis.side==="não informado").length,
    excludedWeak:eligible.filter(x=>!x.analysis.eventStrong).length,
    futureDated:eligible.filter(x=>asOf&&x.analysis.reference>asOf).length,
    withoutCost:candidates.filter(x=>x.analysis.costReal===0).length,
    withoutReservation:candidates.filter(x=>!x.reserves.length).length,
    dataMode:allowProxy?"datas-base/avaria/entrada (proxy)":"somente data real",
    evidenceMode:allowWeak?"exploratório - inclui evidências fracas":"prudente - custo, status e materiais triangulados",
    excluded:eligible.filter(x=>!x.analysis.reference||(asOf&&x.analysis.reference>asOf)||x.analysis.side==="não informado"||
      !(x.analysis.closed||x.analysis.costReal>0)).length};
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
      "Enriq. Notificador":r.notifier||"",
      ...(role==="equipment"?{
        "Data de entrada em serviço":r.serviceStart||"",
        "Enriq. Data de aquisição":r.acquisitionDate||""
      }:{})
    };
  });
}
export function exportMaterials(model) {
  return [...model.materials.values()].map(m=>({
    Material:m.material||"SEM CÓDIGO SAP",Descrição:m.description,UM:m.unit,
    "Sem cadastro":m.uncoded?"SIM":"NÃO",
    "Linhas MB24":m.rows,"Ordens distintas":m.orders.size,
    "Quantidade solicitada (por unidade)":m.qty,
    "Natureza":"Reserva / necessidade — não comprova saída física"
  }));
}


/**
 * Ciclo de vida por ativo e lado, incluindo primeira troca observada.
 * As referências temporais da IW39 não se tornam datas de execução comprovadas.
 * Nenhum dado corporativo faz parte deste módulo.
 */
export function analyzeLifecycle(model,{
  allowWeak=false,asOf=isoDate(new Date()),
  completionStatuses=["ENTE","ENCE"],cancellationStatuses=["NEXE","CANC"],
  assetFilter=""
}={}) {
  const categoryOf=(name)=>{
    const n=key(name);
    if(/TRATOR\s+DE\s+ESTEIRAS|BULLDOZER|\bDOZER\b|\bCAT\s+D[0-9]\b/.test(n))return "Tratores de esteiras";
    if(/ESCAVADEIRA|EXCAVATOR|SHOVEL/.test(n))return "Escavadeiras";
    if(/PERFURATRIZ|DRILL|DR410|DI650/.test(n))return "Perfuratrizes";
    return "Outros / verificar";
  };
  const isTracked=(name)=>categoryOf(name)!=="Outros / verificar";
  const machines=new Map();
  for(const e of model.norm.equipment){
    if(!e.id||!isTracked(e.object+" "+e.model))continue;
    if(assetFilter&&!key(e.object+" "+e.id).includes(key(assetFilter)))continue;
    machines.set("EQ:"+e.id,{id:"EQ:"+e.id,name:e.object||e.id,
      tag:machineTag(e.object)||machineTag(e.inventory),family:categoryOf(e.object+" "+e.model),
      acquisition:isoDate(e.acquisitionDate),commissioned:isoDate(e.serviceStart),
      equipment:e.id});
  }
  const audit=[],valid=[],materialDetails=[];
  for(const o of model.orders){
    const a=classifyRodante(o,{completionStatuses,cancellationStatuses});
    if(!a.component)continue;
    const id=o.identity.id;
    const e=id.startsWith("EQ:")?model.byEquip.get(id.slice(3)):null;
    const label=e?.object||o.identity.label;
    if(assetFilter&&!key(label+" "+id).includes(key(assetFilter)))continue;
    const tracked=isTracked(label+" "+(e?.model||""));
    if(!tracked&&!machines.has(id))continue;
    if(!machines.has(id))machines.set(id,{id,name:label,
      tag:o.identity.tag||machineTag(label),
      family:categoryOf(label+" "+(e?.model||"")),acquisition:isoDate(e?.acquisitionDate),
      commissioned:isoDate(e?.serviceStart),equipment:e?.id||""});
    const reserveList=o.reserves.map(x=>({
      reservation:x.id,material:x.material||"",description:x.description||"",
      qty:x.qty,unit:x.unit,deleted:x.deletedFlag,finalFlag:x.finalFlag
    }));
    const isWhole=a.operationClass==="troca de esteira / conjunto";
    const statusReliable=a.eventStrong;
    const accepted=isWhole&&a.isCandidate&&a.reference&&(!asOf||a.reference<=asOf)
      &&!a.cancelled&&(statusReliable||allowWeak);
    let reason="";
    if(!isWhole)reason="O serviço não é troca completa da esteira";
    else if(a.cancelled)reason="Status de cancelamento";
    else if(!a.reference)reason="Sem referência cronológica";
    else if(asOf&&a.reference>asOf)reason="Intervenção com data futura";
    else if(!statusReliable&&!allowWeak)reason="Evidência insuficiente (conferir OS e baixa)";
    else if(a.side==="não informado")reason="Troca candidata, lado não informado";
    else reason="Elegível para reconstrução de ciclo";
    for(const res of reserveList)materialDetails.push({
      equipment:e?.id||"",asset:label,order:o.id,
      dateReference:a.reference,side:a.side,operationClass:a.operationClass,
      reservation:res.reservation,material:res.material||"SEM CÓDIGO",
      description:res.description,required:res.qty,unit:res.unit,
      deleted:res.deleted,finalFlag:res.finalFlag,
      warning:"Reserva não comprova movimento de estoque ou montagem"
    });
    const record={
      equipment:e?.id||"",objectId:id,asset:label,tag:machines.get(id).tag,
      family:machines.get(id).family,
      order:o.id,notes:(o.notes||[]).map(x=>x.id).filter(Boolean).join("; "),
      description:o.description,side:a.side,component:a.component,
      operationClass:a.operationClass,status:o.sys,evidence:a.evidenceLevel,
      accepted:accepted?"SIM":"NÃO",reason,
      dateBase:a.dateBase,faultEnd:a.faultEnd,entry:a.entry,
      dateReference:a.reference,referenceSource:a.source,
      costReal:a.costReal,costPlanned:a.costPlanned,
      reserveCount:reserveList.length,
      reservedMaterials:reserveList.map(x=>x.material||("SEM COD: "+x.description)).join("; ")
    };
    audit.push(record);
    if(accepted){
      if(a.side==="ambos"){
        valid.push({...record,side:"direito",originSide:"ambos"});
        valid.push({...record,side:"esquerdo",originSide:"ambos"});
      }else if(a.side!=="não informado"){
        valid.push({...record,originSide:a.side});
      }
    }
  }

  const groups=new Map();
  for(const x of valid){
    const id=x.objectId+"|"+x.side;
    if(!groups.has(id))groups.set(id,[]);
    groups.get(id).push(x);
  }
  const cycles=[],equipmentSummary=[],timeline=[];
  const maxDate=asOf||"";
  for(const machine of machines.values()){
    const selected=[...groups.entries()].filter(([k])=>k.startsWith(machine.id+"|"));
    let totalEvents=0,completed=0,initialEstimates=0;
    let totalCost=0;const orderSet=new Set(),intervalDays=[];
    for(const [,events] of selected){
      events.sort((a,b)=>a.dateReference.localeCompare(b.dateReference)||a.order.localeCompare(b.order));
      const dedup=[];
      for(const e of events){
        const last=dedup.at(-1);
        if(last&&diffDays(last.dateReference,e.dateReference)<=7){
          last.mergedOrders.push(e.order);
          last.mergedRecords.push(e);
          continue;
        }
        dedup.push({...e,mergedOrders:[e.order],mergedRecords:[e]});
      }
      const start=machine.commissioned||machine.acquisition;
      const startType=machine.commissioned?"Comissionamento":machine.acquisition?"Aquisição (aproximação)":"Desconhecida";
      for(let i=0;i<dedup.length;i++){
        const event=dedup[i],prev=dedup[i-1];
        const anchor=i===0?start:prev.dateReference;
        const anchorOrder=i===0?"":prev.order;
        const days=anchor&&event.dateReference>=anchor?diffDays(anchor,event.dateReference):null;
        const kind=i===0?"Primeira troca observada":"Troca subsequente";
        const quality=i===0
          ?machine.commissioned?"Primeira vida aproximada (confirmar esteira original)"
            :machine.acquisition?"Tempo desde aquisição (NÃO é vida confirmada)"
            :"Sem marco inicial"
          :"Intervalo estimado entre ordens (não horas operadas)";
        const aggregateCost=event.mergedRecords.reduce((t,r)=>t+r.costReal,0);
        cycles.push({
          equipment:machine.equipment,asset:machine.name,tag:machine.tag,family:machine.family,
          side:event.side,cycleType:kind,sequence:i+1,
          previousOrder:anchorOrder,order:event.order,
          groupedOrders:event.mergedOrders.join("; "),
          begin:anchor||"",end:event.dateReference,days:days??"",
          referenceSource:event.referenceSource,initialSource:i===0?startType:"Troca anterior",
          confidence:event.evidence,quality,
          costOfOrders:aggregateCost,partNumbers:event.mergedRecords.map(r=>r.reservedMaterials).filter(Boolean).join("; "),
          materialRows:event.mergedRecords.reduce((t,r)=>t+r.reserveCount,0),
          operationalProof:"Pendente: confirmar execução e movimento de material"
        });
        totalEvents++;if(i>0&&days!==null){completed++;intervalDays.push(days)}
        if(i===0&&days!==null)initialEstimates++;
        for(const part of event.mergedRecords)orderSet.add(part.order);
      }
      if(dedup.length&&maxDate&&dedup.at(-1).dateReference<=maxDate){
        const last=dedup.at(-1);
        timeline.push({
          equipment:machine.equipment,asset:machine.name,family:machine.family,
          side:last.side,lastOrder:last.order,lastDate:last.dateReference,
          asOf:maxDate,elapsedDays:diffDays(last.dateReference,maxDate),
          description:"Tempo desde última ordem candidata; ciclo em aberto/censurado, NÃO uma falha observada"
        });
      }
    }
    const machineAudit=audit.filter(x=>x.objectId===machine.id);
    const acceptedAudit=machineAudit.filter(x=>x.accepted==="SIM");
    const withoutSide=acceptedAudit.filter(x=>x.side==="não informado").length;
    const allCandidateOrders=[...new Set(machineAudit.filter(x=>x.operationClass==="troca de esteira / conjunto").map(x=>x.order))];
    totalCost=machineAudit.reduce((sum,x)=>sum+x.costReal,0);
    equipmentSummary.push({
      equipment:machine.equipment,asset:machine.name,tag:machine.tag,family:machine.family,
      commissioning:machine.commissioned,acquisition:machine.acquisition,
      acceptedOrders:orderSet.size,observedSides:totalEvents,
      subsequentIntervals:completed,meanDays:intervalDays.length?mean(intervalDays):"",
      firstLifeEstimates:initialEstimates,withoutSide,
      candidateOrders:allCandidateOrders.join("; "),
      acceptedOrderNumbers:[...orderSet].join("; "),
      costOfRelatedOrders:totalCost,
      status:totalEvents?"Com trocas candidatas":"Sem troca completa validada no recorte"
    });
  }
  equipmentSummary.sort((a,b)=>a.family.localeCompare(b.family,"pt-BR")||a.asset.localeCompare(b.asset,"pt-BR"));
  cycles.sort((a,b)=>a.family.localeCompare(b.family,"pt-BR")||a.asset.localeCompare(b.asset,"pt-BR")||
    a.side.localeCompare(b.side,"pt-BR")||a.sequence-b.sequence);
  audit.sort((a,b)=>a.asset.localeCompare(b.asset,"pt-BR")||a.dateReference.localeCompare(b.dateReference)||a.order.localeCompare(b.order));
  return {equipmentSummary,cycles,audit,materialDetails,openCycles:timeline,
    metrics:{trackedEquipment:machines.size,ordersAudited:audit.length,
      approvedOrders:new Set(valid.map(x=>x.order)).size,
      closedIntervals:cycles.filter(x=>x.cycleType==="Troca subsequente"&&x.days!=="").length,
      firstEstimates:cycles.filter(x=>x.cycleType==="Primeira troca observada"&&x.days!=="").length,
      missingSide:audit.filter(x=>x.accepted==="SIM"&&x.side==="não informado").length}
  };
}

export const SESSION_FORMAT="sap-history-session";
export const SESSION_VERSION=1;
export function serializeSession(bases,loaded=[],settings={}) {
  return {format:SESSION_FORMAT,version:SESSION_VERSION,
    savedAt:new Date().toISOString(),
    description:"BACKUP LOCAL CONFIDENCIAL: contém as informações originais carregadas pelo usuário",
    bases:Object.fromEntries(ROLES.map(role=>[role,Array.isArray(bases[role])?bases[role]:[]])),
    loaded,settings};
}
export function restoreSession(value) {
  if(!value||typeof value!=="object"||value.format!==SESSION_FORMAT||value.version!==SESSION_VERSION)
    throw new Error("Arquivo não é uma sessão SAP suportada (formato/versão).");
  if(!value.bases||typeof value.bases!=="object")throw new Error("Sessão sem bases SAP.");
  const bases={};
  for(const role of ROLES){
    const rows=value.bases[role]||[];
    if(!Array.isArray(rows)||rows.length>1000000||rows.some(x=>!x||typeof x!=="object"||Array.isArray(x)))
      throw new Error("Base inválida na sessão: "+role);
    bases[role]=rows;
  }
  return {bases,loaded:Array.isArray(value.loaded)?value.loaded:[],
    settings:value.settings&&typeof value.settings==="object"&&!Array.isArray(value.settings)?value.settings:{}};
}

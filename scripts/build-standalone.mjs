import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
const root=process.cwd();
const page=readFileSync(resolve(root,"index.html"),"utf8");
const core=readFileSync(resolve(root,"src/engine.js"),"utf8");
const pattern=/<script type="module">\s*import \{[\s\S]*?\} from ["']\.\/src\/engine\.js["'];\s*/;
if(!pattern.test(page))throw new Error("Entrada de módulo não localizada em index.html");
const compiled=page.replace(pattern,"<script>\n"+core.replace(/export const /g,"const ").replace(/export function /g,"function ")+"\n");
const location=resolve(root,"standalone.html");
if(process.argv.includes("--check")){
 const current=readFileSync(location,"utf8");
 if(current!==compiled)throw new Error("standalone.html desatualizado: execute npm run build:standalone");
 console.log("standalone.html sincronizado com engine.js e index.html");
}else{
 writeFileSync(location,compiled,"utf8");
 console.log("standalone.html gerado ("+compiled.length+" caracteres)");
}

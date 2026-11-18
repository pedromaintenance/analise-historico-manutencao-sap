import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
const root=process.cwd();
const page=readFileSync(resolve(root,"index.html"),"utf8");
const engine=readFileSync(resolve(root,"src/engine.js"),"utf8");
const dashboard=readFileSync(resolve(root,"src/dashboard.js"),"utf8");
const imports=/<script type="module">\s*import \{[^\n]+\} from "\.\/src\/engine\.js";\s*import \{[^\n]+\} from "\.\/src\/dashboard\.js";\s*/;
if(!imports.test(page))throw new Error("Imports dos módulos engine/dashboard não encontrados no HTML.");
const plain=code=>code.replace(/export const /g,"const ").replace(/export function /g,"function ");
const dashboardWrapped="const DashboardModule=(function(){\n"+plain(dashboard)+
  "\nreturn {DASHBOARD_STYLE,buildDashboardData,renderDashboardCards,generateStandaloneDashboard,recalculateReviewedDashboard,reviewOrderKey,exportReviewFile,importReviewFile,normalizeReviewDecisions};\n})();\n"+
  "const {DASHBOARD_STYLE,buildDashboardData,renderDashboardCards,generateStandaloneDashboard,recalculateReviewedDashboard,reviewOrderKey,exportReviewFile,importReviewFile,normalizeReviewDecisions}=DashboardModule;\n";
const compiled=page.replace(imports,"<script>\n"+plain(engine)+"\n"+dashboardWrapped+"\n");
const location=resolve(root,"standalone.html");
if(process.argv.includes("--check")){
 const current=readFileSync(location,"utf8");
 if(current!==compiled)throw new Error("standalone.html desatualizado: execute npm run build:standalone");
 console.log("standalone sincronizado com index.html, engine.js e dashboard.js");
}else{
 writeFileSync(location,compiled,"utf8");
 console.log("standalone.html gerado com "+compiled.length+" caracteres");
}

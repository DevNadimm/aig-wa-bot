const fs = require('fs');
const filePath = 'admin-panel/src/app/dashboard/docs/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/className="p-2 bg-(.*?)-500\/10 rounded-lg"/g, 'className="p-3 bg--500/10 rounded-lg"');
code = code.replace(/className="h-5 w-5 text-(.*?)-400"/g, 'className="h-6 w-6 text--400"');

fs.writeFileSync(filePath, code);
console.log('Fixed icon sizes');


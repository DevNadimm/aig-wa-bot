
const fs = require('fs');
let code = fs.readFileSync('admin-panel/src/app/dashboard/docs/page.tsx', 'utf8');

code = code.replace(/\\\\n/g, '\\n');

fs.writeFileSync('admin-panel/src/app/dashboard/docs/page.tsx', code);
console.log('Fixed newlines');


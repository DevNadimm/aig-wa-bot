
const fs = require('fs');
const files = [
  'admin-panel/src/app/dashboard/agents/page.tsx',
  'admin-panel/src/app/dashboard/intents/page.tsx',
  'admin-panel/src/app/dashboard/knowledge/page.tsx',
  'admin-panel/src/app/dashboard/workflows/page.tsx',
  'admin-panel/src/app/dashboard/tools/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/Edit01Icon/g, 'PencilEdit02Icon');
  fs.writeFileSync(file, content);
  console.log('Patched ' + file);
}


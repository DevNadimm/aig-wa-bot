
const fs = require('fs');
let code = fs.readFileSync('admin-panel/src/app/dashboard/docs/page.tsx', 'utf8');

code = code.replace(/ArrowUpRight01Icon/g, 'Settings02Icon');

code = code.replace(/<Button variant=\"outline\" size=\"sm\" className=\"gap-2\">\s*Configure <Settings02Icon className=\"h-4 w-4\" \/>\s*<\/Button>/g, 
  '<Button variant=\"secondary\" size=\"sm\">\\n                  <Settings02Icon className=\"h-4 w-4 mr-2\" /> Configure\\n                </Button>');

fs.writeFileSync('admin-panel/src/app/dashboard/docs/page.tsx', code);
console.log('Fixed buttons');


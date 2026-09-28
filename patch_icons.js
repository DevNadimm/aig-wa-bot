
const fs = require('fs');
let code = fs.readFileSync('admin-panel/src/app/dashboard/docs/page.tsx', 'utf8');

// Replace imports if needed
const importsToAdd = ['BotIcon', 'AiBrain01Icon', 'GitMergeIcon', 'ToolsIcon', 'Database01Icon', 'UserGroupIcon'];
for (const icon of importsToAdd) {
  if (!code.includes(icon)) {
    code = code.replace('import { BookOpen01Icon, SourceCodeIcon', \import { \, BookOpen01Icon, SourceCodeIcon\);
  }
}

// Map the old icons to new ones
code = code.replace(/Robot01Icon/g, 'BotIcon');
code = code.replace(/Target01Icon/g, 'AiBrain01Icon');
code = code.replace(/Activity01Icon/g, 'GitMergeIcon');
code = code.replace(/Wrench01Icon/g, 'ToolsIcon');
code = code.replace(/BookOpen01Icon/g, 'Database01Icon');
code = code.replace(/UserGroup02Icon/g, 'UserGroupIcon');

fs.writeFileSync('admin-panel/src/app/dashboard/docs/page.tsx', code);
console.log('Fixed docs icons to match sidebar');


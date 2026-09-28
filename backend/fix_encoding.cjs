const fs = require('fs');
let code = fs.readFileSync('src/core/handoff/handoff-decision.service.ts', 'utf8');
code = code.replace(/const bengaliPatterns = \[[\s\S]*?\];/, "const bengaliPatterns = ['?????', '??????', '????????', '?????????'];");
fs.writeFileSync('src/core/handoff/handoff-decision.service.ts', code);

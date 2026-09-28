const fs = require('fs');
const files = [
  'admin-panel/src/app/dashboard/agents/[id]/page.tsx',
  'admin-panel/src/app/dashboard/knowledge/[id]/page.tsx',
  'admin-panel/src/app/dashboard/workflows/[id]/page.tsx',
  'admin-panel/src/app/dashboard/tools/[id]/page.tsx',
];

for (const filePath of files) {
  if (!fs.existsSync(filePath)) continue;
  let code = fs.readFileSync(filePath, 'utf8');

  if (code.includes('Promise<{ id: string }>')) continue;
  
  if (code.includes('params: { id: string }')) {
    code = code.replace(/import \{ useEffect, useState \} from 'react';|import \{ useEffect, useState \} from "react";|import \{ useState, useEffect \} from "react";/, 'import { useEffect, useState, use } from "react";');
    
    code = code.replace(
      /\{ params \}: \{ params: \{ id: string \} \}/g,
      '{ params }: { params: Promise<{ id: string }> }'
    );
    
    code = code.replace(
      /\{ params \}: \{ params: Promise<\{ id: string \}> \} \) \{/,
      '{ params }: { params: Promise<{ id: string }> } ) {\\n  const resolvedParams = use(params);'
    );

    code = code.replace(/params\.id/g, 'resolvedParams.id');
    fs.writeFileSync(filePath, code);
    console.log('Fixed ' + filePath);
  }
}

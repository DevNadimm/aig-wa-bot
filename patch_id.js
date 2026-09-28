
const fs = require('fs');
const filePath = 'admin-panel/src/app/dashboard/intents/[id]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  Buffer.from('aW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gInJlYWN0Ijs=', 'base64').toString(),
  Buffer.from('aW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSwgdXNlIH0gZnJvbSAicmVhY3QiOw==', 'base64').toString()
);

code = code.replace(
  Buffer.from('ZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRWRpdEludGVudFBhZ2UoeyBwYXJhbXMgfTogeyBwYXJhbXM6IHsgaWQ6IHN0cmluZyB9IH0pIHs=', 'base64').toString(),
  Buffer.from('ZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRWRpdEludGVudFBhZ2UoeyBwYXJhbXMgfTogeyBwYXJhbXM6IFByb21pc2U8eyBpZDogc3RyaW5nIH0+IH0pIHs=', 'base64').toString()
);

code = code.replace(
  Buffer.from('Y29uc3QgW2ludGVudCwgc2V0SW50ZW50XSA9IHVzZVN0YXRlPGFueT4obnVsbCk7', 'base64').toString(),
  Buffer.from('Y29uc3QgcmVzb2x2ZWRQYXJhbXMgPSB1c2UocGFyYW1zKTsKICBjb25zdCBbaW50ZW50LCBzZXRJbnRlbnRdID0gdXNlU3RhdGU8YW55PihudWxsKTs=', 'base64').toString()
);

code = code.replace(/params\.id/g, 'resolvedParams.id');

fs.writeFileSync(filePath, code);
console.log('Fixed');


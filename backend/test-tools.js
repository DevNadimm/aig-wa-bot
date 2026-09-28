
const tools = [{
  functionDeclarations: [
    {
      name: 'search_doctors',
      description: 'Find doctors based on department or symptom.',
      parameters: { type: 'object', properties: {} }
    }
  ]
}];

const openAiTools = tools?.flatMap((t) =>
  (t.functionDeclarations ?? []).map((fn) => ({
    type: 'function',
    function: {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters ?? { type: 'object', properties: {} },
    },
  }))
) ?? [];

console.log(JSON.stringify(openAiTools, null, 2));


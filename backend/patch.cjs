
const fs = require("fs");
let code = fs.readFileSync("src/core/ai/llm_service.ts", "utf8");

const replacement = `        // Convert Gemini contents to OpenAI messages
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
        if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
        
        let toolCallIdCounter = 1;
        
        for (const c of contents) {
          const role = c.role === "model" ? "assistant" : "user";
          
          const textParts = c.parts?.filter((p: any) => p.text).map((p: any) => p.text) || [];
          const text = textParts.join(" ");

          const functionCalls = c.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall) || [];
          const functionResponses = c.parts?.filter((p: any) => p.functionResponse).map((p: any) => p.functionResponse) || [];

          if (functionCalls.length > 0) {
            const tool_calls: any[] = functionCalls.map((fc: any) => ({
              id: fc.id || \`call_\${toolCallIdCounter++}\`,
              type: "function",
              function: {
                name: fc.name,
                arguments: JSON.stringify(fc.args || {})
              }
            }));
            messages.push({ role: "assistant", content: text || null, tool_calls });
          } else if (functionResponses.length > 0) {
            if (text) {
              messages.push({ role, content: text });
            }
            for (const fr of functionResponses) {
              messages.push({
                role: "tool",
                tool_call_id: fr.id || \`call_\${toolCallIdCounter - 1}\`,
                content: typeof fr.response === "string" ? fr.response : JSON.stringify(fr.response)
              });
            }
          } else {
            messages.push({ role, content: text });
          }
        }`;

const agenticIdx = code.indexOf("generateAgenticResponse");
const actualStart = code.indexOf("// Convert Gemini contents", agenticIdx);
const actualEnd = code.indexOf("messages.push({ role, content: text });", actualStart);
const braceEnd = code.indexOf("}", actualEnd) + 1;

code = code.substring(0, actualStart) + replacement + code.substring(braceEnd);
fs.writeFileSync("src/core/ai/llm_service.ts", code);
console.log("Patched!");


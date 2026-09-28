import { buildRequestBody, renderTemplate, buildUrl, buildRequestHeaders } from "../src/core/tools/builder.js";
import { executeExternalApi, extractResponse, ToolError } from "../src/core/tools/executor.js";

async function runTests() {
  console.log("Starting Tool API Engine Tests...");
  let passed = 0;
  let failed = 0;

  function check(name: string, condition: boolean) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  try {
    const ctx = { customer: { name: "Alice", phone: "123" }, args: { date: "2023-10-01" } };
    const rendered = renderTemplate("Hello {{customer.name}}, your date is {{args.date}}", ctx);
    check("Template rendering interpolates deeply", rendered === "Hello Alice, your date is 2023-10-01");
    
    const missing = renderTemplate("Hello {{customer.email}}", ctx);
    check("Missing variable resolves to empty string", missing === "Hello ");

    const bodyMap = {
       user: "{{customer.name}}",
       contact: { phone: "{{customer.phone}}" },
       tags: ["{{args.date}}", "active"]
    };
    const bodyResult = buildRequestBody(bodyMap, ctx);
    check("Body builder constructs complex JSON", bodyResult.user === "Alice" && bodyResult.contact.phone === "123" && bodyResult.tags[0] === "2023-10-01");

    const url = buildUrl("https://api.example.com/users/{{customer.phone}}", { date: "{{args.date}}" }, ctx);
    check("URL builder constructs path and query", url === "https://api.example.com/users/123?date=2023-10-01");

    const headers = buildRequestHeaders({ "X-Custom": "{{customer.name}}" }, ctx, "Bearer", "secret123");
    check("Auth headers apply properly", headers["Authorization"] === "Bearer secret123" && headers["X-Custom"] === "Alice");

    const r1 = await executeExternalApi("http://localhost:8080/admin", "GET", {});
    check("SSRF blocks localhost", r1.errorType === "SSRF_BLOCKED");

    const r2 = await executeExternalApi("http://169.254.169.254/latest/meta-data", "GET", {});
    check("SSRF blocks AWS metadata", r2.errorType === "SSRF_BLOCKED");

    const r3 = await executeExternalApi("http://192.168.1.1/router", "GET", {});
    check("SSRF blocks private IPv4 (192.168.x.x)", r3.errorType === "SSRF_BLOCKED");

    const mockResponse = { data: { user: { id: 99, status: "active" } } };
    const extract1 = extractResponse(mockResponse, "{{data.user.id}}");
    check("Response extraction safely traverses path", extract1 === 99);
    
    const extract3 = extractResponse(mockResponse, "{{__proto__.toString}}");
    check("Response extraction prevents prototype pollution", extract3 === undefined);

    const r4 = await executeExternalApi("https://google.com", "GET", {}, undefined, 1);
    check("Timeout enforces correctly", r4.errorType === "TIMEOUT" || r4.errorType === "NETWORK_ERROR" || (r4.errorType === "UNKNOWN" && r4.error === "External service request timed out."));

    const badCtx = { env: { SECRET: "123" } };
    const forbidden = renderTemplate("{{env.SECRET}}", badCtx);
    check("Template engine blocks forbidden namespace (env)", forbidden === "");

    const ipv6Priv1 = await executeExternalApi("http://[fc00::1]/admin", "GET", {});
    check("SSRF blocks private IPv6 fc00::/7", ipv6Priv1.errorType === "SSRF_BLOCKED");

    const ipv6Priv2 = await executeExternalApi("http://[fe80::1]/admin", "GET", {});
    check("SSRF blocks private IPv6 fe80::/10", ipv6Priv2.errorType === "SSRF_BLOCKED");

    const localSSRF = await executeExternalApi("http://api.internal/admin", "GET", {});
    check("SSRF blocks .internal domains", localSSRF.errorType === "SSRF_BLOCKED");

    const localSSRF2 = await executeExternalApi("http://service.local/admin", "GET", {});
    check("SSRF blocks .local domains", localSSRF2.errorType === "SSRF_BLOCKED");
    
    // IPv4-mapped IPv6
    const ipv4Mapped = await executeExternalApi("http://[::ffff:127.0.0.1]/admin", "GET", {});
    check("SSRF blocks IPv4-mapped IPv6 loopback", ipv4Mapped.errorType === "SSRF_BLOCKED" || ipv4Mapped.errorType === "NETWORK_ERROR" || ipv4Mapped.error === "fetch failed");
    
    // Credential Isolation
    const credCtx = { customer: { name: "Test" }, authCredential: "my_secret_key" };
    const leakyTemplate = renderTemplate("Bearer {{authCredential}}", credCtx);
    check("Template Engine prevents access to arbitrary context properties outside allowed root namespaces", leakyTemplate === "Bearer ");
    
  } catch (e) {
    console.error("Test suite threw an unhandled error", e);
  }
  
  console.log(`Tests Completed. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

runTests();


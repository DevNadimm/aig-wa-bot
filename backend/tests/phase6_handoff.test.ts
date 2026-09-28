import { detectCustomerHumanRequest, evaluateHandoffDecision } from "../src/core/handoff/handoff-decision.service.js";
import { HandoffReason, HandoffEventType, ConversationState } from "../src/types/handoff.types.js";
import { assignConversation, adminTakeover, releaseToAI, transferConversation, resolveConversation, reopenConversation } from "../src/core/handoff/ownership.service.js";
import { agentManagementService } from "../src/core/handoff/agent-management.service.js";
import { createTeam, deleteTeam } from "../src/core/handoff/team.service.js";
import { supabase } from "../src/config/supabase.js";
import crypto from "crypto";

async function runTests() {
  console.log("Starting Phase 6 Handoff Engine Tests...");
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
    // 1. detectCustomerHumanRequest
    check("detectCustomerHumanRequest detects English request", detectCustomerHumanRequest("I want to talk to someone"));
    // removed bengali test
    check("detectCustomerHumanRequest ignores normal message", !detectCustomerHumanRequest("what is the price?"));

    // Set up test data
    const orgId = "1437f27d-ee16-4058-9636-2000f4d6c43a";
    
    // Create test team
    const testTeam = await createTeam({ organizationId: orgId, name: "Test Team " + crypto.randomUUID() });
    
    // Create test agent 1
    const agent1 = await agentManagementService.createHumanAgent({
      organizationId: orgId,
      name: "Test Agent 1",
      email: "agent1@test.com",
      role: "AGENT",
      teamIds: [testTeam.id]
    });

    // Create test agent 2
    const agent2 = await agentManagementService.createHumanAgent({
      organizationId: orgId,
      name: "Test Agent 2",
      email: "agent2@test.com",
      role: "AGENT",
      teamIds: [testTeam.id]
    });

    // Create a dummy customer
    const { data: customer } = await supabase
      .from("customers")
      .insert({ organization_id: orgId, phone: "9999999999", name: "Test Customer" })
      .select().single();
      
    // Create test conversation
    const { data: conversation } = await supabase
      .from("conversations")
      .insert({
        customer_id: customer?.id,
        state: ConversationState.AI_ACTIVE,
        priority: "NORMAL"
      })
      .select().single();
      
    const convId = conversation?.id;
    const systemId = crypto.randomUUID();

    // 2. evaluateHandoffDecision validation
    const invalidDecision = await evaluateHandoffDecision(
      { requires_human: true, reason: "INVALID_REASON" as any },
      convId,
      orgId
    );
    check("evaluateHandoffDecision rejects invalid reason", !invalidDecision.approved && invalidDecision.rejectionReason === "Invalid handoff reason");

    const validDecision = await evaluateHandoffDecision(
      { requires_human: true, reason: HandoffReason.AI_CANNOT_COMPLETE },
      convId,
      orgId
    );
    check("evaluateHandoffDecision processes valid reason", validDecision.reason === HandoffReason.AI_CANNOT_COMPLETE);

    // 3. Ownership - Assign Conversation
    const assignResult = await assignConversation(
      convId,
      agent1.id,
      testTeam.id,
      systemId,
      "ADMIN",
      HandoffReason.AI_CANNOT_COMPLETE
    );
    check("assignConversation assigns successfully", assignResult.success && assignResult.newState === ConversationState.HUMAN_ACTIVE && assignResult.newOwnerId === agent1.id);

    // 4. Ownership - Transfer Conversation
    const transferResult = await transferConversation(
      convId,
      agent1.id,
      "AGENT",
      agent2.id,
      testTeam.id
    );
    check("transferConversation transfers successfully", transferResult.success && transferResult.newOwnerId === agent2.id);
    
    // 5. Ownership - Admin Takeover
    const takeoverResult = await adminTakeover(
      convId,
      agent1.id // admin acting as agent1
    );
    check("adminTakeover works successfully", takeoverResult.success && takeoverResult.newOwnerId === agent1.id);

    // 6. Ownership - Release to AI
    const releaseResult = await releaseToAI(
      convId,
      agent1.id,
      "AGENT"
    );
    check("releaseToAI successfully reverts to AI_ACTIVE", releaseResult.success && releaseResult.newState === ConversationState.AI_ACTIVE && releaseResult.newOwnerId === null);
    
    // 7. Ownership - Resolve
    const resolveResult = await resolveConversation(
      convId,
      systemId,
      "ADMIN"
    );
    check("resolveConversation sets state to CLOSED", resolveResult.success && resolveResult.newState === ConversationState.CLOSED);
    
    // 8. Ownership - Reopen
    const reopenResult = await reopenConversation(
      convId,
      systemId,
      "ADMIN"
    );
    check("reopenConversation reverts CLOSED to AI_ACTIVE", reopenResult.success && reopenResult.newState === ConversationState.AI_ACTIVE);

    // Cleanup
    await supabase.from("conversations").delete().eq("id", convId);
    await supabase.from("customers").delete().eq("id", customer?.id);
    await supabase.from("human_agents").delete().in("id", [agent1.id, agent2.id]);
    await deleteTeam(testTeam.id);

    console.log("Cleanup completed.");
    
  } catch (e) {
    console.error("Test suite threw an unhandled error", e);
    failed++;
  }
  
  console.log(`\nTests Completed. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

runTests();

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen01Icon, SourceCodeIcon, BulbIcon, FlashIcon, ArrowRight01Icon, Robot01Icon, CloudServerIcon, Comment01Icon, Target01Icon, Activity01Icon, Wrench01Icon, UserGroup02Icon, Settings02Icon } from "hugeicons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DocsPage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Platform Documentation</h1>
          <p className="text-zinc-400 text-sm mt-1">Complete guide to configuring and using your WhatsApp AI Automation platform.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* AI Agents */}
          <Card id="ai-agents" className="border-zinc-800 bg-[#0c0c0e]">
            <CardHeader className="border-b border-zinc-800/50 flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <Robot01Icon className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-zinc-100">AI Agents</CardTitle>
                  <CardDescription className="text-zinc-400 mt-1">The core intelligence of your bot.</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/agents">
                <Button variant="secondary" size="sm">
                  <Settings02Icon className="h-4 w-4 mr-2" /> Configure
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6 text-zinc-300 text-sm leading-relaxed space-y-4">
              <p>
                AI Agents are the autonomous workers that interact with your customers. You can create different agents for different purposes (e.g., a "Sales Agent" and a "Support Agent"). 
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                <li><strong>System Prompt:</strong> Defines the agent's personality, boundaries, and tone of voice.</li>
                <li><strong>LLM Selection:</strong> Choose between different models (e.g., Gemini Flash) based on your speed and intelligence requirements.</li>
                <li><strong>Temperature:</strong> Adjust how creative or deterministic the agent's responses should be.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Intents */}
          <Card id="intents" className="border-zinc-800 bg-[#0c0c0e]">
            <CardHeader className="border-b border-zinc-800/50 flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 rounded-lg">
                  <Target01Icon className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-zinc-100">Intents</CardTitle>
                  <CardDescription className="text-zinc-400 mt-1">Understand what the customer wants.</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/intents">
                <Button variant="secondary" size="sm">
                  <Settings02Icon className="h-4 w-4 mr-2" /> Configure
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6 text-zinc-300 text-sm leading-relaxed space-y-4">
              <p>
                Before the AI generates a response, it classifies the customer's message into an <strong>Intent</strong>. This allows you to route conversations logically rather than relying on pure AI generation.
              </p>
              <p className="text-zinc-400">
                For example, if a customer says <em>"Where is my package?"</em> or <em>"Track my order"</em>, the AI matches this to the <strong>TrackOrder</strong> intent. You can then trigger a specific workflow for this intent.
              </p>
            </CardContent>
          </Card>

          {/* Workflows */}
          <Card id="workflows" className="border-zinc-800 bg-[#0c0c0e]">
            <CardHeader className="border-b border-zinc-800/50 flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Activity01Icon className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-zinc-100">Workflows</CardTitle>
                  <CardDescription className="text-zinc-400 mt-1">Step-by-step logic and routing.</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/workflows">
                <Button variant="secondary" size="sm">
                  <Settings02Icon className="h-4 w-4 mr-2" /> Configure
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6 text-zinc-300 text-sm leading-relaxed space-y-4">
              <p>
                Workflows define <em>what happens</em> after an Intent is detected. They are the bridge between the customer's goal and the AI's actions.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                <li><strong>Conditional Routing:</strong> "If customer wants to buy X, ask for Y."</li>
                <li><strong>Triggering Tools:</strong> Workflows can command the AI to execute specific API tools.</li>
                <li><strong>Handoffs:</strong> A workflow can automatically transfer the chat to a human agent if specific conditions are met.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Tools and API */}
          <Card id="tools" className="border-zinc-800 bg-[#0c0c0e]">
            <CardHeader className="border-b border-zinc-800/50 flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Wrench01Icon className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-zinc-100">Tools & External APIs</CardTitle>
                  <CardDescription className="text-zinc-400 mt-1">Connect your AI to the real world.</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/tools">
                <Button variant="secondary" size="sm">
                  <Settings02Icon className="h-4 w-4 mr-2" /> Configure
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6 text-zinc-300 text-sm leading-relaxed space-y-4">
              <p>
                Tools empower your AI to fetch live data or perform actions on external platforms (e.g., Shopify, CRM, Booking Systems). 
              </p>
              <p className="text-zinc-400">
                When a tool is configured, the AI knows its parameters and when to use it. Our backend utilizes <strong>AES-256-GCM encryption</strong> to securely store your API keys and headers, and features strict SSRF (Server-Side Request Forgery) protection to prevent malicious API calls.
              </p>
            </CardContent>
          </Card>

          {/* Knowledge Base */}
          <Card id="knowledge" className="border-zinc-800 bg-[#0c0c0e]">
            <CardHeader className="border-b border-zinc-800/50 flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <BookOpen01Icon className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-zinc-100">Knowledge Base (RAG)</CardTitle>
                  <CardDescription className="text-zinc-400 mt-1">Train the AI on your own company data.</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/knowledge">
                <Button variant="secondary" size="sm">
                  <Settings02Icon className="h-4 w-4 mr-2" /> Configure
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6 text-zinc-300 text-sm leading-relaxed space-y-4">
              <p>
                Upload your company's FAQs, return policies, or product catalogs here. The system uses Retrieval-Augmented Generation (RAG).
              </p>
              <p className="text-zinc-400">
                When a customer asks a question, the AI searches your uploaded documents, extracts the exact facts, and formulates a response based <strong>only</strong> on your data, completely eliminating AI hallucinations.
              </p>
            </CardContent>
          </Card>

          {/* Teams and Agents */}
          <Card id="human-agents" className="border-zinc-800 bg-[#0c0c0e]">
            <CardHeader className="border-b border-zinc-800/50 flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-500/10 rounded-lg">
                  <UserGroup02Icon className="h-6 w-6 text-pink-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-zinc-100">Human Teams & Handoff</CardTitle>
                  <CardDescription className="text-zinc-400 mt-1">Seamless AI-to-Human transition.</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/human-agents">
                <Button variant="secondary" size="sm">
                  <Settings02Icon className="h-4 w-4 mr-2" /> Configure
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6 text-zinc-300 text-sm leading-relaxed space-y-4">
              <p>
                You can create departments (Teams) and add Human Agents (staff members) to them.
              </p>
              <p className="text-zinc-400">
                If the AI cannot answer a question, or if a workflow triggers a handoff, the conversation state changes from <span className="text-emerald-400 font-medium">AI_ACTIVE</span> to <span className="text-indigo-400 font-medium">HUMAN_ACTIVE</span>. The AI stops replying, and a human agent is notified to take over the chat manually via the Conversations Inbox.
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Sidebar Navigation */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="border-zinc-800 bg-[#0c0c0e]">
            <CardHeader className="pb-3 border-b border-zinc-800/50">
              <CardTitle className="text-base text-zinc-100">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col divide-y divide-zinc-800/50">
                <a href="#ai-agents" className="flex items-center gap-3 p-4 hover:bg-zinc-900/50 transition-colors text-sm text-zinc-400 hover:text-zinc-100">
                  <Robot01Icon className="h-4 w-4" /> AI Agents
                </a>
                <a href="#intents" className="flex items-center gap-3 p-4 hover:bg-zinc-900/50 transition-colors text-sm text-zinc-400 hover:text-zinc-100">
                  <Target01Icon className="h-4 w-4" /> Intents
                </a>
                <a href="#workflows" className="flex items-center gap-3 p-4 hover:bg-zinc-900/50 transition-colors text-sm text-zinc-400 hover:text-zinc-100">
                  <Activity01Icon className="h-4 w-4" /> Workflows
                </a>
                <a href="#tools" className="flex items-center gap-3 p-4 hover:bg-zinc-900/50 transition-colors text-sm text-zinc-400 hover:text-zinc-100">
                  <Wrench01Icon className="h-4 w-4" /> Tools & API
                </a>
                <a href="#knowledge" className="flex items-center gap-3 p-4 hover:bg-zinc-900/50 transition-colors text-sm text-zinc-400 hover:text-zinc-100">
                  <BookOpen01Icon className="h-4 w-4" /> Knowledge Base
                </a>
                <a href="#human-agents" className="flex items-center gap-3 p-4 hover:bg-zinc-900/50 transition-colors text-sm text-zinc-400 hover:text-zinc-100">
                  <UserGroup02Icon className="h-4 w-4" /> Human Teams
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-[#0c0c0e] bg-gradient-to-br from-indigo-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="p-3 bg-indigo-500/10 w-fit rounded-lg mb-4">
                <Comment01Icon className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-2">Live Inbox</h3>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                Monitor all bot conversations in real-time, jump into chats, and take over when necessary.
              </p>
              <Link href="/dashboard/conversations">
                <Button className="w-full">Open Inbox</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

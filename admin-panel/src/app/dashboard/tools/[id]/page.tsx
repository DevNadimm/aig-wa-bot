"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft01Icon, 
  Add01Icon, 
  Delete02Icon, 
  AiMagicIcon, 
  SparklesIcon, 
  CodeIcon, 
  GlobeIcon, 
  Copy01Icon, 
  CheckmarkCircle02Icon,
  InformationCircleIcon
} from "hugeicons-react";
import { updateTool, deleteTool } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ToolParam {
  name: string;
  param_type: "string" | "number" | "boolean" | "array" | "object";
  is_required: boolean;
  description: string;
}

interface HttpHeader {
  key: string;
  value: string;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

export default function ConfigureToolPage() {
  const router = useRouter();
  const paramsHook = useParams();
  const id = paramsHook.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Tool fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toolType, setToolType] = useState("REST_API");
  const [isEnabled, setIsEnabled] = useState(true);

  // API Config
  const [method, setMethod] = useState<string>("POST");
  const [endpoint, setEndpoint] = useState<string>("");
  const [headers, setHeaders] = useState<HttpHeader[]>([
    { key: "Content-Type", value: "application/json" }
  ]);

  // Parameters
  const [params, setParams] = useState<ToolParam[]>([]);

  // UX Tabs: 'params' | 'autodetect' | 'schema'
  const [activeTab, setActiveTab] = useState<"params" | "autodetect" | "schema">("params");

  // Auto-detect JSON state
  const [jsonBodyInput, setJsonBodyInput] = useState<string>("");
  const [autoDetectRequired, setAutoDetectRequired] = useState<boolean>(true);
  const [detectedSummary, setDetectedSummary] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: t, error: tErr } = await supabase.from("tools").select("*").eq("id", id).single();
      const { data: p } = await supabase.from("tool_parameters").select("*").eq("tool_id", id).order("name");

      if (t) {
        setName(t.name || "");
        setDescription(t.description || "");
        setToolType(t.tool_type || "REST_API");
        setIsEnabled(t.is_enabled ?? true);

        const config = t.configuration || {};
        setMethod(config.method || "POST");
        setEndpoint(config.endpoint || "");
        if (config.headers && Array.isArray(config.headers) && config.headers.length > 0) {
          setHeaders(config.headers);
        }
        if (config.sample_body) {
          setJsonBodyInput(typeof config.sample_body === "string" ? config.sample_body : JSON.stringify(config.sample_body, null, 2));
        }
      }

      if (p && p.length > 0) {
        setParams(
          p.map((item: any) => ({
            name: item.name,
            param_type: item.param_type || "string",
            is_required: item.is_required ?? false,
            description: item.description || ""
          }))
        );
      }
      setFetching(false);
    }
    load();
  }, [id]);

  // Helpers for parameters
  const addParam = () => {
    setParams([...params, { name: "", param_type: "string", description: "", is_required: true }]);
    setActiveTab("params");
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, key: keyof ToolParam, value: any) => {
    const updated = [...params];
    updated[index] = { ...updated[index], [key]: value };
    setParams(updated);
  };

  // Headers helper
  const addHeader = () => setHeaders([...headers, { key: "", value: "" }]);
  const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index));
  const updateHeader = (index: number, key: "key" | "value", value: string) => {
    const updated = [...headers];
    updated[index][key] = value;
    setHeaders(updated);
  };

  // Intelligent JSON Parameter Detector
  function detectParametersFromJson(replace: boolean = true) {
    if (!jsonBodyInput.trim()) {
      toast.error("Please enter a JSON sample body first");
      return;
    }

    try {
      const parsed = JSON.parse(jsonBodyInput);

      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        toast.error("JSON payload must be a JSON object (e.g. {\"field\": \"value\"})");
        return;
      }

      const detectedList: ToolParam[] = [];

      for (const [key, value] of Object.entries(parsed)) {
        let detectedType: ToolParam["param_type"] = "string";

        if (typeof value === "boolean") {
          detectedType = "boolean";
        } else if (typeof value === "number") {
          detectedType = "number";
        } else if (Array.isArray(value)) {
          detectedType = "array";
        } else if (value !== null && typeof value === "object") {
          detectedType = "object";
        }

        // Generate friendly description from key name
        const formattedKey = key
          .replace(/([A-Z])/g, " $1")
          .replace(/[_\-]/g, " ")
          .trim()
          .toLowerCase();
        const autoDescription = `The ${formattedKey} value for the API request`;

        detectedList.push({
          name: key,
          param_type: detectedType,
          is_required: autoDetectRequired,
          description: autoDescription
        });
      }

      if (detectedList.length === 0) {
        toast.error("No properties found in JSON object");
        return;
      }

      if (replace) {
        setParams(detectedList);
        toast.success(`Detected and imported ${detectedList.length} parameters from JSON!`);
      } else {
        // Merge: keep existing, append new ones that don't exist yet
        const existingNames = new Set(params.map(p => p.name));
        const newOnes = detectedList.filter(d => !existingNames.has(d.name));
        setParams([...params, ...newOnes]);
        toast.success(`Merged ${newOnes.length} new parameters into your schema!`);
      }

      setDetectedSummary(`Extracted ${detectedList.length} parameters successfully.`);
      setActiveTab("params");
    } catch (err: any) {
      toast.error(`Invalid JSON syntax: ${err.message}`);
    }
  }

  // Prettify JSON in editor
  function handleFormatJson() {
    try {
      const parsed = JSON.parse(jsonBodyInput);
      setJsonBodyInput(JSON.stringify(parsed, null, 2));
      toast.success("JSON formatted successfully");
    } catch (err: any) {
      toast.error(`Cannot format invalid JSON: ${err.message}`);
    }
  }

  // Load sample template for quick start
  function handleLoadSampleJson() {
    const sample = {
      department: "Gastroenterology",
      symptom: "Abdominal pain",
      appointment_date: "2026-10-25",
      is_urgent: false,
      max_results: 5
    };
    setJsonBodyInput(JSON.stringify(sample, null, 2));
    toast.info("Sample JSON payload loaded");
  }

  // Generate OpenAI / Gemini function call JSON schema
  function generateJsonSchema() {
    const properties: Record<string, any> = {};
    const requiredList: string[] = [];

    for (const p of params) {
      if (!p.name) continue;
      properties[p.name] = {
        type: p.param_type,
        description: p.description || `Parameter ${p.name}`
      };
      if (p.is_required) {
        requiredList.push(p.name);
      }
    }

    return {
      name: name || "tool_function",
      description: description || "Tool description for AI model",
      parameters: {
        type: "object",
        properties,
        required: requiredList
      }
    };
  }

  function handleCopySchema() {
    const schema = JSON.stringify(generateJsonSchema(), null, 2);
    navigator.clipboard.writeText(schema);
    setCopiedSchema(true);
    toast.success("AI Function Calling schema copied to clipboard!");
    setTimeout(() => setCopiedSchema(false), 2000);
  }

  // Submit Handler
  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) {
      toast.error("Tool name is required");
      return;
    }
    if (!endpoint.trim()) {
      toast.error("Endpoint URL is required");
      return;
    }

    setLoading(true);

    const validParams = params.filter(p => p.name.trim() !== "");
    const validHeaders = headers.filter(h => h.key.trim() !== "");

    let parsedSampleBody: any = null;
    if (jsonBodyInput.trim()) {
      try {
        parsedSampleBody = JSON.parse(jsonBodyInput);
      } catch {
        parsedSampleBody = jsonBodyInput;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      tool_type: toolType,
      is_enabled: isEnabled,
      configuration: {
        method,
        endpoint: endpoint.trim(),
        headers: validHeaders,
        sample_body: parsedSampleBody
      },
      parameters: validParams
    };

    try {
      await updateTool(id, payload);
      toast.success("Tool configuration saved successfully!");
      setLoading(false);
      router.push("/dashboard/tools");
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to save tool: ${err.message}`);
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this tool? This action cannot be undone.")) return;
    try {
      await deleteTool(id);
      toast.success("Tool deleted");
      router.push("/dashboard/tools");
    } catch (err: any) {
      toast.error(`Failed to delete tool: ${err.message}`);
    }
  }

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Loading tool configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tools">
            <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-700 hover:bg-zinc-800 shrink-0">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-mono">
                {name || "Configure Tool API"}
              </h1>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${
                method === "GET" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" :
                method === "POST" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                method === "PUT" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                method === "DELETE" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                "bg-purple-500/10 text-purple-400 border-purple-500/20"
              }`}>
                {method}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-0.5">Configure external REST endpoint and AI argument schema</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="text-xs text-zinc-400">Active</span>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <Button 
            type="button" 
            variant="outline" 
            onClick={handleDelete}
            className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-1.5 h-9"
          >
            <Delete02Icon className="h-4 w-4" /> Delete
          </Button>

          <Link href="/dashboard/tools">
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 h-9">
              Cancel
            </Button>
          </Link>

          <Button 
            onClick={() => handleSubmit()} 
            disabled={loading} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 h-9"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Main Configuration Card: Tool Metadata & Prompt Instruction */}
      <Card className="border-zinc-800 bg-[#0c0c0e]">
        <CardHeader className="border-b border-zinc-800/50 pb-4">
          <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
            <span>General Tool Settings</span>
          </CardTitle>
          <CardDescription className="text-zinc-400 text-xs">
            Tool identifier and instruction prompt provided to the LLM agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-zinc-300 text-xs font-medium">Tool Function Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. search_doctors" 
                className="bg-[#08080a] border-zinc-800 text-zinc-100 h-9 font-mono text-xs focus-visible:border-indigo-500" 
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="toolType" className="text-zinc-300 text-xs font-medium">Tool Type</Label>
              <select 
                id="toolType" 
                value={toolType}
                onChange={(e) => setToolType(e.target.value)}
                className="appearance-none w-full h-9 px-3 bg-[#08080a] border border-zinc-800 text-zinc-100 rounded-md focus:outline-none focus:border-indigo-500 text-xs"
              >
                <option value="REST_API">REST API Endpoint</option>
                <option value="FUNCTION">Internal Webhook / Function</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-zinc-300 text-xs font-medium">
                AI Instruction Description <span className="text-red-500">*</span>
              </Label>
              <span className="text-[11px] text-zinc-500">Explains when and why the AI should execute this tool</span>
            </div>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="e.g. Call this tool when the user inquires about doctors, specialties, or doctor schedules..." 
              rows={2} 
              className="bg-[#08080a] border-zinc-800 text-zinc-100 text-xs leading-relaxed focus-visible:border-indigo-500 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* HTTP Request & Endpoint Bar (Swagger / Postman style) */}
      <Card className="border-zinc-800 bg-[#0c0c0e]">
        <CardHeader className="border-b border-zinc-800/50 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
                <GlobeIcon className="w-4 h-4 text-indigo-400" />
                <span>HTTP Request Details</span>
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs mt-0.5">
                Target server URL and method where incoming parameters will be dispatched.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          {/* Method + URL Input Row */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-10 px-3 bg-[#08080a] border border-zinc-800 text-zinc-100 font-semibold rounded-lg sm:w-32 text-xs focus:outline-none focus:border-indigo-500"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <div className="relative flex-1">
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.yourdomain.com/v1/doctors/search"
                className="h-10 bg-[#08080a] border-zinc-800 text-zinc-100 font-mono text-xs pl-3 pr-4 focus-visible:border-indigo-500"
              />
            </div>
          </div>

          {/* Headers Expander */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">Request Headers ({headers.length})</span>
              <Button type="button" variant="ghost" size="sm" onClick={addHeader} className="h-6 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800/60">
                + Add Header
              </Button>
            </div>

            <div className="space-y-2">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Key (e.g. Authorization)"
                    value={h.key}
                    onChange={(e) => updateHeader(i, "key", e.target.value)}
                    className="h-8 bg-[#08080a] border-zinc-800 font-mono text-xs text-zinc-200 flex-1"
                  />
                  <Input
                    placeholder="Value (e.g. Bearer token)"
                    value={h.value}
                    onChange={(e) => updateHeader(i, "value", e.target.value)}
                    className="h-8 bg-[#08080a] border-zinc-800 font-mono text-xs text-zinc-200 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHeader(i)}
                    className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50"
                  >
                    <Delete02Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PARAMETERS SECTION (The Centerpiece UX) */}
      <Card className="border-zinc-800 bg-[#0c0c0e]">
        {/* Navigation Tabs Header */}
        <div className="border-b border-zinc-800/50 px-6 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 border-b border-transparent">
            <button
              type="button"
              onClick={() => setActiveTab("params")}
              className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "params"
                  ? "border-indigo-500 text-indigo-400 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>Parameters Builder</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-300">
                {params.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("autodetect")}
              className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "autodetect"
                  ? "border-emerald-500 text-emerald-400 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <AiMagicIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Detect from JSON Body</span>
              <span className="px-1.5 py-0.2 text-[9px] uppercase tracking-wider font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Smart UX
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("schema")}
              className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "schema"
                  ? "border-indigo-500 text-indigo-400 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <CodeIcon className="w-3.5 h-3.5" />
              <span>AI Schema Preview</span>
            </button>
          </div>

          {/* Quick Tab Actions */}
          <div className="pb-3 flex items-center gap-2">
            {activeTab === "params" && (
              <Button
                type="button"
                onClick={addParam}
                size="sm"
                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                <Add01Icon className="w-3.5 h-3.5" />
                Add Parameter
              </Button>
            )}

            {activeTab === "schema" && (
              <Button
                type="button"
                onClick={handleCopySchema}
                variant="outline"
                size="sm"
                className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white gap-1.5"
              >
                {copiedSchema ? <CheckmarkCircle02Icon className="w-3.5 h-3.5 text-emerald-400" /> : <Copy01Icon className="w-3.5 h-3.5" />}
                {copiedSchema ? "Copied" : "Copy Schema"}
              </Button>
            )}
          </div>
        </div>

        {/* Tab 1: Visual Parameters Builder */}
        {activeTab === "params" && (
          <CardContent className="pt-6">
            {params.length === 0 ? (
              <div className="p-10 text-center rounded-xl border border-dashed border-zinc-800 bg-[#08080a] space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
                  <SparklesIcon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">No Parameters Configured</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    Define arguments manually or paste a JSON request body to auto-extract every parameter instantly.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={() => setActiveTab("autodetect")}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <AiMagicIcon className="w-3.5 h-3.5" /> Auto-Detect from JSON Body
                  </Button>
                  <Button
                    type="button"
                    onClick={addParam}
                    variant="outline"
                    className="h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
                  >
                    <Add01Icon className="w-3.5 h-3.5" /> Add Manually
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800/80 text-zinc-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 pl-2 font-medium">Parameter Name</th>
                      <th className="pb-3 px-3 font-medium w-36">Type</th>
                      <th className="pb-3 px-3 font-medium w-28 text-center">Required</th>
                      <th className="pb-3 px-3 font-medium">Description for AI Model</th>
                      <th className="pb-3 pr-2 text-right font-medium w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {params.map((param, index) => (
                      <tr key={index} className="hover:bg-zinc-900/30 transition-colors">
                        {/* Name */}
                        <td className="py-2.5 pl-2">
                          <Input
                            value={param.name}
                            onChange={(e) => updateParam(index, "name", e.target.value)}
                            placeholder="e.g. department"
                            className="h-8 bg-[#08080a] border-zinc-800 text-zinc-100 font-mono text-xs focus-visible:border-indigo-500"
                          />
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3">
                          <select
                            value={param.param_type}
                            onChange={(e) => updateParam(index, "param_type", e.target.value)}
                            className="h-8 w-full px-2.5 bg-[#08080a] border border-zinc-800 text-zinc-200 rounded-md text-xs focus:outline-none focus:border-indigo-500"
                          >
                            <option value="string">string</option>
                            <option value="number">number</option>
                            <option value="boolean">boolean</option>
                            <option value="array">array</option>
                            <option value="object">object</option>
                          </select>
                        </td>

                        {/* Required Toggle */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => updateParam(index, "is_required", !param.is_required)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                              param.is_required
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-zinc-800/50 text-zinc-400 border-zinc-700/60 hover:bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {param.is_required ? "Required" : "Optional"}
                          </button>
                        </td>

                        {/* Description */}
                        <td className="py-2.5 px-3">
                          <Input
                            value={param.description}
                            onChange={(e) => updateParam(index, "description", e.target.value)}
                            placeholder="Describe how the AI should formulate this argument..."
                            className="h-8 bg-[#08080a] border-zinc-800 text-zinc-200 text-xs focus-visible:border-indigo-500"
                          />
                        </td>

                        {/* Remove Action */}
                        <td className="py-2.5 pr-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeParam(index)}
                            className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Delete02Icon className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between pt-4 mt-2 border-t border-zinc-800/60">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addParam}
                    className="h-7 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800/60 gap-1.5"
                  >
                    <Add01Icon className="w-3.5 h-3.5" /> Add Another Parameter
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Clear all parameters?")) setParams([]);
                    }}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        )}

        {/* Tab 2: Auto-Detect from JSON Body (Requested Killer Feature) */}
        {activeTab === "autodetect" && (
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
              <div className="flex items-start gap-2.5">
                <InformationCircleIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-zinc-200">Instant Parameter Detection</p>
                  <p className="text-zinc-400 mt-0.5">
                    Paste your API request body JSON. The engine inspects every key, determines the data type (string, number, boolean, array), and generates descriptions automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadSampleJson}
                  className="h-7 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Load Example
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFormatJson}
                  className="h-7 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Format JSON
                </Button>
              </div>
            </div>

            {/* Monaco-style Code Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <Label htmlFor="jsonBody" className="text-zinc-300 font-medium">Sample Request Body (JSON)</Label>
                <span className="text-zinc-500 font-mono text-[11px]">application/json</span>
              </div>
              <Textarea
                id="jsonBody"
                value={jsonBodyInput}
                onChange={(e) => setJsonBodyInput(e.target.value)}
                placeholder={`{\n  "patient_name": "Rahim Ahmed",\n  "department": "Gastroenterology",\n  "appointment_date": "2026-10-25",\n  "is_emergency": false,\n  "max_cost": 5000\n}`}
                rows={9}
                className="bg-[#08080a] border-zinc-800 text-emerald-400/90 font-mono text-xs leading-relaxed focus-visible:border-emerald-500 resize-none p-3.5"
              />
            </div>

            {/* Detection Controls & Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="detectReq"
                  checked={autoDetectRequired}
                  onChange={(e) => setAutoDetectRequired(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-0"
                />
                <Label htmlFor="detectReq" className="text-xs text-zinc-300 cursor-pointer">
                  Mark all detected parameters as <span className="font-semibold text-emerald-400">Required</span> by default
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => detectParametersFromJson(false)}
                  className="h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Merge into Existing
                </Button>

                <Button
                  type="button"
                  onClick={() => detectParametersFromJson(true)}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-md shadow-emerald-950/40"
                >
                  <AiMagicIcon className="w-3.5 h-3.5" />
                  Auto-Detect & Replace All
                </Button>
              </div>
            </div>

            {detectedSummary && (
              <p className="text-xs text-emerald-400 font-medium pt-1">
                ✓ {detectedSummary}
              </p>
            )}
          </CardContent>
        )}

        {/* Tab 3: AI Schema Preview */}
        {activeTab === "schema" && (
          <CardContent className="pt-6 space-y-4">
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
              This is the exact JSON function definition passed to LLMs (OpenAI / Groq / Gemini) during tool execution.
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-[#08080a] border border-zinc-800 text-zinc-300 font-mono text-xs overflow-x-auto leading-relaxed max-h-96">
                {JSON.stringify(generateJsonSchema(), null, 2)}
              </pre>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Floating Bottom Save Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 py-3 px-8 bg-[#09090b]/95 border-t border-zinc-800 backdrop-blur flex items-center justify-between z-20">
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Endpoint: <strong className="font-mono text-zinc-200">{method} {endpoint ? new URL(endpoint.startsWith('http') ? endpoint : `https://${endpoint}`).pathname : "/"}</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/tools">
            <Button type="button" variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-white">
              Cancel
            </Button>
          </Link>
          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading}
            size="sm"
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-5 h-8 font-medium shadow-md"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

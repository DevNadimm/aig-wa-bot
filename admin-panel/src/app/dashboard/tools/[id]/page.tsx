"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft01Icon,
  Add01Icon,
  Delete02Icon,
  AiMagicIcon,
  Copy01Icon,
  CheckmarkCircle02Icon,
} from "hugeicons-react";
import { updateTool, deleteTool } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ToolParam {
  name: string;
  param_type: string;
  is_required: boolean;
  description: string;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

export default function ConfigureToolPage() {
  const router = useRouter();
  const paramsHook = useParams();
  const id = paramsHook.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toolType, setToolType] = useState("REST_API");
  const [isEnabled, setIsEnabled] = useState(true);
  const [method, setMethod] = useState("POST");
  const [endpoint, setEndpoint] = useState("");
  const [params, setParams] = useState<ToolParam[]>([]);

  // Auto-detect JSON
  const [jsonBodyInput, setJsonBodyInput] = useState("");
  const [showAutoDetect, setShowAutoDetect] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: t } = await supabase.from("tools").select("*").eq("id", id).single();
      const { data: p } = await supabase.from("tool_parameters").select("*").eq("tool_id", id).order("name");

      if (t) {
        setName(t.name || "");
        setDescription(t.description || "");
        setToolType(t.tool_type || "REST_API");
        setIsEnabled(t.is_enabled ?? true);
        setMethod(t.configuration?.method || "POST");
        setEndpoint(t.configuration?.endpoint || "");
        if (t.configuration?.sample_body) {
          setJsonBodyInput(
            typeof t.configuration.sample_body === "string"
              ? t.configuration.sample_body
              : JSON.stringify(t.configuration.sample_body, null, 2)
          );
        }
      }

      if (p && p.length > 0) {
        setParams(
          p.map((item: any) => ({
            name: item.name,
            param_type: item.param_type || "string",
            is_required: item.is_required ?? false,
            description: item.description || "",
          }))
        );
      }
      setFetching(false);
    }
    load();
  }, [id]);

  // Parameter helpers
  const addParam = () =>
    setParams([...params, { name: "", param_type: "string", description: "", is_required: true }]);
  const removeParam = (index: number) => setParams(params.filter((_, i) => i !== index));
  const updateParam = (index: number, key: keyof ToolParam, value: any) => {
    const updated = [...params];
    updated[index] = { ...updated[index], [key]: value };
    setParams(updated);
  };

  // Auto-detect from JSON body
  function detectParametersFromJson() {
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

      const detected: ToolParam[] = [];
      for (const [key, value] of Object.entries(parsed)) {
        let detectedType = "string";
        if (typeof value === "boolean") detectedType = "boolean";
        else if (typeof value === "number") detectedType = "number";
        else if (Array.isArray(value)) detectedType = "array";
        else if (value !== null && typeof value === "object") detectedType = "object";

        const label = key.replace(/([A-Z])/g, " $1").replace(/[_\-]/g, " ").trim().toLowerCase();
        detected.push({
          name: key,
          param_type: detectedType,
          is_required: true,
          description: `The ${label} value`,
        });
      }

      if (detected.length === 0) {
        toast.error("No properties found in JSON object");
        return;
      }
      setParams(detected);
      setShowAutoDetect(false);
      toast.success(`Detected ${detected.length} parameters from JSON body`);
    } catch (err: any) {
      toast.error(`Invalid JSON: ${err.message}`);
    }
  }

  // Generate AI schema preview
  function generateJsonSchema() {
    const properties: Record<string, any> = {};
    const requiredList: string[] = [];
    for (const p of params) {
      if (!p.name) continue;
      properties[p.name] = { type: p.param_type, description: p.description || `Parameter ${p.name}` };
      if (p.is_required) requiredList.push(p.name);
    }
    return {
      name: name || "tool_function",
      description: description || "Tool description",
      parameters: { type: "object", properties, required: requiredList },
    };
  }

  function handleCopySchema() {
    navigator.clipboard.writeText(JSON.stringify(generateJsonSchema(), null, 2));
    setCopiedSchema(true);
    toast.success("Function calling schema copied!");
    setTimeout(() => setCopiedSchema(false), 2000);
  }

  // Submit
  async function handleSubmit() {
    if (!name.trim()) return toast.error("Tool name is required");
    if (!endpoint.trim()) return toast.error("Endpoint URL is required");

    setLoading(true);
    let parsedSampleBody: any = null;
    if (jsonBodyInput.trim()) {
      try {
        parsedSampleBody = JSON.parse(jsonBodyInput);
      } catch {
        parsedSampleBody = jsonBodyInput;
      }
    }

    try {
      await updateTool(id, {
        name: name.trim(),
        description: description.trim(),
        tool_type: toolType,
        is_enabled: isEnabled,
        configuration: { method, endpoint: endpoint.trim(), sample_body: parsedSampleBody },
        parameters: params.filter((p) => p.name.trim() !== ""),
      });
      toast.success("Tool saved successfully");
      router.push("/dashboard/tools");
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this tool?")) return;
    try {
      await deleteTool(id);
      toast.success("Tool deleted");
      router.push("/dashboard/tools");
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    }
  }

  if (fetching)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Loading tool configuration...
        </div>
      </div>
    );

  return (
    <div className="space-y-6 pb-12">
      {/* ── Standard Page Header ── */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tools">
            <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-700 hover:bg-zinc-800 shrink-0">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Configure Tool
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2"
          >
            <Delete02Icon className="h-4 w-4" /> Delete
          </Button>
          <div className="w-px h-6 bg-zinc-800 mx-1" />
          <Link href="/dashboard/tools">
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* ── Section 1: General ── */}
      <div className="space-y-5 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-6">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">General Settings</h3>
          <p className="text-sm text-zinc-500 mt-0.5">Tool identifier and prompt instruction for the AI agent.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm font-medium">
              Tool Function Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. search_doctors"
              className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 font-mono text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm font-medium">Tool Type</Label>
            <select
              value={toolType}
              onChange={(e) => setToolType(e.target.value)}
              className="appearance-none w-full h-10 pl-3 pr-10 bg-[#0c0c0e] border border-zinc-800 text-zinc-100 rounded-lg focus:outline-none focus:border-indigo-500 text-sm bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundPosition: "right 12px center",
                backgroundSize: "16px",
              }}
            >
              <option value="REST_API">REST API Endpoint</option>
              <option value="FUNCTION">Internal Function</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-300 text-sm font-medium">
            AI Instruction Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain to the AI when and how to use this tool..."
            rows={3}
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-sans text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 resize-none"
          />
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-zinc-800/50">
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-200">Enable Tool</p>
            <p className="text-xs text-zinc-500 mt-0.5">AI agents can only call active tools.</p>
          </div>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>
      </div>

      {/* ── Section 2: HTTP Request ── */}
      <div className="space-y-5 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-6">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">HTTP Request</h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            The API endpoint and method that receives parameter data from AI function calls.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-10 px-3 bg-[#0c0c0e] border border-zinc-800 text-zinc-100 rounded-lg sm:w-32 text-sm font-semibold focus:outline-none focus:border-indigo-500"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <Input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://api.yourdomain.com/v1/resource"
            className="flex-1 h-10 bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-mono text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* ── Section 3: Parameters ── */}
      <div className="space-y-5 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-zinc-100">Parameters</h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              Define arguments the AI must provide when calling this tool.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAutoDetect(!showAutoDetect)}
              className={`gap-1.5 text-xs border-zinc-700 ${
                showAutoDetect
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <AiMagicIcon className="h-3.5 w-3.5" />
              Auto-Detect from JSON
            </Button>
            <Button
              type="button"
              onClick={addParam}
              size="sm"
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Add01Icon className="h-3.5 w-3.5" />
              Add Parameter
            </Button>
          </div>
        </div>

        {/* Auto-Detect Panel (collapsible) */}
        {showAutoDetect && (
          <div className="space-y-4 p-4 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-start gap-2.5">
              <AiMagicIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-zinc-200">Paste your API request body</p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Every JSON key will be extracted as a parameter with its data type auto-detected.
                </p>
              </div>
            </div>

            <Textarea
              value={jsonBodyInput}
              onChange={(e) => setJsonBodyInput(e.target.value)}
              placeholder={`{\n  "department": "Gastroenterology",\n  "symptom": "Abdominal pain",\n  "is_emergency": false,\n  "max_results": 5\n}`}
              rows={7}
              className="bg-[#0c0c0e] border-zinc-800 text-emerald-400/90 font-mono text-sm leading-relaxed focus-visible:border-emerald-500 resize-none"
            />

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  try {
                    setJsonBodyInput(JSON.stringify(JSON.parse(jsonBodyInput), null, 2));
                    toast.success("JSON formatted");
                  } catch (e: any) {
                    toast.error(`Invalid JSON: ${e.message}`);
                  }
                }}
                className="text-xs border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              >
                Format
              </Button>
              <Button
                type="button"
                onClick={detectParametersFromJson}
                size="sm"
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <AiMagicIcon className="w-3.5 h-3.5" />
                Detect & Import Parameters
              </Button>
            </div>
          </div>
        )}

        {/* Parameters Table */}
        {params.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-zinc-800 bg-[#0c0c0e]/50 rounded-xl">
            <div className="w-12 h-12 bg-zinc-800/50 rounded-full flex items-center justify-center mb-3">
              <AiMagicIcon className="w-5 h-5 text-zinc-500" />
            </div>
            <h3 className="text-sm font-medium text-zinc-200">No Parameters Configured</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Add parameters manually or paste a JSON body to auto-extract them.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {params.map((param, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-[#0c0c0e] rounded-lg border border-zinc-800/50"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1">
                  {/* Name */}
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Name</Label>
                    <Input
                      value={param.name}
                      onChange={(e) => updateParam(index, "name", e.target.value)}
                      placeholder="e.g. department"
                      className="h-9 bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-mono text-sm focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Type</Label>
                    <select
                      value={param.param_type}
                      onChange={(e) => updateParam(index, "param_type", e.target.value)}
                      className="flex h-9 w-full items-center rounded-md border border-zinc-800 bg-[#0c0c0e] px-3 py-1 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="array">array</option>
                      <option value="object">object</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-zinc-400">Description</Label>
                    <Input
                      value={param.description}
                      onChange={(e) => updateParam(index, "description", e.target.value)}
                      placeholder="Explain this parameter to the AI..."
                      className="h-9 bg-[#0c0c0e] border-zinc-800 text-zinc-200 text-sm focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Required + Delete */}
                <div className="flex flex-col items-center gap-2 pt-5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateParam(index, "is_required", !param.is_required)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                      param.is_required
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    {param.is_required ? "Required" : "Optional"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeParam(index)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Delete02Icon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add Another */}
            <button
              type="button"
              onClick={addParam}
              className="w-full py-2.5 rounded-lg border border-dashed border-zinc-800 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/30 transition-colors"
            >
              + Add Another Parameter
            </button>
          </div>
        )}
      </div>

      {/* ── Section 4: AI Function Schema Preview ── */}
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-zinc-100">AI Function Schema Preview</h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              The JSON definition sent to LLMs (OpenAI / Groq / Gemini) during function calling.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopySchema}
            className="gap-1.5 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            {copiedSchema ? (
              <CheckmarkCircle02Icon className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy01Icon className="h-3.5 w-3.5" />
            )}
            {copiedSchema ? "Copied" : "Copy Schema"}
          </Button>
        </div>

        <pre className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-zinc-300 font-mono text-xs overflow-x-auto leading-relaxed max-h-72">
          {JSON.stringify(generateJsonSchema(), null, 2)}
        </pre>
      </div>
    </div>
  );
}

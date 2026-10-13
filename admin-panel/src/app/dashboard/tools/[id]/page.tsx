"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  // Auto-detect JSON state
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
    <div className="space-y-6">
      {/* ── Standard Page Header matching IntentForm / AgentForm ── */}
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
          <div className="flex items-center gap-2.5 h-9 px-3 rounded-lg border border-zinc-800 bg-[#0c0c0e]">
            <span className="text-sm font-medium text-zinc-300">Active</span>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} size="sm" />
          </div>

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

      {/* ── Form matching exact IntentForm / ToolForm layout ── */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">

        {/* Tool Name & Type grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">
              Tool Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. search_doctors"
              required
              className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 font-mono text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tool_type" className="text-zinc-300 text-sm font-medium">
              Tool Type <span className="text-red-500">*</span>
            </Label>
            <Select
              id="tool_type"
              value={toolType}
              onChange={(e) => setToolType(e.target.value)}
            >
              <option value="REST_API">REST API Endpoint</option>
              <option value="FUNCTION">Internal Function</option>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-zinc-300 text-sm font-medium">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain to the AI when and how to use this tool..."
            rows={4}
            required
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-sans text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 resize-none"
          />
        </div>

        {/* API Endpoint Card (p-4 matching IntentForm card) */}
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-4">
          <div>
            <h3 className="text-sm font-medium text-zinc-100">API Endpoint</h3>
            <p className="text-sm text-zinc-500">Specify the HTTP method and destination URL for this tool.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="sm:w-32 font-semibold"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.yourdomain.com/v1/resource"
              required
              className="flex-1 h-10 bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-mono text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Parameters Card (p-4 matching IntentForm card) */}
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-zinc-100">Parameters</h3>
              <p className="text-sm text-zinc-500">
                Define arguments the AI must provide when calling this tool.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAutoDetect(!showAutoDetect)}
                className={`gap-1.5 text-xs border-zinc-700 h-8 ${
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
                className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white h-8"
              >
                <Add01Icon className="h-3.5 w-3.5" />
                Add Parameter
              </Button>
            </div>
          </div>

          {/* Auto-Detect Panel (collapsible) */}
          {showAutoDetect && (
            <div className="space-y-3 p-3.5 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-start gap-2.5">
                <AiMagicIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-zinc-200">Paste your API request body (JSON)</p>
                  <p className="text-zinc-400 mt-0.5">
                    Every JSON key will be extracted as a parameter with its data type auto-detected.
                  </p>
                </div>
              </div>

              <Textarea
                value={jsonBodyInput}
                onChange={(e) => setJsonBodyInput(e.target.value)}
                placeholder={`{\n  "department": "Gastroenterology",\n  "symptom": "Abdominal pain",\n  "is_emergency": false,\n  "max_results": 5\n}`}
                rows={6}
                className="bg-[#0c0c0e] border-zinc-800 text-emerald-400/90 font-mono text-xs leading-relaxed focus-visible:border-emerald-500 resize-none"
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
                  className="h-7 text-xs border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                >
                  Format
                </Button>
                <Button
                  type="button"
                  onClick={detectParametersFromJson}
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <AiMagicIcon className="w-3.5 h-3.5" />
                  Detect & Import Parameters
                </Button>
              </div>
            </div>
          )}

          {/* Parameters Table */}
          <Table withBorder={true}>
            <TableHeader>
              <TableRow className="border-zinc-800/50 hover:bg-transparent">
                <TableHead className="text-zinc-400 font-medium text-xs w-[200px]">Parameter Name</TableHead>
                <TableHead className="text-zinc-400 font-medium text-xs w-[130px]">Type</TableHead>
                <TableHead className="text-zinc-400 font-medium text-xs w-[100px] text-center">Required</TableHead>
                <TableHead className="text-zinc-400 font-medium text-xs">Description for AI Agent</TableHead>
                <TableHead className="text-right text-zinc-400 font-medium text-xs w-[60px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {params.length === 0 ? (
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableCell colSpan={5} className="py-8 text-center text-zinc-500 text-xs">
                    No parameters configured. Click &quot;Add Parameter&quot; or use &quot;Auto-Detect from JSON&quot; above.
                  </TableCell>
                </TableRow>
              ) : (
                params.map((param, index) => (
                  <TableRow key={index} className="border-zinc-800/50 hover:bg-zinc-900/40">
                    {/* Name */}
                    <TableCell className="p-2">
                      <Input
                        value={param.name}
                        onChange={(e) => updateParam(index, "name", e.target.value)}
                        placeholder="e.g. department"
                        className="h-8 bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-mono text-xs focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                      />
                    </TableCell>

                    {/* Type */}
                    <TableCell className="p-2">
                      <Select
                        sizeVariant="sm"
                        value={param.param_type}
                        onChange={(e) => updateParam(index, "param_type", e.target.value)}
                        className="font-mono"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="array">array</option>
                        <option value="object">object</option>
                      </Select>
                    </TableCell>

                    {/* Required */}
                    <TableCell className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => updateParam(index, "is_required", !param.is_required)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                          param.is_required
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-zinc-800/60 text-zinc-500 border-zinc-700/60 hover:text-zinc-400"
                        }`}
                      >
                        {param.is_required ? "Required" : "Optional"}
                      </button>
                    </TableCell>

                    {/* Description */}
                    <TableCell className="p-2">
                      <Input
                        value={param.description}
                        onChange={(e) => updateParam(index, "description", e.target.value)}
                        placeholder="Explain this parameter to the AI..."
                        className="h-8 bg-[#0c0c0e] border-zinc-800 text-zinc-100 text-xs focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                      />
                    </TableCell>

                    {/* Action */}
                    <TableCell className="p-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParam(index)}
                        className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Delete02Icon className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

        </div>

        {/* AI Function Schema Preview Card (p-4 matching IntentForm card) */}
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-zinc-100">AI Function Schema Preview</h3>
              <p className="text-sm text-zinc-500">
                JSON schema passed to AI models during function calling.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySchema}
              className="gap-1.5 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-8"
            >
              {copiedSchema ? (
                <CheckmarkCircle02Icon className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy01Icon className="h-3.5 w-3.5" />
              )}
              {copiedSchema ? "Copied" : "Copy Schema"}
            </Button>
          </div>

          <pre className="p-3.5 rounded-lg bg-[#08080a] border border-zinc-800 text-zinc-300 font-mono text-xs overflow-x-auto leading-relaxed max-h-60">
            {JSON.stringify(generateJsonSchema(), null, 2)}
          </pre>
        </div>

      </form>
    </div>
  );
}

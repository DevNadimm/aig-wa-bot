"use client";

import { useState, useEffect } from"react";
import { useRouter, useParams } from"next/navigation";
import Link from"next/link";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Label } from"@/components/ui/label";
import { Switch } from"@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { ArrowLeft01Icon, Add01Icon, Delete02Icon } from "hugeicons-react";
import { updateTool, deleteTool } from"../actions";
import { createClient } from"@/lib/supabase/client";

export default function EditToolPage() {
  const router = useRouter();
  const paramsHook = useParams();
  const id = paramsHook.id as string;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [tool, setTool] = useState<any>(null);
  const [params, setParams] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: t } = await supabase.from("tools").select("*").eq("id", id).single();
      const { data: p } = await supabase.from("tool_parameters").select("*").eq("tool_id", id);
      
      setTool(t);
      setParams(p || []);
      setFetching(false);
    }
    load();
  }, [id]);

  const addParam = () => setParams([...params, { name:"", param_type:"string", description:"", is_required: true }]);
  const removeParam = (index: number) => setParams(params.filter((_, i) => i !== index));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: tool.name,
      description: tool.description,
      tool_type: tool.tool_type,
      is_enabled: formData.get("is_enabled") ==="on",
      configuration: {
        method: formData.get("method"),
        endpoint: formData.get("endpoint"),
      },
      parameters: params.filter(p => p.name.trim() !=="")
    };

    try {
      await updateTool(id, data);
      router.push("/dashboard/tools");
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this tool?")) return;
    try {
      await deleteTool(id);
      router.push("/dashboard/tools");
    } catch (error) {
      console.error(error);
    }
  }

  if (fetching) return <div className="p-10 text-center text-zinc-500">Loading...</div>;
  if (!tool) return <div className="p-10 text-center text-red-500">Tool not found</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tools">
            <Button variant="outline" size="icon">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Configure Tool API</h1>
            <p className="text-zinc-400 text-sm mt-1">{tool.name}</p>
          </div>
        </div>
        
      </div>

      <form onSubmit={onSubmit}>
        <Card className="border-zinc-800 bg-[#0c0c0e] mt-6">
          <CardHeader className="border-b border-zinc-800/50 pb-6">
            <CardTitle className="text-lg text-zinc-100">API Configuration</CardTitle>
            <CardDescription className="text-zinc-400">Set the HTTP method and endpoint URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="method" className="text-zinc-200 font-medium text-sm">HTTP Method</Label>
              </div>
              <div className="col-span-2">
                <select 
                  id="method" 
                  name="method" 
                  defaultValue={tool.configuration?.method ||"GET"}
                  className="w-full h-10 px-3 py-2 bg-[#121214] border border-zinc-700 text-zinc-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
            </div>

            <hr className="border-zinc-800/50" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="endpoint" className="text-zinc-200 font-medium text-sm">Endpoint URL</Label>
                <p className="text-zinc-500 text-sm mt-1">Full URL to the API.</p>
              </div>
              <div className="col-span-2">
                <Input id="endpoint" name="endpoint" defaultValue={tool.configuration?.endpoint} required className="bg-[#121214] border-zinc-700 text-zinc-100 font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-[#0c0c0e] mt-6">
          <CardHeader className="border-b border-zinc-800/50 pb-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-zinc-100">Parameters</CardTitle>
              <CardDescription className="text-zinc-400">Define arguments the AI must pass.</CardDescription>
            </div>
            <Button type="button" onClick={addParam} variant="outline" size="sm">
              <Add01Icon className="w-4 h-4 mr-1" /> Add Parameter
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {params.map((param, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-[#121214] rounded-lg border border-zinc-800/50">
                  <div className="grid grid-cols-4 gap-4 flex-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Name</Label>
                      <Input 
                        value={param.name}
                        onChange={(e) => {
                          const newParams = [...params];
                          newParams[index].name = e.target.value;
                          setParams(newParams);
                        }}
                        className="h-8 bg-zinc-900 border-zinc-700 text-zinc-200" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Type</Label>
                      <select 
                        value={param.param_type}
                        onChange={(e) => {
                          const newParams = [...params];
                          newParams[index].param_type = e.target.value;
                          setParams(newParams);
                        }}
                        className="flex h-8 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-200"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                      </select>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-zinc-400">Description</Label>
                      <Input 
                        value={param.description}
                        onChange={(e) => {
                          const newParams = [...params];
                          newParams[index].description = e.target.value;
                          setParams(newParams);
                        }}
                        className="h-8 bg-zinc-900 border-zinc-700 text-zinc-200" 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 pt-6">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[10px] uppercase text-zinc-400">Req</Label>
                      <input 
                        type="checkbox" 
                        checked={param.is_required}
                        onChange={(e) => {
                          const newParams = [...params];
                          newParams[index].is_required = e.target.checked;
                          setParams(newParams);
                        }}
                      />
                    </div>
                    <button type="button" onClick={() => removeParam(index)} className="text-zinc-500 hover:text-red-400 transition-colors">
                      <Delete02Icon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {params.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">No parameters defined. The AI will call this API without arguments.</p>
              )}
            </div>
          </CardContent>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-[#09090b] rounded-b-xl">
            <Link href="/dashboard/tools">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ?"Saving..." :"Save Changes"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}




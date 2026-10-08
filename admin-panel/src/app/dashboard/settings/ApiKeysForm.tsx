"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key01Icon, FloppyDiskIcon, ViewIcon, ViewOffSlashIcon, PlusSignIcon, Delete01Icon, Link01Icon } from "hugeicons-react";
import { updateApiKeys } from "./actions";

// ── Provider configuration ────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: "groq",
    label: "Groq",
    description: "Fast, free LLaMA-3 models. Recommended.",
    placeholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
    badge: "FREE · FAST",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    icon: "⚡",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "One key, many free models (Llama, Gemma, Mistral…).",
    placeholder: "sk-or-v1-...",
    docsUrl: "https://openrouter.ai/keys",
    badge: "FREE",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    icon: "🌐",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    description: "Official Gemini API. Free tier has strict rate limits.",
    placeholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/apikey",
    badge: "RATE LIMITED",
    badgeColor: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    icon: "✦",
  },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

// ── Component ─────────────────────────────────────────────────────────────────
export function ApiKeysForm({ bot }: { bot: any }) {
  const [isPending, startTransition] = useTransition();

  const getInitialProvider = (): ProviderId => {
    const p = bot?.llm_provider as ProviderId | undefined;
    return PROVIDERS.some((pr) => pr.id === p) ? (p as ProviderId) : "groq";
  };

  const getInitialKeys = (): string[] => {
    if (!bot?.llm_api_key) return [""];
    try {
      if (bot.llm_api_key.trim().startsWith("[")) return JSON.parse(bot.llm_api_key);
      return bot.llm_api_key.split(",").map((k: string) => k.trim()).filter(Boolean);
    } catch {
      return [bot.llm_api_key];
    }
  };

  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(getInitialProvider());
  const [keys, setKeys] = useState<string[]>(getInitialKeys());
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});
  const [message, setMessage] = useState({ type: "", text: "" });

  const activeProvider = PROVIDERS.find((p) => p.id === selectedProvider)!;

  const handleProviderChange = (id: ProviderId) => {
    setSelectedProvider(id);
    if (id === getInitialProvider()) {
      setKeys(getInitialKeys());
    } else {
      setKeys([""]);
    }
    setShowKey({});
    setMessage({ type: "", text: "" });
  };

  const handleKeyChange = (index: number, value: string) => {
    const newKeys = [...keys];
    newKeys[index] = value;
    setKeys(newKeys);
  };

  const handleAddKey = () => setKeys([...keys, ""]);

  const handleRemoveKey = (index: number) => {
    const newKeys = [...keys];
    newKeys.splice(index, 1);
    if (newKeys.length === 0) newKeys.push("");
    setKeys(newKeys);
  };

  const handleSave = () => {
    startTransition(async () => {
      setMessage({ type: "", text: "" });
      const validKeys = keys.filter((k) => k.trim() !== "");
      const saveValue = validKeys.length > 0 ? JSON.stringify(validKeys) : "";
      const result = await updateApiKeys(bot.id, saveValue, selectedProvider);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `Saved! Now using ${activeProvider.label}.` });
        setTimeout(() => setMessage({ type: "", text: "" }), 4000);
      }
    });
  };

  if (!bot) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-800 bg-[#0c0c0e]/50 rounded-xl">
        <h3 className="text-zinc-200 font-medium text-lg">No Bot Found</h3>
        <p className="text-sm text-zinc-500 mt-2 max-w-md">Please create a bot instance first.</p>
      </div>
    );
  }

  return (
    <Card className="border-zinc-800 bg-[#0c0c0e]">
      <CardHeader className="border-b border-zinc-800/50">
        <CardTitle className="text-lg text-zinc-100 flex items-center gap-2">
          <Key01Icon className="w-5 h-5 text-indigo-400" /> AI Provider & API Key
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Choose your AI provider and enter your API key. Multiple keys are supported for
          automatic fallback if one key is rate-limited.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* ── Provider Selector ── */}
        <div className="space-y-3">
          <Label className="text-xs text-zinc-400 uppercase tracking-wider">Select Provider</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map((provider) => {
              const isActive = selectedProvider === provider.id;
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleProviderChange(provider.id)}
                  className={`relative flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all ${
                    isActive
                      ? "border-indigo-500/60 bg-indigo-500/8 ring-1 ring-indigo-500/40"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-lg">{provider.icon}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${provider.badgeColor}`}
                    >
                      {provider.badge}
                    </span>
                  </div>
                  <span className={`font-semibold text-sm ${isActive ? "text-zinc-100" : "text-zinc-300"}`}>
                    {provider.label}
                  </span>
                  <span className="text-xs text-zinc-500 leading-relaxed">{provider.description}</span>
                  {isActive && (
                    <span className="mt-1 text-[10px] font-medium text-indigo-400">● Active</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Key Inputs ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{activeProvider.icon}</span>
              <h3 className="text-sm font-medium text-zinc-200">{activeProvider.label} API Key(s)</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(activeProvider.docsUrl, '_blank')}
                className="h-8 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
              >
                <Link01Icon className="w-3 h-3 mr-1" /> Get a free key
              </Button>
              <Button variant="secondary" size="sm" onClick={handleAddKey} className="h-8 text-xs">
                <PlusSignIcon className="w-3 h-3 mr-1" /> Add Fallback
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {keys.map((key, index) => (
              <div key={index} className="space-y-1.5">
                <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                  {index === 0 ? "Primary Key" : `Fallback Key ${index}`}
                </Label>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Input
                      type={showKey[index] ? "text" : "password"}
                      value={key}
                      onChange={(e) => handleKeyChange(index, e.target.value)}
                      placeholder={activeProvider.placeholder}
                      className="bg-zinc-900 border-zinc-800 pr-10 focus-visible:ring-indigo-500 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey({ ...showKey, [index]: !showKey[index] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showKey[index] ? (
                        <ViewOffSlashIcon className="w-4 h-4" />
                      ) : (
                        <ViewIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {keys.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveKey(index)}
                      className="h-9 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-zinc-800"
                    >
                      <Delete01Icon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-zinc-500 pt-1">
              If the primary key is rate-limited, the backend automatically rotates to the next fallback key.
            </p>
          </div>
        </div>

        {/* ── Status message ── */}
        {message.text && (
          <div
            className={`p-3 text-sm rounded-lg border ${
              message.type === "error"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            {message.text}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-zinc-900/50 border-t border-zinc-800 px-6 py-4">
        <Button variant="default" onClick={handleSave} disabled={isPending}>
          <FloppyDiskIcon className="w-4 h-4 mr-2" />
          {isPending ? "Saving…" : `Save ${activeProvider.label} Key`}
        </Button>
      </CardFooter>
    </Card>
  );
}

import { TypeChip } from "@/components/ui/type-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { createClient } from"@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import Link from"next/link";
import { AddCircleIcon, PencilEdit02Icon, Database01Icon, File01Icon } from "hugeicons-react";
import { ExpandableText } from"../intents/ExpandableText";

export default async function KnowledgePage() {
  const supabase = await createClient();
  
  const { data: sources, error } = await supabase
    .from("knowledge_sources")
    .select(`
      *,
      knowledge_documents(content)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Knowledge Base</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage documents, rules, and FAQs for your AI Agents.</p>
        </div>
        <Link href="/dashboard/knowledge/new">
          <Button>
            <AddCircleIcon className="h-4 w-4" />
            Add Knowledge
          </Button>
        </Link>
      </div>

      <Card className="border-zinc-800 bg-[#0c0c0e]">
        <CardHeader className="border-b border-zinc-800/50">
          <CardTitle className="text-lg text-zinc-100">Information Sources</CardTitle>
          <CardDescription className="text-zinc-400">Content the AI can retrieve to answer user queries factually.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500 py-4">Error loading knowledge: {error.message}</div>
          ) : !sources || sources.length === 0 ? (
            <EmptyState icon={Database01Icon} title="No Knowledge Added" description="Add your first FAQ or document text for the AI to learn from." actionLabel="Add Knowledge" actionHref="/dashboard/knowledge/new" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Title / Name</TableHead>
                  <TableHead className="text-zinc-400">Content Summary</TableHead>
                  <TableHead className="text-zinc-400">Category</TableHead>
                  <TableHead className="text-zinc-400">Type</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source: any) => {
                  const contentText = source.knowledge_documents?.[0]?.content || 'No content';
                  return (
                  <TableRow key={source.id} className="border-zinc-800/50 hover:bg-zinc-900/50">
                    <TableCell className="font-medium text-zinc-200">
                      {source.name}
                    </TableCell>
                    <TableCell className="max-w-[250px] text-zinc-400 whitespace-normal break-words">
                      <ExpandableText text={contentText} maxLength={40} />
                    </TableCell>
                    <TableCell className="text-zinc-400 capitalize">{source.category || 'General'}</TableCell>
                    <TableCell>
                      <TypeChip label={source.type} />
                    </TableCell>
                    <TableCell>
                      <StatusChip label={source.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/knowledge/${source.id}`}>
                        <Button variant="ghost" size="sm">
                          <PencilEdit02Icon className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

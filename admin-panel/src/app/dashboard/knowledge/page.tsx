import { createClient } from"@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import Link from"next/link";
import { AddCircleIcon, Edit01Icon, Database01Icon, File01Icon } from "hugeicons-react";
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
            <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg mt-6">
              <Database01Icon className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-zinc-300 font-medium text-lg">No Knowledge Added</h3>
              <p className="text-zinc-500 text-sm mt-1 mb-4">Add your first FAQ or document text for the AI to learn from.</p>
              <Link href="/dashboard/knowledge/new">
                <Button>Add Knowledge</Button>
              </Link>
            </div>
          ) : (
            <Table className="mt-4">
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
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-indigo-500/10 flex items-center justify-center">
                          <File01Icon className="h-3 w-3 text-indigo-400" />
                        </div>
                        {source.name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px] text-zinc-400 whitespace-normal break-words">
                      <ExpandableText text={contentText} maxLength={40} />
                    </TableCell>
                    <TableCell className="text-zinc-400 capitalize">{source.category || 'General'}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-1 text-xs font-mono font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700">
                        {source.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        source.status === 'PUBLISHED' 
                          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 ring-1 ring-inset ring-yellow-500/20'
                      }`}>
                        {source.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/knowledge/${source.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit01Icon className="h-4 w-4 mr-2" /> Edit
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

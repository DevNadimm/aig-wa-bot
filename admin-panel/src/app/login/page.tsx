import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Label } from"@/components/ui/label"
import { login } from"./actions"
import { SparklesIcon, Shield01Icon, FlashIcon } from "hugeicons-react";
import { SubmitButton } from "./SubmitButton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams;
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0c0c0e] text-zinc-100 font-sans overflow-hidden">
      {/* Shared Full-page Background Gradients & Grid Pattern */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/15 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzZjNmNDYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djI2aDJWMzRoMjZ2LTJoLTI2VjBoLTJ2MjZIMHYyaDI2eiIvPjwvZz48L2c+PC9zdmc+')] pointer-events-none" />

      {/* Centered Main Content Wrapper */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center lg:justify-between px-6 lg:px-8 py-12 pb-24 gap-10 lg:gap-14">
        {/* Left Side - Features */}
        <div className="hidden lg:flex w-full lg:w-1/2 flex-col justify-center max-w-lg space-y-6">
          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
            Automate your healthcare communication.
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            A dynamic, configuration-driven WhatsApp AI Agent platform. Manage intents, workflows, and patient support directly from this panel.
          </p>
          
          <div className="space-y-5 pt-4">
            <div className="flex items-center gap-4 text-zinc-300">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-sm shrink-0">
                <SparklesIcon className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-zinc-100">AI-driven Intent Routing</span>
                <span className="text-sm text-zinc-500">Smartly categorizes user requests.</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-zinc-300">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-sm shrink-0">
                <FlashIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-zinc-100">Dynamic Workflow Engine</span>
                <span className="text-sm text-zinc-500">Executes step-by-step logic seamlessly.</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-zinc-300">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-sm shrink-0">
                <Shield01Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-zinc-100">Secure Human Handoff</span>
                <span className="text-sm text-zinc-500">Transfer complex issues to agents safely.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <Card className="w-full max-w-md bg-[#0c0c0e] border-zinc-800 shadow-2xl">
            <CardHeader className="space-y-1.5 pb-4 border-b border-zinc-800/50">
              <CardTitle className="text-xl font-bold tracking-tight text-zinc-100">Welcome back 👋</CardTitle>
              <CardDescription className="text-zinc-400 text-sm">
                Sign in to your admin or agent account to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form action={login} className="space-y-5">
                {params?.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                    <span>{params.error}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" required>Email Address</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    required 
                    placeholder="admin@aig.com"
                    className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" required>Password</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    required 
                    placeholder="••••••••"
                    className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 tracking-widest placeholder:tracking-normal"
                  />
                </div>
                
                <div className="pt-2">
                  <SubmitButton />
                </div>
              </form>
            </CardContent>
            <CardFooter className="pt-4 pb-4 justify-center border-t border-zinc-800/50">
              <p className="text-center text-xs text-zinc-500">
                By signing in, you agree to our <a href="#" className="text-zinc-400 hover:text-zinc-300 underline underline-offset-2">Terms of Service</a>.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Bottom Center Copyright */}
      <div className="absolute bottom-6 inset-x-0 text-center text-zinc-500 text-xs sm:text-sm font-medium z-10 pointer-events-none">
        &copy; {new Date().getFullYear()} ThinkCodify Projects. All rights reserved.
      </div>
    </div>
  )
}

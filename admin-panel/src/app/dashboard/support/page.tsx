import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail01Icon, BubbleChatIcon, CallIcon, HelpCircleIcon, QuestionIcon, Book01Icon } from "hugeicons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SupportPage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Support & Help Center</h1>
          <p className="text-zinc-400 text-sm mt-1">Get assistance with your AI automation platform.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Contact Support */}
          <Card id="contact-support" className="border-zinc-800 bg-[#0c0c0e]">
            <CardHeader className="border-b border-zinc-800/50 flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 rounded-lg">
                  <BubbleChatIcon className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-zinc-100">Contact Support</CardTitle>
                  <CardDescription className="text-zinc-400 mt-1">Reach out to our technical team directly.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <a href="mailto:support@thinkcodify.com" className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 transition-colors group">
                <div className="p-2 bg-zinc-800 rounded-md group-hover:bg-indigo-500/20 transition-colors">
                  <Mail01Icon className="h-4 w-4 text-zinc-300 group-hover:text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Email Support</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">support@thinkcodify.com</p>
                </div>
              </a>

              <a href="#" className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 transition-colors group">
                <div className="p-2 bg-zinc-800 rounded-md group-hover:bg-emerald-500/20 transition-colors">
                  <CallIcon className="h-4 w-4 text-zinc-300 group-hover:text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">WhatsApp Support</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">+880 1234 567 890</p>
                </div>
              </a>
            </CardContent>
          </Card>

          {/* Frequently Asked Questions */}
          <Card id="faq" className="border-zinc-800 bg-[#0c0c0e]">
            <CardHeader className="border-b border-zinc-800/50 flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <HelpCircleIcon className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-zinc-100">Frequently Asked Questions</CardTitle>
                  <CardDescription className="text-zinc-400 mt-1">Common issues and their solutions.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col divide-y divide-zinc-800/50">
                
                <div className="p-6 space-y-2">
                  <h4 className="text-sm font-semibold text-zinc-200 flex items-start gap-2">
                    <QuestionIcon className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
                    Why is my AI not responding to messages?
                  </h4>
                  <p className="text-sm text-zinc-400 pl-6 leading-relaxed">
                    Ensure the WhatsApp engine is connected in the settings. Check if the conversation state is accidentally set to "HUMAN ACTIVE". The AI only responds when the state is "AI ACTIVE".
                  </p>
                </div>

                <div className="p-6 space-y-2">
                  <h4 className="text-sm font-semibold text-zinc-200 flex items-start gap-2">
                    <QuestionIcon className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
                    How do I train the AI on my data?
                  </h4>
                  <p className="text-sm text-zinc-400 pl-6 leading-relaxed">
                    Go to the Knowledge tab and upload your FAQs, business policies, or product information. The AI automatically uses this data to answer customer queries accurately.
                  </p>
                </div>

                <div className="p-6 space-y-2">
                  <h4 className="text-sm font-semibold text-zinc-200 flex items-start gap-2">
                    <QuestionIcon className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
                    Can the bot book appointments directly?
                  </h4>
                  <p className="text-sm text-zinc-400 pl-6 leading-relaxed">
                    Yes, using the "Tools" functionality, you can connect the AI to your booking API. Create a tool, specify the API endpoint, and the AI will execute it when users request an appointment.
                  </p>
                </div>

              </div>
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
                <a href="#contact-support" className="flex items-center gap-3 p-4 hover:bg-zinc-900/50 transition-colors text-sm text-zinc-400 hover:text-zinc-100">
                  <BubbleChatIcon className="h-4 w-4" /> Contact Support
                </a>
                <a href="#faq" className="flex items-center gap-3 p-4 hover:bg-zinc-900/50 transition-colors text-sm text-zinc-400 hover:text-zinc-100">
                  <HelpCircleIcon className="h-4 w-4" /> FAQs
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-[#0c0c0e] bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="p-3 bg-emerald-500/10 w-fit rounded-lg mb-4">
                <Book01Icon className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-2">Documentation</h3>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                Read our comprehensive documentation to learn how to configure your AI agents and workflows.
              </p>
              <Link href="/dashboard/docs">
                <Button className="w-full">View Docs</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

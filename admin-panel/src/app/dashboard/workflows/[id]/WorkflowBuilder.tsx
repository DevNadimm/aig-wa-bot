"use client";

import { useState } from"react";
import { addStep, updateStep, deleteStep, reorderSteps } from"./actions";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Add01Icon, Delete02Icon, Menu01Icon, ArrowDown01Icon, ArrowUp01Icon, FloppyDiskIcon, Comment01Icon, HandGripIcon, UserSettings01Icon } from "hugeicons-react";
import { toast } from"sonner";

type Step = {
  id: string;
  workflow_id: string;
  name: string;
  step_type: string;
  configuration: any;
  order_index: number;
};

const STEP_TYPES = [
  { id:"SEND_MESSAGE", label:"Send Message", icon: Comment01Icon },
  { id:"COLLECT_FIELD", label:"Collect Field", icon: UserSettings01Icon },
  { id:"HANDOFF", label:"Handoff to Human", icon: HandGripIcon },
];

export function WorkflowBuilder({ workflowId, initialSteps }: { workflowId: string, initialSteps: Step[] }) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  
  // Local state for editing step configurations
  const [editState, setEditState] = useState<Record<string, any>>({});

  const handleAddStep = async (type: string) => {
    setIsAdding(true);
    try {
      const newStep = await addStep(workflowId, type, steps.length);
      setSteps([...steps, newStep]);
      setExpandedStep(newStep.id);
      setEditState(prev => ({
        ...prev,
        [newStep.id]: { name: newStep.name, configuration: newStep.configuration || {} }
      }));
      toast("Step added successfully");
    } catch (error: any) {
      toast("Error adding step:" + error.message);
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStep(id, workflowId);
      setSteps(steps.filter(s => s.id !== id));
      toast("Step deleted");
    } catch (error: any) {
      toast("Error deleting step:" + error.message);
    }
  };

  const handleSaveStep = async (stepId: string) => {
    try {
      const state = editState[stepId];
      if (!state) return;
      await updateStep(stepId, workflowId, state.name, state.configuration);
      toast("Step saved successfully");
    } catch (error: any) {
      toast("Error saving step:" + error.message);
    }
  };

  const updateEditState = (stepId: string, field: string, value: any, isConfig = false) => {
    setEditState(prev => {
      const current = prev[stepId] || { name: steps.find(s => s.id === stepId)?.name, configuration: steps.find(s => s.id === stepId)?.configuration || {} };
      if (isConfig) {
        return { ...prev, [stepId]: { ...current, configuration: { ...current.configuration, [field]: value } } };
      }
      return { ...prev, [stepId]: { ...current, [field]: value } };
    });
  };

  const moveStep = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;
    
    const newSteps = [...steps];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newSteps[index];
    newSteps[index] = newSteps[swapIndex];
    newSteps[swapIndex] = temp;
    
    setSteps(newSteps);
    
    try {
      await reorderSteps(workflowId, newSteps.map(s => s.id));
    } catch (error: any) {
      toast("Error reordering:" + error.message);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      
      {/* Steps List */}
      <div className="space-y-4 relative">
        
        {steps.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg">
            <p className="text-zinc-500 text-sm">No steps yet. Add your first step below to start building the workflow.</p>
          </div>
        )}

        {steps.map((step, index) => {
          const isExpanded = expandedStep === step.id;
          const currentState = editState[step.id] || { name: step.name, configuration: step.configuration || {} };
          
          return (
            <div key={step.id} className="relative flex gap-4 group">
              
              {/* Connection Line */}
              {index !== steps.length - 1 && (
                <div className="absolute left-6 top-14 bottom-[-1rem] w-px bg-zinc-800 z-0"></div>
              )}

              {/* Step Number / Icon */}
              <div className="relative z-10 flex flex-col items-center gap-2 mt-2">
                <div className="h-12 w-12 rounded-full bg-[#121214] border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold shadow-sm">
                  {index + 1}
                </div>
              </div>

              {/* Step Content */}
              <Card className="flex-1 border-zinc-800 bg-[#0c0c0e] shadow-sm relative z-10">
                <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                      className="h-6 w-6 text-zinc-500 p-0 hover:bg-transparent"
                    >
                      {isExpanded ? <ArrowUp01Icon className="h-4 w-4" /> : <ArrowDown01Icon className="h-4 w-4" />}
                    </Button>
                    <div>
                      <CardTitle className="text-base text-zinc-100 flex items-center gap-2">
                        {step.name} 
                        <span className="text-xs font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-normal">
                          {step.step_type}
                        </span>
                      </CardTitle>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStep(index, 'up')} disabled={index === 0}>
                      <ArrowUp01Icon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1}>
                      <ArrowDown01Icon className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/70 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(step.id)}>
                      <Delete02Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="p-4 pt-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs uppercase tracking-wider">Step Name</Label>
                      <Input 
                        value={currentState.name} 
                        onChange={(e) => updateEditState(step.id, 'name', e.target.value)}
                        className="bg-[#121214] border-zinc-700 text-zinc-100"
                      />
                    </div>

                    {step.step_type === 'SEND_MESSAGE' && (
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs uppercase tracking-wider">Message Text</Label>
                        <Textarea 
                          value={currentState.configuration?.text || ''} 
                          onChange={(e) => updateEditState(step.id, 'text', e.target.value, true)}
                          placeholder="Type the exact message the bot should send..."
                          className="bg-[#121214] border-zinc-700 text-zinc-100 min-h-[100px]"
                        />
                      </div>
                    )}

                    {step.step_type === 'COLLECT_FIELD' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-zinc-400 text-xs uppercase tracking-wider">Customer Field to Update</Label>
                          <Input 
                            value={currentState.configuration?.field_name || ''} 
                            onChange={(e) => updateEditState(step.id, 'field_name', e.target.value, true)}
                            placeholder="e.g. passport_status"
                            className="bg-[#121214] border-zinc-700 text-zinc-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-400 text-xs uppercase tracking-wider">Prompt Message</Label>
                          <Input 
                            value={currentState.configuration?.prompt || ''} 
                            onChange={(e) => updateEditState(step.id, 'prompt', e.target.value, true)}
                            placeholder="Do you have a valid passport?"
                            className="bg-[#121214] border-zinc-700 text-zinc-100"
                          />
                        </div>
                      </div>
                    )}

                    {step.step_type === 'HANDOFF' && (
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs uppercase tracking-wider">Handoff Message (Optional)</Label>
                        <Input 
                          value={currentState.configuration?.message || ''} 
                          onChange={(e) => updateEditState(step.id, 'message', e.target.value, true)}
                          placeholder="Transferring you to an agent now..."
                          className="bg-[#121214] border-zinc-700 text-zinc-100"
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-zinc-800/50">
                      <Button onClick={() => handleSaveStep(step.id)}>
                        <FloppyDiskIcon className="h-4 w-4 mr-2" /> Save Configuration
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Add Step Action */}
      <div className="pt-4">
        <div className="flex flex-wrap gap-3">
          <span className="text-sm font-medium text-zinc-500 py-2 w-full">Add next step:</span>
          {STEP_TYPES.map(type => (
            <Button
              key={type.id}
              variant="outline"
              onClick={() => handleAddStep(type.id)}
              disabled={isAdding}
              className="border-zinc-700 bg-[#0c0c0e] hover:bg-zinc-800 text-zinc-300 gap-2"
            >
              <type.icon className="h-4 w-4 text-indigo-400" />
              {type.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

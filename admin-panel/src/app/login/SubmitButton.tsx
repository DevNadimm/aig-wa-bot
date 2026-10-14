"use client";

import { Button } from"@/components/ui/button";
import { Loading02Icon } from "hugeicons-react";
import { useFormStatus } from"react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button 
      type="submit" 
      disabled={pending}
      className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
    >
      {pending ? (
        <>
          <Loading02Icon className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        "Sign In to Dashboard"
      )}
    </Button>
  );
}

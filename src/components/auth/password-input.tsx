"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { cn } from "@/lib/utils";

/**
 * A password field with a reveal toggle.
 *
 * The eye lives inside the field rather than beside it, so the control keeps
 * the grid the other inputs sit on. It is a real button in the tab order: a
 * password that can only be checked with a mouse is no help to anyone typing
 * one on a phone keyboard they cannot see.
 *
 * The type flips on the same element instead of swapping inputs — remounting
 * would drop the caret and, in some managers, the autofill binding.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  const t = useDictionary();
  const [visible, setVisible] = useState(false);

  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />

      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
        aria-pressed={visible}
        className={cn(
          "absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-xs",
          "text-muted-foreground transition-colors duration-150 ease-evade",
          "hover:text-foreground focus-visible:text-foreground",
        )}
      >
        <Icon size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}

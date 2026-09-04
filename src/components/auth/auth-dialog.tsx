"use client";

import { useId, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { ApiError } from "@/lib/api/errors";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useAuth } from "@/providers/auth-provider";

type Mode = "signIn" | "signUp";

export interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: Mode;
}

/**
 * Sign-in and registration in one dialog.
 *
 * Both are the same three fields plus one, and registration already returns a
 * token pair — so there is no «now log in» step and no reason for two screens.
 * The two modes share the state, which is what makes switching between them
 * keep whatever was already typed.
 *
 * Field errors come back from DRF per field (`ApiError.fieldErrors`) and are
 * rendered under their input; anything unfielded becomes the summary line.
 */
export function AuthDialog({ open, onOpenChange, initialMode = "signIn" }: AuthDialogProps) {
  const t = useDictionary();

  const { login, register } = useAuth();
  const fieldId = useId();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignUp = mode === "signUp";

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setSummary(null);
  }

  function reset() {
    setPassword("");
    setPasswordRepeat("");
    setErrors({});
    setSummary(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setSummary(null);

    // Checked here as well as server-side: it is the one error the client can
    // answer instantly, and a round trip to be told so reads as a failure.
    if (isSignUp && password !== passwordRepeat) {
      setErrors({ password_confirm: t.auth.passwordMismatch });
      return;
    }

    setPending(true);
    try {
      const viewer = isSignUp
        ? await register({
            email,
            username: username.trim() || undefined,
            password,
            password_confirm: passwordRepeat,
          })
        : await login({ email, password });

      toast.success(t.auth.signedInAs(viewer.displayName));
      reset();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        // Only surface the summary when it is not already under a field.
        setSummary(Object.keys(error.fieldErrors).length ? null : error.message);
      } else {
        setSummary(t.error.title);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-title-2">
            {isSignUp ? t.auth.signUpTitle : t.auth.signInTitle}
          </DialogTitle>
          <DialogDescription>
            {isSignUp ? t.auth.signUpHint : t.auth.signInHint}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-5 pt-1" onSubmit={handleSubmit} noValidate>
          <Field label={t.auth.email} htmlFor={`${fieldId}-email`} error={errors.email}>
            <Input
              id={`${fieldId}-email`}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
          </Field>

          {isSignUp ? (
            <Field
              label={t.auth.username}
              htmlFor={`${fieldId}-username`}
              hint={t.auth.usernameHint}
              error={errors.username}
            >
              <Input
                id={`${fieldId}-username`}
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={Boolean(errors.username)}
              />
            </Field>
          ) : null}

          <Field
            label={t.auth.password}
            htmlFor={`${fieldId}-password`}
            error={errors.password}
          >
            <PasswordInput
              id={`${fieldId}-password`}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
          </Field>

          {isSignUp ? (
            <Field
              label={t.auth.passwordRepeat}
              htmlFor={`${fieldId}-password-repeat`}
              error={errors.password_confirm}
            >
              <PasswordInput
                id={`${fieldId}-password-repeat`}
                autoComplete="new-password"
                required
                value={passwordRepeat}
                onChange={(event) => setPasswordRepeat(event.target.value)}
                aria-invalid={Boolean(errors.password_confirm)}
              />
            </Field>
          ) : null}

          {summary ? (
            <p role="alert" className="text-body-sm text-destructive">
              {summary}
            </p>
          ) : null}

          <Button type="submit" variant="chrome" disabled={pending}>
            {isSignUp ? t.auth.submitSignUp : t.auth.submitSignIn}
          </Button>

          <button
            type="button"
            className="text-body-sm text-muted-foreground transition-colors duration-150 ease-evade hover:text-foreground"
            onClick={() => switchMode(isSignUp ? "signIn" : "signUp")}
          >
            {isSignUp ? t.auth.toSignIn : t.auth.toSignUp}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-caption text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-caption text-[var(--text-disabled)]">{hint}</p>
      ) : null}
    </div>
  );
}

export interface SignInButtonProps {
  label?: string;
  mode?: Mode;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  children?: ReactNode;
}

/**
 * The one way into the dialog. Every place that needs a signed-in viewer —
 * the header, the rating widget, the comment box — renders this instead of
 * reaching for a shared modal, so the prompt always sits where the intent was.
 */
export function SignInButton({
  label,
  mode = "signIn",
  variant = "secondary",
  size = "default",
  className,
  children,
}: SignInButtonProps) {
  const t = useDictionary();
  const text = label ?? t.auth.signIn;

  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children ?? text}
      </Button>

      <AuthDialog open={open} onOpenChange={setOpen} initialMode={mode} />
    </>
  );
}

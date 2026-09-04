"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PasswordInput } from "@/components/auth/password-input";
import { SectionHeader } from "@/components/layout/section-header";
import { ApiError } from "@/lib/api/errors";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import type { PreferredLanguage } from "@/lib/api/types";

/**
 * The profile itself: the writable half of `/auth/me/`, plus the password form.
 *
 * Email and the staff / comment-ban flags are read-only in the schema, so they
 * are shown as facts rather than disabled inputs — a greyed-out field the
 * viewer can never use is an invitation to try.
 */
export function ProfileForm() {
  const t = useDictionary();

  const { viewer, updateProfile, changePassword } = useAuth();
  const fieldId = useId();

  const [username, setUsername] = useState(viewer?.username ?? "");
  const [firstName, setFirstName] = useState(viewer?.firstName ?? "");
  const [lastName, setLastName] = useState(viewer?.lastName ?? "");
  const [bio, setBio] = useState(viewer?.bio ?? "");
  const [birthDate, setBirthDate] = useState(viewer?.birthDate ?? "");
  const [language, setLanguage] = useState<PreferredLanguage>(viewer?.preferredLanguage ?? "ru");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordPending, setPasswordPending] = useState(false);

  if (!viewer) return null;

  async function handleSave(event: { preventDefault: () => void }) {
    event.preventDefault();
    setErrors({});
    setPending(true);
    try {
      await updateProfile({
        username,
        first_name: firstName,
        last_name: lastName,
        bio,
        // An empty date field means «not set», which the API spells as null.
        birth_date: birthDate || null,
        preferred_language: language,
      });
      toast.success(t.account.saved);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (!Object.keys(error.fieldErrors).length) toast.error(error.message);
      } else {
        toast.error(t.error.title);
      }
    } finally {
      setPending(false);
    }
  }

  async function handlePasswordChange(event: { preventDefault: () => void }) {
    event.preventDefault();
    setPasswordErrors({});
    setPasswordPending(true);
    try {
      // The response carries a fresh token pair; `changePassword` stores it, so
      // the session survives the change instead of dropping to the sign-in wall.
      await changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword("");
      setNewPassword("");
      toast.success(t.account.passwordChanged);
    } catch (error) {
      if (error instanceof ApiError) {
        setPasswordErrors(error.fieldErrors);
        if (!Object.keys(error.fieldErrors).length) toast.error(error.message);
      } else {
        toast.error(t.error.title);
      }
    } finally {
      setPasswordPending(false);
    }
  }

  const joined = formatDate(viewer.joinedAt);

  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col gap-8">
        <SectionHeader
          title={t.account.profile}
          note={joined ? t.account.joined(joined) : undefined}
          actions={
            <div className="flex gap-2">
              {viewer.isStaff ? (
                <Badge variant="outline">{t.account.staff}</Badge>
              ) : null}
            </div>
          }
        />

        {viewer.isCommentBanned ? (
          <p className="text-body-sm text-muted-foreground">
            {t.account.commentBanned} {t.account.commentBannedHint}
          </p>
        ) : null}

        <form
          className="grid max-w-2xl gap-6 md:grid-cols-2"
          onSubmit={(event) => void handleSave(event)}
        >
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label>{t.auth.email}</Label>
            <p className="text-body text-muted-foreground">{viewer.email}</p>
          </div>

          <Field
            label={t.auth.username}
            htmlFor={`${fieldId}-username`}
            error={errors.username}
            className="md:col-span-2"
          >
            <Input
              id={`${fieldId}-username`}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={Boolean(errors.username)}
            />
          </Field>

          <Field
            label={t.account.firstName}
            htmlFor={`${fieldId}-first`}
            error={errors.first_name}
          >
            <Input
              id={`${fieldId}-first`}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </Field>

          <Field
            label={t.account.lastName}
            htmlFor={`${fieldId}-last`}
            error={errors.last_name}
          >
            <Input
              id={`${fieldId}-last`}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </Field>

          <Field
            label={t.account.bio}
            htmlFor={`${fieldId}-bio`}
            error={errors.bio}
            className="md:col-span-2"
          >
            <Textarea
              id={`${fieldId}-bio`}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
          </Field>

          <Field
            label={t.account.birthDate}
            htmlFor={`${fieldId}-birth`}
            error={errors.birth_date}
          >
            <Input
              id={`${fieldId}-birth`}
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <Label>{t.account.language}</Label>
            <Select
              value={language}
              onValueChange={(value) => setLanguage(value as PreferredLanguage)}
            >
              <SelectTrigger className="w-full" aria-label={t.account.language}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">{t.account.languageRu}</SelectItem>
                <SelectItem value="en">{t.account.languageEn}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {t.account.save}
            </Button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader title={t.account.changePassword} />

        <form
          className="grid max-w-2xl gap-6 md:grid-cols-2"
          onSubmit={(event) => void handlePasswordChange(event)}
        >
          <Field
            label={t.account.currentPassword}
            htmlFor={`${fieldId}-old-password`}
            error={passwordErrors.old_password}
          >
            <PasswordInput
              id={`${fieldId}-old-password`}
              autoComplete="current-password"
              required
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
            />
          </Field>

          <Field
            label={t.account.newPassword}
            htmlFor={`${fieldId}-new-password`}
            error={passwordErrors.new_password}
          >
            <PasswordInput
              id={`${fieldId}-new-password`}
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>

          <div className="md:col-span-2">
            <Button
              type="submit"
              variant="secondary"
              disabled={passwordPending || !oldPassword || !newPassword}
            >
              {t.account.changePassword}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-caption text-destructive">{error}</p> : null}
    </div>
  );
}

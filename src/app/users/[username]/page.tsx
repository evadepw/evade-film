import type { Metadata } from "next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageSection } from "@/components/layout/page-section";
import { authService } from "@/lib/api/services/auth.service";
import { orNotFound } from "@/lib/api/not-found";
import { dictionary } from "@/lib/i18n/dictionary";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: PageProps<"/users/[username]">): Promise<Metadata> {
  const { username } = await params;
  try {
    const profile = await authService.publicProfile(username);
    return { title: profile.displayName };
  } catch {
    return { title: dictionary.profile.title };
  }
}

/**
 * Someone else's card — handle, display name, avatar, and nothing more.
 *
 * The endpoint is public and carries no email, so this page renders on the
 * server like the rest of the catalogue: it is the same for every visitor.
 * A comment author's name links here.
 */
export default async function PublicProfilePage({ params }: PageProps<"/users/[username]">) {
  const { username } = await params;
  const profile = await orNotFound(authService.publicProfile(username));

  return (
    <PageSection className="pt-16 pb-24">
      <div className="flex items-center gap-6 border-b border-[var(--border-hairline)] pb-10">
        <Avatar className="size-20">
          {profile.avatar ? <AvatarImage src={profile.avatar} alt="" /> : null}
          <AvatarFallback className="text-title-1">
            {profile.displayName.slice(0, 1)}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2">
          <span className="type-overline text-[var(--text-disabled)]">
            {dictionary.profile.title}
          </span>
          <h1 className="text-display-3 font-light">{profile.displayName}</h1>
          <span className="font-mono text-body-sm text-muted-foreground">@{profile.username}</span>
        </div>
      </div>
    </PageSection>
  );
}

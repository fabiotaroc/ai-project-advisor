import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccountPanel } from "@/components/account/account-panel";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/server/auth";
import { getAccountProfile } from "@/lib/server/profile";

export default async function AccountSettingsPage() {
  const user = await getSessionUser();
  const profile = await getAccountProfile(user.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/app">
            <ArrowLeft className="size-4" />
            Back to projects
          </Link>
        </Button>
      </div>
      <AccountPanel
        email={profile?.email ?? user.email ?? ""}
        initialFirstName={profile?.first_name ?? null}
        initialLastName={profile?.last_name ?? null}
        initialAvatarUrl={profile?.avatar_url ?? null}
      />
    </main>
  );
}

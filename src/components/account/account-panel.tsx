"use client";

import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

type Props = {
  initialFirstName: string | null;
  initialLastName: string | null;
  initialAvatarUrl: string | null;
  email: string;
};

type SaveState = "idle" | "saved" | "error";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file."));
        return;
      }
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function computeInitials(first: string | null, last: string | null, email: string) {
  const candidates = [first, last]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0);
  if (candidates.length > 0) {
    return candidates
      .slice(0, 2)
      .map((value) => value[0].toUpperCase())
      .join("");
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function AccountPanel({
  initialFirstName,
  initialLastName,
  initialAvatarUrl,
  email,
}: Props) {
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [savePending, startSave] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = computeInitials(firstName, lastName, email);

  const save = useCallback(() => {
    startSave(async () => {
      setError(null);
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
        }),
      });
      if (!response.ok) {
        const { error: message } = await response.json().catch(() => ({ error: null }));
        setError(message ?? "Could not save changes.");
        setSaveState("error");
        setTimeout(() => setSaveState("idle"), 3000);
        return;
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    });
  }, [firstName, lastName, avatarUrl]);

  const handleAvatarChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Profile picture must be an image.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError("Profile picture must be 5MB or smaller.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const fileBase64 = await readFileAsBase64(file);
      const response = await fetch("/api/account/avatar-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileBase64,
        }),
      });
      if (!response.ok) {
        const { error: message } = await response.json().catch(() => ({ error: null }));
        throw new Error(message ?? "Could not upload avatar.");
      }
      const { publicUrl } = (await response.json()) as { publicUrl: string };
      setAvatarUrl(publicUrl);
      setSaveState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload avatar.");
    } finally {
      setUploading(false);
    }
  }, []);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Account</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Update how you appear across every project.
          </p>
        </div>
        <Button onClick={save} disabled={savePending || uploading}>
          {savePending
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : saveState === "error"
                ? "Error — retry"
                : "Save changes"}
        </Button>
      </div>

      <Card className="overflow-hidden border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-5">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/60">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile picture"
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-2xl font-semibold text-muted-foreground">
                  {initials}
                </span>
              )}
              {uploading ? (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || savePending}
                >
                  <Camera className="size-4" />
                  {avatarUrl ? "Change picture" : "Upload picture"}
                </Button>
                {avatarUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAvatarUrl(null);
                      setSaveState("idle");
                    }}
                    disabled={uploading || savePending}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, or GIF. Max 5MB.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value);
                  setSaveState("idle");
                }}
                placeholder="Ada"
                autoComplete="given-name"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value);
                  setSaveState("idle");
                }}
                placeholder="Lovelace"
                autoComplete="family-name"
                maxLength={80}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} readOnly disabled className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">
              Sign-in email is managed by your authentication provider.
            </p>
          </div>

          {error ? (
            <p
              className={cn(
                "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive",
              )}
            >
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Theme</Label>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Switch between light and dark.
            </p>
          </div>
          <ThemeToggle showLabel className="h-9" />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            End your session on this device.
          </p>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

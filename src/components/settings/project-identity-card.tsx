"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  isOwner: boolean;
  initialName?: string | null;
  initialDescription?: string | null;
  initialLogoUrl: string | null;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeLogoUrl(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function ProjectIdentityCard(props: Props) {
  const initialNameValue = normalizeText(props.initialName);
  const initialDescriptionValue = normalizeText(props.initialDescription);
  const initialLogoUrlValue = normalizeLogoUrl(props.initialLogoUrl);

  return (
    <ProjectIdentityCardInner
      key={[
        props.projectId,
        initialNameValue,
        initialDescriptionValue,
        initialLogoUrlValue ?? "",
      ].join(":")}
      {...props}
      initialNameValue={initialNameValue}
      initialDescriptionValue={initialDescriptionValue}
      initialLogoUrlValue={initialLogoUrlValue}
    />
  );
}

function ProjectIdentityCardInner({
  projectId,
  isOwner,
  initialNameValue,
  initialDescriptionValue,
  initialLogoUrlValue,
}: Props & {
  initialNameValue: string;
  initialDescriptionValue: string;
  initialLogoUrlValue: string | null;
}) {
  const [name, setName] = useState(initialNameValue);
  const [description, setDescription] = useState(initialDescriptionValue);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrlValue);
  const [savePending, startSave] = useTransition();
  const [savedState, setSavedState] = useState<"idle" | "saved" | "error">("idle");
  const isReadOnly = !isOwner;
  const safeName = normalizeText(name);
  const safeDescription = normalizeText(description);

  useEffect(() => {
    if (initialNameValue.trim().length > 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const { project } = (await response.json()) as {
        project: {
          name?: unknown;
          description?: unknown;
          logo_url?: unknown;
        };
      };

      if (cancelled) {
        return;
      }

      const projectName = normalizeText(project.name);
      const projectDescription = normalizeText(project.description);
      const projectLogoUrl = normalizeLogoUrl(project.logo_url);

      setName((prev) => {
        const currentName = normalizeText(prev);
        return currentName.trim().length > 0 ? currentName : projectName;
      });
      setDescription((prev) => {
        const currentDescription = normalizeText(prev);
        return currentDescription.length > 0 ? currentDescription : projectDescription;
      });
      setLogoUrl((prev) => prev ?? projectLogoUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [initialNameValue, projectId]);

  const save = useCallback(() => {
    startSave(async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: safeName, description: safeDescription, logo_url: logoUrl }),
      });
      if (response.ok) {
        setSavedState("saved");
        setTimeout(() => setSavedState("idle"), 2000);
      } else {
        setSavedState("error");
        setTimeout(() => setSavedState("idle"), 3000);
      }
    });
  }, [projectId, logoUrl, safeDescription, safeName]);

  const initials = safeName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <Card className="overflow-hidden border-border bg-card">
      <div className="h-1 w-full bg-linear-to-r from-primary/60 via-primary/30 to-transparent" />
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/50">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Project logo"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  {initials ? (
                    <span className="text-xl font-semibold text-muted-foreground">{initials}</span>
                  ) : (
                    <ImageIcon className="h-6 w-6" />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name" className="text-sm font-medium">
                Project Name
              </Label>
              <Input
                id="project-name"
                value={safeName}
                onChange={(e) => {
                  setName(e.target.value);
                  setSavedState("idle");
                }}
                disabled={isReadOnly}
                placeholder="My Project"
                className="font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-description" className="text-sm font-medium">
                Short Description
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  ({safeDescription.length}/500)
                </span>
              </Label>
              <Textarea
                id="project-description"
                value={safeDescription}
                onChange={(e) => {
                  setDescription(e.target.value.slice(0, 500));
                  setSavedState("idle");
                }}
                disabled={isReadOnly}
                placeholder="A brief summary of this project — visible to all members."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {!isReadOnly && (
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Changes to name and description are reflected across the workspace.
            </p>
            <Button
              size="sm"
              onClick={save}
              disabled={savePending}
              className={cn(
                savedState === "saved" &&
                  "bg-success text-success-foreground hover:bg-success/90",
                savedState === "error" && "bg-destructive hover:bg-destructive/90",
              )}
            >
              {savePending
                ? "Saving…"
                : savedState === "saved"
                  ? "Saved"
                  : savedState === "error"
                    ? "Error — retry"
                    : "Save identity"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

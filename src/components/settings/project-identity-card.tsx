"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ImageIcon, Pencil, Trash2, Upload } from "lucide-react";

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

export function ProjectIdentityCard({
  projectId,
  isOwner,
  initialName,
  initialDescription,
  initialLogoUrl,
}: Props) {
  const [name, setName] = useState(() => normalizeText(initialName));
  const [description, setDescription] = useState(() => normalizeText(initialDescription));
  const [logoUrl, setLogoUrl] = useState<string | null>(() => normalizeLogoUrl(initialLogoUrl));
  const [logoPreview, setLogoPreview] = useState<string | null>(() => normalizeLogoUrl(initialLogoUrl));
  const [uploadPending, startUpload] = useTransition();
  const [savePending, startSave] = useTransition();
  const [savedState, setSavedState] = useState<"idle" | "saved" | "error">("idle");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isReadOnly = !isOwner;
  const safeName = normalizeText(name);
  const safeDescription = normalizeText(description);

  useEffect(() => {
    setName(normalizeText(initialName));
    setDescription(normalizeText(initialDescription));
    setLogoUrl(normalizeLogoUrl(initialLogoUrl));
    setLogoPreview(normalizeLogoUrl(initialLogoUrl));
    setSavedState("idle");
  }, [initialDescription, initialLogoUrl, initialName, projectId]);

  useEffect(() => {
    if (normalizeText(initialName).trim().length > 0) {
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
      setLogoPreview((prev) => prev ?? projectLogoUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [initialName, projectId]);

  const uploadLogo = useCallback(
    (file: File) => {
      startUpload(async () => {
        const ext = file.name.split(".").pop() ?? "png";
        const path = `${projectId}/logo-${Date.now()}.${ext}`;
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.storage
          .from("project-logos")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (error) {
          console.error("Logo upload failed:", error.message);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("project-logos")
          .getPublicUrl(path);

        setLogoUrl(publicUrl);
        setLogoPreview(publicUrl);
        setSavedState("idle");
      });
    },
    [projectId],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = URL.createObjectURL(file);
      setLogoPreview(preview);
      uploadLogo(file);
    },
    [uploadLogo],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const preview = URL.createObjectURL(file);
      setLogoPreview(preview);
      uploadLogo(file);
    },
    [uploadLogo],
  );

  const removeLogo = useCallback(() => {
    setLogoUrl(null);
    setLogoPreview(null);
    setSavedState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

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
    <Card className="border-border bg-card overflow-hidden">
      <div className="h-1 w-full bg-linear-to-r from-primary/60 via-primary/30 to-transparent" />
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Logo zone */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/50 transition-colors",
                !isReadOnly && "hover:border-primary/50 hover:bg-muted",
                dragOver && "border-primary bg-primary/5",
                isReadOnly && "cursor-default",
              )}
              onDragOver={
                isReadOnly
                  ? undefined
                  : (e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }
              }
              onDragLeave={isReadOnly ? undefined : () => setDragOver(false)}
              onDrop={isReadOnly ? undefined : handleDrop}
              onClick={isReadOnly ? undefined : () => fileInputRef.current?.click()}
            >
              {logoPreview ? (
                <>
                  <Image
                    src={logoPreview}
                    alt="Project logo"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {!isReadOnly && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Pencil className="h-4 w-4 text-white" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  {uploadPending ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  ) : initials ? (
                    <span className="text-xl font-semibold text-muted-foreground">{initials}</span>
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6" />
                      {!isReadOnly && (
                        <span className="text-[10px] leading-tight text-center">Upload</span>
                      )}
                    </>
                  )}
                  {!isReadOnly && !uploadPending && initials && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {logoPreview && !isReadOnly && (
              <button
                type="button"
                onClick={removeLogo}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            )}

            {!isReadOnly && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="sr-only"
                onChange={handleFileChange}
              />
            )}
          </div>

          {/* Fields */}
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
              disabled={savePending || uploadPending}
              className={cn(
                savedState === "saved" && "bg-emerald-600 hover:bg-emerald-700",
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

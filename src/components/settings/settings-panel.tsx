"use client";

import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProjectInvite, ProjectRole, ProjectSettings } from "@/lib/types";
import { MembersPanel, type MemberData } from "@/components/settings/members-panel";
import { ProjectIdentityCard } from "@/components/settings/project-identity-card";

const DEFAULTS: ProjectSettings = {
  project_id: "",
  tone: "conversational",
  verbosity: "standard",
  default_format: "prose",
  language: "English",
  created_at: "",
  updated_at: "",
};

type SettingsField = keyof Omit<ProjectSettings, "project_id" | "created_at" | "updated_at">;

function SelectField({
  label,
  description,
  value,
  options,
  onValueChange,
}: {
  label: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (v: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-44 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function SettingsPanel({
  projectId,
  projectRole,
  projectName,
  projectDescription,
  projectLogoUrl,
  initialSettings,
  initialMembers,
  initialInvites,
}: {
  projectId: string;
  projectRole: ProjectRole;
  projectName: string;
  projectDescription: string;
  projectLogoUrl: string | null;
  initialSettings: ProjectSettings | null;
  initialMembers: MemberData[];
  initialInvites: ProjectInvite[];
}) {
  const [settings, setSettings] = useState<ProjectSettings>({
    ...DEFAULTS,
    ...initialSettings,
    project_id: projectId,
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const update = useCallback(
    <K extends SettingsField>(key: K, value: ProjectSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setSaved(false);
    },
    [],
  );

  function save() {
    startTransition(async () => {
      const payload = {
        tone: settings.tone,
        verbosity: settings.verbosity,
        default_format: settings.default_format,
        language: settings.language,
        client_name: settings.client_name,
        team_name: settings.team_name,
        project_phase: settings.project_phase,
        additional_context: settings.additional_context,
      };
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const { settings: updated } = await response.json();
        setSettings((prev) => ({ ...prev, ...updated }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Project Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure how Morgan operates on this project.
          </p>
        </div>
        <Button onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : saved ? "Saved" : "Save changes"}
        </Button>
      </div>

      <ProjectIdentityCard
        projectId={projectId}
        isOwner={projectRole === "owner"}
        initialName={projectName}
        initialDescription={projectDescription}
        initialLogoUrl={projectLogoUrl}
      />

      <Tabs defaultValue="interaction" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="interaction">Interaction</TabsTrigger>
          <TabsTrigger value="context">Project Context</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="templates">Output Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="interaction" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interaction Style</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SelectField
                label="Tone"
                description="How Morgan communicates — formal for client-facing, conversational for internal."
                value={settings.tone}
                options={[
                  { value: "formal", label: "Formal" },
                  { value: "conversational", label: "Conversational" },
                  { value: "neutral", label: "Neutral" },
                ]}
                onValueChange={(v) => update("tone", v as ProjectSettings["tone"])}
              />
              <Separator />
              <SelectField
                label="Verbosity"
                description="How much detail Morgan includes in responses."
                value={settings.verbosity}
                options={[
                  { value: "concise", label: "Concise" },
                  { value: "standard", label: "Standard" },
                  { value: "detailed", label: "Detailed" },
                ]}
                onValueChange={(v) => update("verbosity", v as ProjectSettings["verbosity"])}
              />
              <Separator />
              <SelectField
                label="Default Format"
                description="Preferred output structure for Morgan's responses."
                value={settings.default_format}
                options={[
                  { value: "prose", label: "Prose" },
                  { value: "bullets", label: "Bullets" },
                  { value: "tables", label: "Tables" },
                  { value: "structured", label: "Structured Sections" },
                ]}
                onValueChange={(v) =>
                  update("default_format", v as ProjectSettings["default_format"])
                }
              />
              <Separator />
              <div className="flex items-start justify-between gap-8">
                <div className="min-w-0 flex-1">
                  <Label className="text-sm font-medium">Language</Label>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Language for Morgan’s responses.
                  </p>
                </div>
                <Input
                  value={settings.language}
                  onChange={(e) => update("language", e.target.value)}
                  className="w-44 shrink-0"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Context</CardTitle>
              <p className="text-sm text-muted-foreground">
                Identity and relationships Morgan cannot infer from sources alone.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input
                    id="client_name"
                    placeholder="e.g. Samsung"
                    value={settings.client_name ?? ""}
                    onChange={(e) => update("client_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team_name">Team Name</Label>
                  <Input
                    id="team_name"
                    placeholder="e.g. Creative Strategy"
                    value={settings.team_name ?? ""}
                    onChange={(e) => update("team_name", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_phase">Project Phase</Label>
                <Input
                  id="project_phase"
                  placeholder="e.g. Discovery, Execution, Wrap-up"
                  value={settings.project_phase ?? ""}
                  onChange={(e) => update("project_phase", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional_context">Additional Context</Label>
                <Textarea
                  id="additional_context"
                  rows={4}
                  placeholder="Anything else Morgan should know — sensitive topics, org hierarchy, source trust levels…"
                  value={settings.additional_context ?? ""}
                  onChange={(e) => update("additional_context", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <MembersPanel
            projectId={projectId}
            projectRole={projectRole}
            initialMembers={initialMembers}
            initialInvites={initialInvites}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Output Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Define recurring deliverable formats Morgan should follow.
              </p>
            </CardHeader>
            <CardContent>
              <p className={cn("rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground")}>
                Output templates are coming soon. You’ll be able to define client-facing report
                formats, internal summary templates, and more.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}

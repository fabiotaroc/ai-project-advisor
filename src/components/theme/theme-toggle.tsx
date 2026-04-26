"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

const themes = [
  {
    value: "light",
    label: "Light",
    description: "Bright interface",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Dim interface",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow device",
    icon: Monitor,
  },
] as const;

type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
} & VariantProps<typeof buttonVariants>;

export function ThemeToggle({
  className,
  variant = "outline",
  size = "icon-sm",
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted && theme ? theme : "system";
  const activeThemeOption = themes.find((option) => option.value === activeTheme) ?? themes[2];
  const ActiveIcon = activeThemeOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={showLabel ? "sm" : size}
          className={cn("shrink-0", className)}
          aria-label={`Change theme. Current theme: ${activeThemeOption.label}`}
        >
          <ActiveIcon data-icon="inline-start" />
          {showLabel ? activeThemeOption.label : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={activeTheme}
          onValueChange={(value) => setTheme(value)}
        >
          {themes.map(({ value, label, description, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value} className="items-start py-2">
              <Icon className="mt-0.5" />
              <span className="flex min-w-0 flex-col">
                <span className="font-medium text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

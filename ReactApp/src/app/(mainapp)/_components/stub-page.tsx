"use client";

import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Placeholder admin page — used where the backend API already exists but
 * the UI hasn't been built yet.
 */
export function StubPage({
  title,
  description,
  endpoints,
}: {
  title: string;
  description: string;
  /** Backend routes the frontend will call, shown for the implementer. */
  endpoints: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-up">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="glass-card animate-fade-up max-w-2xl">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Construction className="h-4 w-4" />
            UI under construction — the API is ready
          </div>
          <ul className="space-y-1 font-mono text-xs text-muted-foreground">
            {endpoints.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

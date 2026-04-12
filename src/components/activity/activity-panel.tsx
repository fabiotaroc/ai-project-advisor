import type { ActivityEvent } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/date-format";

export function ActivityPanel({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight">Activity</h1>
      <ol className="flex flex-col gap-2">
        {events.map((event) => (
          <Card key={event.id} size="sm">
            <CardContent className="px-4 py-3">
              <p className="text-sm">{event.summary}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {event.event_type} &middot; {formatDateTime(event.created_at)}
              </p>
            </CardContent>
          </Card>
        ))}
      </ol>
    </div>
  );
}

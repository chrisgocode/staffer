import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EventStatisticsCardProps {
  totalSignups: number;
  pendingSignups: number;
  scheduledSignups: number;
  spotsAvailable: number;
}

export function EventStatisticsCard({
  totalSignups,
  pendingSignups,
  scheduledSignups,
  spotsAvailable,
}: EventStatisticsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            Total Signups
          </div>
          <div className="text-2xl font-bold">{totalSignups}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            Pending Review
          </div>
          <div className="text-2xl font-bold text-secondary-foreground">
            {pendingSignups}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Scheduled</div>
          <div className="text-2xl font-bold text-accent">
            {scheduledSignups}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            Spots Remaining
          </div>
          <div className="text-2xl font-bold">{spotsAvailable}</div>
        </div>
      </CardContent>
    </Card>
  );
}

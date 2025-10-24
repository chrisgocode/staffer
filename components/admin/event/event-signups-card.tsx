import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignupApprovalCard } from "@/components/admin/event/signup-approval-card";
import { Id } from "@/convex/_generated/dataModel";
import type { EventSignup } from "@/lib/types";

interface EventSignupsCardProps {
  signups: EventSignup[];
  eventStartTime: string;
  eventEndTime: string;
  onApprove: (signupId: Id<"signups">) => void;
  onRemove: (signupId: Id<"signups">) => void;
}

export function EventSignupsCard({
  signups,
  eventStartTime,
  eventEndTime,
  onApprove,
  onRemove,
}: EventSignupsCardProps) {
  const pendingSignups = signups.filter((s) => s.status === "PENDING");
  const scheduledSignups = signups.filter((s) => s.status === "SCHEDULED");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Signups</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              Pending
              {pendingSignups.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingSignups.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              Scheduled
              {scheduledSignups.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {scheduledSignups.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending signups
              </p>
            ) : (
              pendingSignups.map((signup) => (
                <SignupApprovalCard
                  key={signup._id}
                  signup={signup}
                  onApprove={onApprove}
                  onRemove={onRemove}
                  eventStartTime={eventStartTime}
                  eventEndTime={eventEndTime}
                />
              ))
            )}
          </TabsContent>
          <TabsContent value="scheduled" className="space-y-3 mt-4">
            {scheduledSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No scheduled students
              </p>
            ) : (
              scheduledSignups.map((signup) => (
                <SignupApprovalCard
                  key={signup._id}
                  signup={signup}
                  onApprove={onApprove}
                  onRemove={onRemove}
                  eventStartTime={eventStartTime}
                  eventEndTime={eventEndTime}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Mail, Clock } from "lucide-react";
import type { EventSignup } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";
import { formatTime } from "@/lib/date-utils";
import { getInitialsFromName } from "@/lib/name-util";

interface SignupApprovalCardProps {
  signup: EventSignup;
  onApprove: (signupId: Id<"signups">) => void;
  onRemove: (signupId: Id<"signups">) => void;
  eventStartTime: string;
  eventEndTime: string;
}

export function SignupApprovalCard({
  signup,
  onApprove,
  onRemove,
  eventStartTime,
  eventEndTime,
}: SignupApprovalCardProps) {
  const timeslots = signup.timeslots || [];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            {signup.studentImageUrl ? (
              <AvatarImage src={signup.studentImageUrl} />
            ) : (
              <AvatarFallback>
                {getInitialsFromName(signup.studentName)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-base">
                  {signup.studentName}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{signup.studentEmail}</span>
                </div>
              </div>
              <Badge
                variant={
                  signup.status === "SCHEDULED" ? "default" : "secondary"
                }
              >
                {signup.status === "SCHEDULED" ? "Scheduled" : "Pending"}
              </Badge>
            </div>
            {timeslots.length > 0 ? (
              <div className="space-y-1 mb-3">
                {timeslots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 text-sm"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {timeslots.length > 1 ? `Timeslot ${index + 1}: ` : ""}
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm mb-3">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Full event: {formatTime(eventStartTime)} -{" "}
                  {formatTime(eventEndTime)}
                </span>
              </div>
            )}
            {signup.status === "PENDING" ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onApprove(signup._id)}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onRemove(signup._id)}
                className="w-full"
              >
                <X className="h-4 w-4 mr-1" />
                Remove from Event
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

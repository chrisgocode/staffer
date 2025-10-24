import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, Edit, Trash2 } from "lucide-react";
import { formatDate, formatTime } from "@/lib/date-utils";

interface EventInfoCardProps {
  event: {
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    spotsTotal: number;
    spotsAvailable: number;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export function EventInfoCard({ event, onEdit, onDelete }: EventInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl mb-2">{event.title}</CardTitle>
            <p className="text-muted-foreground">{event.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatDate(event.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{event.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>
            {event.spotsTotal - event.spotsAvailable} of {event.spotsTotal}{" "}
            spots filled
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

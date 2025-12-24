import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { semesterOptions } from "@/lib/schedule-utils";

interface ScheduleHeaderProps {
  selectedSemester: string;
  onSemesterChange: (semester: string) => void;
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  hasUnpublishedChanges: boolean;
  onPublish: () => void;
  isPublishing: boolean;
}

export function ScheduleHeader({
  selectedSemester,
  onSemesterChange,
  weekOffset,
  onWeekOffsetChange,
  hasUnpublishedChanges,
  onPublish,
  isPublishing,
}: ScheduleHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Staff Schedule
          </h2>
        </div>
        <Select value={selectedSemester} onValueChange={onSemesterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent>
            {semesterOptions.map((semester) => (
              <SelectItem key={semester} value={semester}>
                {semester}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-4">
        <Button
          onClick={onPublish}
          disabled={!hasUnpublishedChanges || isPublishing}
          variant={hasUnpublishedChanges ? "default" : "outline"}
        >
          {isPublishing ? "Publishing..." : "Publish Schedule"}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWeekOffsetChange(weekOffset - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => onWeekOffsetChange(0)}
            className="min-w-[80px]"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWeekOffsetChange(weekOffset + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Filter, X, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useTeamMembersList } from "@/hooks/useTeamMembers";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DateRange {
  from?: Date;
  to?: Date;
}

interface AdvancedFiltersProps {
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  teamMember?: string;
  onTeamMemberChange?: (userId: string) => void;
  showTeamFilter?: boolean;
  showDateFilter?: boolean;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function AdvancedFilters({
  dateRange,
  onDateRangeChange,
  teamMember,
  onTeamMemberChange,
  showTeamFilter = true,
  showDateFilter = true,
  onClearFilters,
  hasActiveFilters,
  className,
  children,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: teamMembers } = useTeamMembersList();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-primary-foreground/20 rounded-full w-2 h-2" />
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        {children}
      </div>

      <CollapsibleContent className="mt-4">
        <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
          {/* Date Range Filter */}
          {showDateFilter && onDateRangeChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Date:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal w-[130px]",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? format(dateRange.from, "MMM d") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange?.from}
                    onSelect={(date) =>
                      onDateRangeChange({ ...dateRange, from: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">-</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal w-[130px]",
                      !dateRange?.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.to ? format(dateRange.to, "MMM d") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange?.to}
                    onSelect={(date) =>
                      onDateRangeChange({ ...dateRange, to: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Team Member Filter */}
          {showTeamFilter && onTeamMemberChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Team:</span>
              <Select
                value={teamMember || "all"}
                onValueChange={(v) => onTeamMemberChange(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <Users className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {teamMembers?.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && onClearFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

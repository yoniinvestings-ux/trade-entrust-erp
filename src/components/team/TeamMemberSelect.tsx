import { useState } from 'react';
import { Check, ChevronsUpDown, X, Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTeamMembersList } from '@/hooks/useTeamMembers';
import { TeamAvatarGroup } from './TeamAvatarGroup';

interface TeamMemberSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function TeamMemberSelect({
  value = [],
  onChange,
  disabled = false,
  placeholder = 'Assign team members',
}: TeamMemberSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: teamMembers = [], isLoading } = useTeamMembersList();

  const selectedMembers = teamMembers.filter((member) => 
    value.includes(member.user_id)
  );

  const handleSelect = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  const handleRemove = (userId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(value.filter((id) => id !== userId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between h-auto min-h-10 py-2',
            value.length > 0 ? 'px-2' : 'px-3'
          )}
        >
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedMembers.map((member) => (
                <Badge
                  key={member.user_id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {getInitials(member.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{member.display_name.split(' ')[0]}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemove(member.user_id, e)}
                    className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search team members..." />
          <CommandList>
            <CommandEmpty>No team members found.</CommandEmpty>
            <CommandGroup heading="Team Members">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : (
                teamMembers.map((member) => {
                  const isSelected = value.includes(member.user_id);
                  return (
                    <CommandItem
                      key={member.user_id}
                      value={member.display_name}
                      onSelect={() => handleSelect(member.user_id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(member.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.display_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.department || member.role || 'No department'}
                          </p>
                        </div>
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'opacity-100 text-primary' : 'opacity-0'
                          )}
                        />
                      </div>
                    </CommandItem>
                  );
                })
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
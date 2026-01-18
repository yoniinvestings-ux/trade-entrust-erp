import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TeamMember {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  department?: string | null;
}

interface TeamAvatarGroupProps {
  members: TeamMember[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function TeamAvatarGroup({ 
  members, 
  maxDisplay = 4, 
  size = 'md',
  className 
}: TeamAvatarGroupProps) {
  if (!members || members.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">Unassigned</span>
    );
  }

  const displayMembers = members.slice(0, maxDisplay);
  const remainingCount = members.length - maxDisplay;

  return (
    <TooltipProvider>
      <div className={cn('flex -space-x-2', className)}>
        {displayMembers.map((member) => (
          <Tooltip key={member.user_id}>
            <TooltipTrigger asChild>
              <Avatar className={cn(
                sizeClasses[size],
                'border-2 border-background ring-0 cursor-default'
              )}>
                <AvatarImage src={member.avatar_url || undefined} alt={member.display_name} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(member.display_name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{member.display_name}</p>
              {member.department && (
                <p className="text-muted-foreground">{member.department}</p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className={cn(
                sizeClasses[size],
                'border-2 border-background ring-0 cursor-default bg-muted'
              )}>
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  +{remainingCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{remainingCount} more members</p>
              <div className="mt-1 space-y-0.5">
                {members.slice(maxDisplay).map((member) => (
                  <p key={member.user_id} className="text-muted-foreground">
                    {member.display_name}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
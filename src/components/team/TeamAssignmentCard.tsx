import { useState } from 'react';
import { Users, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TeamAvatarGroup } from './TeamAvatarGroup';
import { TeamMemberSelect } from './TeamMemberSelect';
import { useTeamMembersById, useUpdateAssignedTeam } from '@/hooks/useTeamMembers';

interface TeamAssignmentCardProps {
  entityType: 'order' | 'purchase_order' | 'sourcing_project' | 'customer' | 'supplier' | 'quotation';
  entityId: string;
  assignedTeam: string[] | null;
  compact?: boolean;
}

export function TeamAssignmentCard({ 
  entityType, 
  entityId, 
  assignedTeam,
  compact = false 
}: TeamAssignmentCardProps) {
  const [open, setOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string[]>(assignedTeam || []);
  
  const { data: members = [] } = useTeamMembersById(assignedTeam);
  const updateTeam = useUpdateAssignedTeam();

  const handleSave = async () => {
    await updateTeam.mutateAsync({
      entityType,
      entityId,
      assignedTeam: selectedTeam,
    });
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedTeam(assignedTeam || []);
    }
    setOpen(isOpen);
  };

  if (compact) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded transition-colors">
            <TeamAvatarGroup members={members} size="sm" maxDisplay={3} />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Team Members</DialogTitle>
            <DialogDescription>
              Select team members to assign to this {entityType.replace('_', ' ')}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <TeamMemberSelect
              value={selectedTeam}
              onChange={setSelectedTeam}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateTeam.isPending}>
              {updateTeam.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Users className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assigned Team</p>
              <TeamAvatarGroup members={members} />
            </div>
          </div>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Edit2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Team Members</DialogTitle>
                <DialogDescription>
                  Select team members to assign to this {entityType.replace('_', ' ')}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <TeamMemberSelect
                  value={selectedTeam}
                  onChange={setSelectedTeam}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateTeam.isPending}>
                  {updateTeam.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
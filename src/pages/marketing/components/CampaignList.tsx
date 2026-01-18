import { format } from "date-fns";
import { Edit, Trash2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campaign } from "../types";

interface CampaignListProps {
    campaigns: Campaign[];
}

export function CampaignList({ campaigns }: CampaignListProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "default"; // Usually black/primary
            case "completed":
                return "secondary";
            case "paused":
                return "outline";
            default:
                return "secondary";
        }
    };

    if (campaigns.length === 0) {
        return (
            <div className="text-center py-10 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">No campaigns found. Create your first one!</p>
            </div>
        );
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                            <TableCell className="font-medium">{campaign.name}</TableCell>
                            <TableCell>{campaign.platform}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusColor(campaign.status) as any}>
                                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                </Badge>
                            </TableCell>
                            <TableCell>${campaign.budget.toLocaleString()}</TableCell>
                            <TableCell>{format(campaign.startDate, "MMM d, yyyy")}</TableCell>
                            <TableCell>{campaign.leadsGenerated}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

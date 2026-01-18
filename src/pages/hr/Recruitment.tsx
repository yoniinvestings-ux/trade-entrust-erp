import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MoreHorizontal, MessageSquare, Phone, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Candidate {
    id: string;
    name: string;
    position: string;
    source: "BOSS" | "Zhilian" | "Referral" | "Other";
    stage: "screening" | "hr_interview" | "coo_interview" | "boss_interview" | "offer" | "hired";
    rating?: number;
    interviewDate?: string;
}

const INITIAL_CANDIDATES: Candidate[] = [
    { id: "1", name: "Alice Chen", position: "Sales Manager", source: "BOSS", stage: "hr_interview", interviewDate: "2026-01-20 10:00" },
    { id: "2", name: "Bob Li", position: "Sourcing Specialist", source: "Zhilian", stage: "screening" },
    { id: "3", name: "Charlie Wang", position: "QC Inspector", source: "Referral", stage: "coo_interview", interviewDate: "2026-01-19 14:00" },
];

const STAGES = [
    { id: "screening", label: "Screening", count: 1 },
    { id: "hr_interview", label: "Round 1: HR", count: 1 },
    { id: "coo_interview", label: "Round 2: COO", count: 1 },
    { id: "boss_interview", label: "Round 3: BOSS", count: 0 },
    { id: "offer", label: "Offer Sent", count: 0 },
    { id: "hired", label: "Hired", count: 0 },
];

export default function Recruitment() {
    const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);

    const getCandidatesByStage = (stageId: string) => {
        return candidates.filter((c) => c.stage === stageId);
    };

    const getSourceColor = (source: string) => {
        switch (source) {
            case "BOSS": return "bg-blue-100 text-blue-700";
            case "Zhilian": return "bg-yellow-100 text-yellow-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <PageHeader
                title="Recruitment Pipeline"
                description="Track candidates from application to hiring (SOP 2.1)."
                actions={
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Candidate
                    </Button>
                }
            />

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto">
                <div className="flex gap-4 h-full min-w-[1200px] pb-4">
                    {STAGES.map((stage) => (
                        <div key={stage.id} className="flex-1 min-w-[200px] flex flex-col bg-muted/30 rounded-lg border p-2">
                            <div className="flex items-center justify-between p-2 mb-2">
                                <h3 className="font-semibold text-sm">{stage.label}</h3>
                                <Badge variant="secondary" className="text-xs">
                                    {getCandidatesByStage(stage.id).length}
                                </Badge>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="space-y-3 p-1">
                                    {getCandidatesByStage(stage.id).map((candidate) => (
                                        <Card key={candidate.id} className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                                            <CardContent className="p-3 space-y-3">
                                                {/* Header */}
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="text-xs">
                                                                {candidate.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium text-sm">{candidate.name}</div>
                                                            <div className="text-xs text-muted-foreground">{candidate.position}</div>
                                                        </div>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                                                <MoreHorizontal className="h-3 w-3" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>View Details</DropdownMenuItem>
                                                            <DropdownMenuItem>Move Next</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive">Reject</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>

                                                {/* Tags */}
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="secondary" className={`text-[10px] px-1 py-0 h-5 ${getSourceColor(candidate.source)}`}>
                                                        {candidate.source}
                                                    </Badge>
                                                    {candidate.interviewDate && (
                                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 gap-1">
                                                            <Calendar className="h-2 w-2" />
                                                            {candidate.interviewDate.split(" ")[0]}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2 pt-1">
                                                    <Button variant="outline" size="sm" className="h-7 flex-1 text-xs">
                                                        <MessageSquare className="h-3 w-3 mr-1" />
                                                        Chat
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-7 flex-1 text-xs">
                                                        <Phone className="h-3 w-3 mr-1" />
                                                        Call
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>

                            <Button variant="ghost" className="w-full mt-2 text-muted-foreground hover:text-foreground border-dashed border">
                                <Plus className="mr-2 h-3 w-3" />
                                Add Card
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

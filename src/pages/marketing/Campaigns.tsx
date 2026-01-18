import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign } from "./types";
import { CreateCampaignDialog } from "./components/CreateCampaignDialog";
import { CampaignList } from "./components/CampaignList";
import { DollarSign, Megaphone, Users, BarChart3 } from "lucide-react";

const MOCK_CAMPAIGNS: Campaign[] = [
    {
        id: "1",
        name: "Summer Sale 2024",
        platform: "Google",
        status: "active",
        budget: 5000,
        spent: 1200,
        startDate: new Date(),
        leadsGenerated: 145,
        costPerLead: 8.27,
    },
    {
        id: "2",
        name: "Retargeting Q1",
        platform: "Facebook",
        status: "paused",
        budget: 2000,
        spent: 800,
        startDate: new Date(Date.now() - 86400000 * 10),
        leadsGenerated: 45,
        costPerLead: 17.77,
    },
];

export default function Campaigns() {
    const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);

    const handleCreateCampaign = (newCampaign: Campaign) => {
        setCampaigns([...campaigns, newCampaign]);
    };

    const totalBudget = campaigns.reduce((acc, curr) => acc + curr.budget, 0);
    const totalLeads = campaigns.reduce((acc, curr) => acc + curr.leadsGenerated, 0);
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">🚀 Marketing Hub</h1>
                    <p className="text-muted-foreground mt-1">Manage your campaigns and track performance.</p>
                </div>
                <CreateCampaignDialog onCampaignCreated={handleCreateCampaign} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                        <Megaphone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCampaigns}</div>
                        <p className="text-xs text-muted-foreground">{campaigns.length} total campaigns</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalLeads}</div>
                        <p className="text-xs text-muted-foreground">+180 this month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ROI</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">324%</div>
                        <p className="text-xs text-muted-foreground">+7% from last month</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Campaigns Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <CampaignList campaigns={campaigns} />
                </CardContent>
            </Card>
        </div>
    );
}

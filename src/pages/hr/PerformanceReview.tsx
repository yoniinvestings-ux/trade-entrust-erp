import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Download, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PerformanceReview() {
    const { id } = useParams();

    // Mock Data (In real app, fetch by ID)
    const employee = {
        name: "Alice Chen",
        role: "Sales Manager",
        department: "Sales",
        joinDate: "2024-03-15",
        manager: "Yoni Rosilio"
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`} />
                        <AvatarFallback>AC</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{employee.name}</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            {employee.role} • {employee.department}
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">Joined {employee.joinDate}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                    </Button>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Assessment
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* KPI Card */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Q1 2026 Goals & KPIs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">Total Sales Revenue ($500k Target)</span>
                                <span className="text-muted-foreground">82%</span>
                            </div>
                            <Progress value={82} className="h-2" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">New Client Acquisition (10 Clients)</span>
                                <span className="text-muted-foreground">40%</span>
                            </div>
                            <Progress value={40} className="h-2 bg-yellow-100" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">Team Training Completion</span>
                                <span className="text-muted-foreground">100%</span>
                            </div>
                            <Progress value={100} className="h-2 bg-emerald-100" />
                        </div>
                    </CardContent>
                </Card>

                {/* Current Score */}
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-lg">Current Rating</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center pt-4">
                        <div className="text-6xl font-bold text-primary mb-2">92</div>
                        <Badge className="mb-4">Outstanding</Badge>
                        <p className="text-sm text-center text-muted-foreground">
                            "Alice has exceeded expectations in Q4 2025, particularly in driving new market expansion."
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="reviews" className="w-full">
                <TabsList>
                    <TabsTrigger value="reviews">Review History</TabsTrigger>
                    <TabsTrigger value="feedback">360 Feedback</TabsTrigger>
                    <TabsTrigger value="notes">Private Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="reviews" className="space-y-4 pt-4">
                    {[1, 2].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <Calendar className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">Q{5 - i} 2025 Performance Review</div>
                                        <div className="text-sm text-muted-foreground">Conducted by {employee.manager} on Dec {i * 10}, 2025</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right mr-4">
                                        <div className="font-bold text-lg">{95 - i * 3}/100</div>
                                        <div className="text-xs text-muted-foreground">Final Score</div>
                                    </div>
                                    <Button variant="outline" size="sm">View</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    );
}

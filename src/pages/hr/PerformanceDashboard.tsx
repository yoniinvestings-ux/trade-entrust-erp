import { useState } from "react";
import { useTeamMembers, ROLE_LABELS } from "@/hooks/useUsers";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function PerformanceDashboard() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const { data: teamMembers, isLoading } = useTeamMembers();

    // Combine real users with mock performance data
    const employeePerformance = teamMembers?.map((member) => ({
        id: member.id,
        name: member.display_name,
        role: member.role ? ROLE_LABELS[member.role] : "No Role",
        department: member.department || "Unassigned",
        avatar_url: member.avatar_url,
        // Mock performance data logic: deterministic based on ID for consistency
        score: 70 + (member.id.charCodeAt(0) % 30),
        trend: member.id.charCodeAt(0) % 2 === 0 ? "up" : "stable",
        lastReview: "2025-12-15"
    })) || [];

    const filteredEmployees = employeePerformance.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.department.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Performance Analysis"
                description="System-wide performance tracking and employee analysis (SOP 2.4)."
            />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Performance Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-20" /> : (
                            <>
                                <div className="text-2xl font-bold">
                                    {Math.round(employeePerformance.reduce((acc, curr) => acc + curr.score, 0) / (employeePerformance.length || 1))}
                                </div>
                                <p className="text-xs text-muted-foreground">Based on {employeePerformance.length} employees</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reviews Due</CardTitle>
                        <Badge variant="secondary">Q1 2026</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">All</div>
                        <p className="text-xs text-muted-foreground">Upcoming Cycle</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                        <Avatar className="h-4 w-4">
                            <AvatarFallback>🏆</AvatarFallback>
                        </Avatar>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-32" /> : (
                            <>
                                <div className="text-2xl font-bold truncate">
                                    {employeePerformance.sort((a, b) => b.score - a.score)[0]?.name || "N/A"}
                                </div>
                                <p className="text-xs text-muted-foreground">Highest Score</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Search & Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Employee Performance List</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search employee..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Last Review</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Trend</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.map((employee) => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={employee.avatar_url || undefined} />
                                                <AvatarFallback>{employee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-semibold text-sm">{employee.name}</div>
                                                <div className="text-xs text-muted-foreground">{employee.role}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{employee.department}</TableCell>
                                        <TableCell>{employee.lastReview}</TableCell>
                                        <TableCell>
                                            <Badge variant={employee.score >= 90 ? "default" : employee.score >= 80 ? "secondary" : "outline"}>
                                                {employee.score}/100
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {employee.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                                            {employee.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                                            {employee.trend === "stable" && <span className="text-xl leading-3 text-gray-400">→</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/hr/performance/${employee.id}`)}>
                                                <Eye className="h-4 w-4 mr-2" />
                                                View Analysis
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredEmployees.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No employees found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

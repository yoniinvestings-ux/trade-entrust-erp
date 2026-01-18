import { useState } from "react";
import { useTeamMembers, ROLE_LABELS } from "@/hooks/useUsers";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, DollarSign, Download, Plus } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function Salaries() {
    const [search, setSearch] = useState("");
    const { data: teamMembers, isLoading } = useTeamMembers();

    const filteredMembers = teamMembers?.filter(member =>
        member.display_name.toLowerCase().includes(search.toLowerCase()) ||
        (member.role && ROLE_LABELS[member.role]?.toLowerCase().includes(search.toLowerCase()))
    );

    const totalMonthlySalary = teamMembers?.reduce((acc, curr) => acc + (curr.employeeDetails?.base_salary_usd || 0), 0) || 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Salaries & Compensation"
                description="Manage employee salaries and payroll information."
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Export Payroll
                        </Button>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Run Payroll
                        </Button>
                    </div>
                }
            />

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Monthly Payroll</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-32" /> : (
                            <div className="text-2xl font-bold">${totalMonthlySalary.toLocaleString()}</div>
                        )}
                        <p className="text-xs text-muted-foreground">Base salaries only</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                        <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <div className="text-2xl font-bold">{teamMembers?.length || 0}</div>
                        )}
                        <p className="text-xs text-muted-foreground">On payroll</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Employee Salary List</CardTitle>
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
                                    <TableHead>Role</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Base Salary (USD)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMembers?.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={member.avatar_url || undefined} />
                                                <AvatarFallback>{member.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                {member.display_name}
                                                {/* Show indicator if not linked to employee record */}
                                                {!member.employeeDetails && (
                                                    <span className="ml-2 text-[10px] text-red-500 bg-red-50 px-1 rounded">No Data</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{member.role ? ROLE_LABELS[member.role] : "No Role"}</TableCell>
                                        <TableCell>{member.employeeDetails?.department || "-"}</TableCell>
                                        <TableCell className="font-mono">
                                            {member.employeeDetails?.base_salary_usd
                                                ? `$${member.employeeDetails.base_salary_usd.toLocaleString()}`
                                                : <span className="text-muted-foreground italic">Not Set</span>
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={member.is_active ? "default" : "secondary"}>
                                                {member.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function UsersIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}

import { useState } from "react";
import { useTeamMembers, ROLE_LABELS } from "@/hooks/useUsers";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Filter } from "lucide-react";
import { EmployeeCard } from "./components/EmployeeCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

export default function EmployeeList() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");

    const { data: employees, isLoading } = useTeamMembers();

    const filteredEmployees = employees?.filter((employee) => {
        const matchesSearch =
            employee.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (employee.role && ROLE_LABELS[employee.role]?.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesDept = departmentFilter === "all" || employee.department === departmentFilter;

        return matchesSearch && matchesDept;
    });

    const uniqueDepartments = Array.from(
        new Set(employees?.map((e) => e.department).filter(Boolean))
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Employee Directory"
                description="Manage your team, view profiles, and track status."
                actions={
                    <Button onClick={() => navigate("/admin/users")}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Manage Users
                    </Button>
                }
            />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search employees..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {uniqueDepartments.map((dept) => (
                                <SelectItem key={dept as string} value={dept as string}>
                                    {dept}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex flex-col gap-4 p-6 border rounded-lg bg-card shadow-sm h-[200px]">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ))}
                </div>
            ) : filteredEmployees?.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                    <h3 className="text-lg font-medium text-muted-foreground">No employees found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Try adjusting your search or filters.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredEmployees?.map((employee) => (
                        <EmployeeCard
                            key={employee.id}
                            employee={{
                                id: employee.id,
                                full_name: employee.display_name,
                                position: employee.role ? ROLE_LABELS[employee.role] : "No Role",
                                department: employee.department || "Unassigned",
                                email: employee.email,
                                avatar_url: employee.avatar_url,
                                status: employee.is_active ? "Active" : "Inactive",
                                location: "Office HQ" // Placeholder
                            }}
                            onViewProfile={(id) => console.log("View profile", id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

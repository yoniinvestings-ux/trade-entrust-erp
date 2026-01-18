import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Mail, Phone, MapPin, Building2, User } from "lucide-react";

interface EmployeeCardProps {
    employee: {
        id: string;
        full_name: string;
        position: string | null;
        department: string | null;
        email?: string | null;
        phone?: string | null;
        avatar_url?: string | null;
        status: string | null;
        location?: string | null;
    };
    onViewProfile?: (id: string) => void;
}

export function EmployeeCard({ employee, onViewProfile }: EmployeeCardProps) {
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        active: "default",
        leave: "secondary",
        terminated: "destructive",
        remote: "outline",
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={employee.avatar_url || undefined} alt={employee.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(employee.full_name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                    <h3 className="font-semibold text-lg truncate">{employee.full_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                        {employee.position || "No Position"}
                    </p>
                </div>
                <Badge variant={statusColors[employee.status?.toLowerCase() || "active"] || "outline"}>
                    {employee.status || "Active"}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{employee.department || "No Department"}</span>
                </div>

                {employee.email && (
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <Mail className="h-4 w-4 shrink-0" />
                        <a href={`mailto:${employee.email}`} className="truncate hover:underline">
                            {employee.email}
                        </a>
                    </div>
                )}

                {employee.phone && (
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span className="truncate">{employee.phone}</span>
                    </div>
                )}

                {employee.location && (
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{employee.location}</span>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onViewProfile?.(employee.id)}
                >
                    <User className="mr-2 h-4 w-4" />
                    View Profile
                </Button>
            </CardFooter>
        </Card>
    );
}

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Stamp, Search, FileText } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Mock Data
const SUPPLY_REQUESTS = [
    { id: "1", item: "Ergonomic Chair", quantity: 1, department: "Sales", requestor: "Alice Chen", status: "Pending", date: "2026-01-18" },
    { id: "2", item: "A4 Paper", quantity: 5, department: "Admin", requestor: "Admin User", status: "Approved", date: "2026-01-15" },
];

const SEAL_REQUESTS = [
    { id: "1", docName: "Sales Contract #SO-2026-001", type: "Official Seal", requestor: "Alice Chen", status: "Approved", date: "2026-01-18" },
    { id: "2", docName: "Employment Contract - Bob Li", type: "HR Seal", requestor: "HR Manager", status: "Pending", date: "2026-01-17" },
];

export default function AdminRequests() {
    const [activeTab, setActiveTab] = useState("supplies");

    return (
        <div className="space-y-6">
            <PageHeader
                title="Admin Requests"
                description="Manage office supplies and seal usage requests (SOP 3.1 & 3.2)."
                actions={
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Request
                    </Button>
                }
            />

            <Tabs defaultValue="supplies" onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="supplies">
                        <Package className="mr-2 h-4 w-4" />
                        Office Supplies
                    </TabsTrigger>
                    <TabsTrigger value="seal">
                        <Stamp className="mr-2 h-4 w-4" />
                        Seal Usage
                    </TabsTrigger>
                </TabsList>

                {/* Office Supplies Tab */}
                <TabsContent value="supplies" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Supplies Requests</CardTitle>
                            <CardDescription>Review and approve purchase requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Requestor</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {SUPPLY_REQUESTS.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.item}</TableCell>
                                            <TableCell>{req.quantity}</TableCell>
                                            <TableCell>{req.department}</TableCell>
                                            <TableCell>{req.requestor}</TableCell>
                                            <TableCell>{req.date}</TableCell>
                                            <TableCell>
                                                <Badge variant={req.status === "Approved" ? "default" : "secondary"}>
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">Details</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Seal Usage Tab */}
                <TabsContent value="seal" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seal Usage Log</CardTitle>
                            <CardDescription>Track official stamp usage for traceability.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document Name</TableHead>
                                        <TableHead>Seal Type</TableHead>
                                        <TableHead>Requestor</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {SEAL_REQUESTS.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                {req.docName}
                                            </TableCell>
                                            <TableCell>{req.type}</TableCell>
                                            <TableCell>{req.requestor}</TableCell>
                                            <TableCell>{req.date}</TableCell>
                                            <TableCell>
                                                <Badge variant={req.status === "Approved" ? "default" : "secondary"}>
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">View Log</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, Calendar, MapPin, Coffee } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Mock Data for Demo
const MOCK_LOGS = [
    { id: 1, type: "check_in", time: new Date(new Date().setHours(9, 0, 0)), location: "Office HQ" },
    { id: 2, type: "check_out", time: new Date(new Date().setHours(12, 30, 0)), location: "Office HQ" },
    { id: 3, type: "check_in", time: new Date(new Date().setHours(13, 30, 0)), location: "Office HQ" },
];

export default function AttendanceDashboard() {
    const [status, setStatus] = useState<"in" | "out" | "break">("in");
    const [currentTime, setCurrentTime] = useState(new Date());
    const [logs, setLogs] = useState(MOCK_LOGS);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleClockAction = (action: "in" | "out" | "break") => {
        const actionMap = {
            in: { label: "Clocked In", icon: "👋" },
            out: { label: "Clocked Out", icon: "🚪" },
            break: { label: "On Break", icon: "☕" },
        };

        setStatus(action);
        setLogs([
            {
                id: Date.now(),
                type: action === "in" ? "check_in" : action === "out" ? "check_out" : "break_start",
                time: new Date(),
                location: "Office HQ",
            },
            ...logs,
        ]);

        toast.success(`${actionMap[action].icon} Successfully ${actionMap[action].label}!`);
    };

    const workDuration = "4h 30m"; // Mock calculation

    return (
        <div className="space-y-6">
            <PageHeader
                title="Attendance & Time Tracking"
                description="Track your daily work hours and attendance history."
            />

            <div className="grid gap-6 md:grid-cols-12">
                {/* Main Clock Widget */}
                <div className="md:col-span-8 space-y-6">
                    <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Today's Status</span>
                                <Badge
                                    variant={status === "in" ? "default" : status === "break" ? "secondary" : "outline"}
                                    className="px-3 py-1 text-base"
                                >
                                    {status === "in" ? "Working" : status === "break" ? "On Break" : "Clocked Out"}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="flex flex-col items-center justify-center py-8">
                                <div className="text-6xl font-bold tracking-tighter text-foreground mb-2">
                                    {format(currentTime, "HH:mm:ss")}
                                </div>
                                <div className="text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {format(currentTime, "EEEE, MMMM d, yyyy")}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                                <Button
                                    size="lg"
                                    className="h-24 flex flex-col gap-2 shadow-lg hover:scale-105 transition-transform"
                                    variant={status === "in" ? "outline" : "default"}
                                    onClick={() => handleClockAction("in")}
                                    disabled={status === "in"}
                                >
                                    <LogIn className="h-8 w-8" />
                                    Clock In
                                </Button>
                                <Button
                                    size="lg"
                                    className="h-24 flex flex-col gap-2 shadow-sm hover:scale-105 transition-transform"
                                    variant="secondary"
                                    onClick={() => handleClockAction("break")}
                                    disabled={status === "break" || status === "out"}
                                >
                                    <Coffee className="h-8 w-8" />
                                    Break
                                </Button>
                                <Button
                                    size="lg"
                                    className="h-24 flex flex-col gap-2 shadow-sm hover:scale-105 transition-transform border-destructive/20 hover:border-destructive/50 hover:bg-destructive/10 text-destructive"
                                    variant="outline"
                                    onClick={() => handleClockAction("out")}
                                    disabled={status === "out"}
                                >
                                    <LogOut className="h-8 w-8" />
                                    Clock Out
                                </Button>
                            </div>

                            <div className="flex justify-center gap-8 pt-4 text-sm text-muted-foreground">
                                <div className="text-center">
                                    <div className="font-semibold text-foreground">09:00 AM</div>
                                    <div>Scheduled Start</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-semibold text-emerald-600">{workDuration}</div>
                                    <div>Worked Today</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-semibold text-foreground">06:00 PM</div>
                                    <div>Scheduled End</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Activity Logs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                {logs.map((log) => (
                                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        {/* Icon */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                            {log.type === "check_in" && <LogIn className="w-5 h-5 text-emerald-600" />}
                                            {log.type === "check_out" && <LogOut className="w-5 h-5 text-rose-600" />}
                                            {log.type === "break_start" && <Coffee className="w-5 h-5 text-amber-600" />}
                                        </div>
                                        {/* Content */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-slate-900">
                                                    {log.type === "check_in" ? "Clocked In" : log.type === "check_out" ? "Clocked Out" : "Started Break"}
                                                </div>
                                                <time className="font-caveat font-medium text-indigo-500">
                                                    {format(log.time, "HH:mm")}
                                                </time>
                                            </div>
                                            <div className="text-slate-500 text-sm flex items-center gap-1">
                                                <MapPin className="h-3 w-3" /> {log.location}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="md:col-span-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Team Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm">In Office</span>
                                <Badge variant="default" className="bg-emerald-500">12</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm">Remote</span>
                                <Badge variant="secondary">3</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm">On Leave</span>
                                <Badge variant="outline">2</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm">Absent</span>
                                <Badge variant="destructive">1</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary text-primary-foreground">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Shift Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-primary-foreground/80">
                                <span>Shift</span>
                                <span className="font-medium text-white">General (9-6)</span>
                            </div>
                            <div className="flex justify-between text-primary-foreground/80">
                                <span>Total Hours</span>
                                <span className="font-medium text-white">9h 00m</span>
                            </div>
                            <div className="flex justify-between text-primary-foreground/80">
                                <span>Break Time</span>
                                <span className="font-medium text-white">1h 00m</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

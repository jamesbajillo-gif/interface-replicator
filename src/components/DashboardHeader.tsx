import { Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const DashboardHeader = () => {
  return (
    <header className="bg-header text-header-foreground px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lead Management Dashboard</h1>
          <p className="text-sm text-header-foreground/80 mt-0.5">
            File Upload & Management System
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">admin</span>
            <Badge variant="secondary" className="bg-header-foreground/20 text-header-foreground hover:bg-header-foreground/30">
              Admin
            </Badge>
          </div>
          <Button variant="outline" size="sm" className="bg-header-foreground/10 border-header-foreground/20 text-header-foreground hover:bg-header-foreground/20">
            <Search className="h-4 w-4 mr-2" />
            Scan
          </Button>
          <Button variant="outline" size="sm" className="bg-header-foreground/10 border-header-foreground/20 text-header-foreground hover:bg-header-foreground/20">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </header>
  );
};

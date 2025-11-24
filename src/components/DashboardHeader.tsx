import { Search, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

interface DashboardHeaderProps {
  user: User | null;
}

export const DashboardHeader = ({ user }: DashboardHeaderProps) => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
    }
  };
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
            <span className="text-sm">{user?.email}</span>
          </div>
          <Button variant="outline" size="sm" className="bg-header-foreground/10 border-header-foreground/20 text-header-foreground hover:bg-header-foreground/20">
            <Search className="h-4 w-4 mr-2" />
            Scan
          </Button>
          <Button variant="outline" size="sm" className="bg-header-foreground/10 border-header-foreground/20 text-header-foreground hover:bg-header-foreground/20">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="bg-header-foreground/10 border-header-foreground/20 text-header-foreground hover:bg-header-foreground/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

import { DashboardHeader } from "@/components/DashboardHeader";
import { StatsCards } from "@/components/StatsCards";
import { SearchBar } from "@/components/SearchBar";
import { LeadsTable } from "@/components/LeadsTable";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-8 py-8">
        <StatsCards />
        <SearchBar />
        <LeadsTable />
      </main>
    </div>
  );
};

export default Index;

import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
}

const StatCard = ({ label, value }: StatCardProps) => {
  return (
    <Card className="p-6 text-center">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </Card>
  );
};

export const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard label="Total Files" value="5" />
      <StatCard label="Total Size" value="99.77 MB" />
      <StatCard label="Total Leads" value="1,251,746" />
      <StatCard label="Leads Uploaded" value="525,633" />
    </div>
  );
};

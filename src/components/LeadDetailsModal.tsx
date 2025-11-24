import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, Hash, MousePointer, HardDrive, Upload, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadData: {
    entryDate: string;
    listId: number;
    affiliateId: number;
    clickId: string;
    filename: string;
    fileSize: string;
    leads: string;
    uploaded: string;
    uploadedAt: string;
    mainPhoneColumn: string | null;
    dialablesPhoneColumn: string;
    dbId: string;
    mainFilePath: string | null;
    dialablesFilePath: string | null;
  } | null;
  onColumnUpdate?: () => void;
}

export const LeadDetailsModal = ({ open, onOpenChange, leadData, onColumnUpdate }: LeadDetailsModalProps) => {
  const [mainColumns, setMainColumns] = useState<string[]>([]);
  const [dialablesColumns, setDialablesColumns] = useState<string[]>([]);
  const [selectedMainColumn, setSelectedMainColumn] = useState<string | null>(null);
  const [selectedDialablesColumn, setSelectedDialablesColumn] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && leadData) {
      setSelectedMainColumn(leadData.mainPhoneColumn);
      setSelectedDialablesColumn(leadData.dialablesPhoneColumn);
      fetchColumnHeaders();
    }
  }, [open, leadData]);

  const detectDelimiter = (text: string): ',' | ';' | '\t' => {
    const firstLine = text.trim().split('\n')[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return semicolonCount > commaCount ? ';' : ',';
  };

  const fetchColumnHeaders = async () => {
    if (!leadData?.mainFilePath || !leadData?.dialablesFilePath) return;

    setIsLoading(true);
    try {
      // Fetch main file
      const { data: mainData, error: mainError } = await supabase.storage
        .from('lead-files')
        .download(leadData.mainFilePath);

      if (mainError) throw mainError;

      const mainText = await mainData.text();
      const mainDelimiter = detectDelimiter(mainText);
      const mainHeaders = mainText.trim().split('\n')[0].split(mainDelimiter).map(h => h.trim());
      setMainColumns(mainHeaders);

      // Fetch dialables file
      const { data: dialablesData, error: dialablesError } = await supabase.storage
        .from('lead-files')
        .download(leadData.dialablesFilePath);

      if (dialablesError) throw dialablesError;

      const dialablesText = await dialablesData.text();
      const dialablesDelimiter = detectDelimiter(dialablesText);
      const dialablesHeaders = dialablesText.trim().split('\n')[0].split(dialablesDelimiter).map(h => h.trim());
      setDialablesColumns(dialablesHeaders);
    } catch (error) {
      console.error("Error fetching column headers:", error);
      toast.error("Failed to load column headers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMainColumnChange = async (newColumn: string) => {
    if (!leadData) return;

    setSelectedMainColumn(newColumn);

    const { error } = await supabase
      .from('leads')
      .update({ main_phone_column: newColumn })
      .eq('id', leadData.dbId);

    if (error) {
      toast.error("Failed to update main phone column");
      setSelectedMainColumn(leadData.mainPhoneColumn); // Revert on error
    } else {
      toast.success("Main phone column updated");
      onColumnUpdate?.();
    }
  };

  const handleDialablesColumnChange = async (newColumn: string) => {
    if (!leadData) return;

    setSelectedDialablesColumn(newColumn);

    const { error } = await supabase
      .from('leads')
      .update({ dialables_phone_column: newColumn })
      .eq('id', leadData.dbId);

    if (error) {
      toast.error("Failed to update dialables phone column");
      setSelectedDialablesColumn(leadData.dialablesPhoneColumn); // Revert on error
    } else {
      toast.success("Dialables phone column updated");
      onColumnUpdate?.();
    }
  };

  if (!leadData) return null;

  const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground mt-1">{value}</p>
      </div>
    </div>
  );

  const ColumnSelector = ({ 
    icon: Icon, 
    label, 
    columns, 
    selectedColumn, 
    onColumnChange,
    placeholder 
  }: { 
    icon: any; 
    label: string; 
    columns: string[]; 
    selectedColumn: string | null; 
    onColumnChange: (value: string) => void;
    placeholder: string;
  }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground mb-2">{label}</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading columns...</p>
        ) : columns.length > 0 ? (
          <Select value={selectedColumn || undefined} onValueChange={onColumnChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {columns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm font-medium text-foreground">{selectedColumn || "Not detected"}</p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Lead File Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main File Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Main File
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <DetailRow icon={FileText} label="Filename" value={leadData.filename} />
              <ColumnSelector 
                icon={Phone}
                label="Phone Column"
                columns={mainColumns}
                selectedColumn={selectedMainColumn}
                onColumnChange={handleMainColumnChange}
                placeholder="Select phone column"
              />
              <DetailRow icon={Hash} label="Number of Leads" value={leadData.leads} />
            </div>
          </div>

          {/* Dialables File Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dialables File
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <ColumnSelector 
                icon={Phone}
                label="Phone Column"
                columns={dialablesColumns}
                selectedColumn={selectedDialablesColumn}
                onColumnChange={handleDialablesColumnChange}
                placeholder="Select phone column"
              />
              <DetailRow icon={Upload} label="Uploaded Rows" value={leadData.uploaded} />
            </div>
          </div>

          {/* General Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Hash className="h-4 w-4" />
              General Information
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <DetailRow icon={Calendar} label="Entry Date" value={leadData.entryDate} />
              <DetailRow icon={Hash} label="List ID" value={leadData.listId} />
              <DetailRow icon={Hash} label="Affiliate ID" value={leadData.affiliateId} />
              <DetailRow icon={MousePointer} label="Click ID" value={leadData.clickId} />
              <DetailRow icon={HardDrive} label="File Size" value={leadData.fileSize} />
              <DetailRow icon={Calendar} label="Uploaded At" value={leadData.uploadedAt} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

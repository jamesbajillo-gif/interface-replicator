import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Hash, MousePointer, HardDrive, Upload, Phone } from "lucide-react";

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
  } | null;
}

export const LeadDetailsModal = ({ open, onOpenChange, leadData }: LeadDetailsModalProps) => {
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
              <DetailRow 
                icon={Phone} 
                label="Phone Column" 
                value={leadData.mainPhoneColumn || "Not detected"} 
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
              <DetailRow 
                icon={Phone} 
                label="Phone Column" 
                value={leadData.dialablesPhoneColumn} 
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

import { FileText, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileUploadModal } from "./FileUploadModal";

interface LeadData {
  id: number;
  entryDate: string;
  listId: number;
  affiliateId: number;
  clickId: string;
  filename: string;
  fileSize: string;
  leads: string;
  uploaded: string;
  failed: string;
  unprocessed: string;
  uploadedAt: string;
}

type SortField = keyof LeadData;
type SortDirection = "asc" | "desc" | null;

interface SortableHeaderProps {
  field: SortField;
  label: string;
  currentSort: SortField | null;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}

const SortableHeader = ({
  field,
  label,
  currentSort,
  currentDirection,
  onSort,
}: SortableHeaderProps) => {
  const isActive = currentSort === field;

  return (
    <TableHead
      className="font-semibold cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {isActive ? (
          currentDirection === "asc" ? (
            <ArrowUp className="h-4 w-4 text-primary" />
          ) : (
            <ArrowDown className="h-4 w-4 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );
};

interface LeadsTableProps {
  user: User | null;
}

export const LeadsTable = ({ user }: LeadsTableProps) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [leadsData, setLeadsData] = useState<LeadData[]>([]);

  // Fetch leads from database
  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Error loading leads");
      return;
    }

    if (data) {
      const formattedLeads: LeadData[] = data.map((lead, index) => ({
        id: index + 1,
        entryDate: lead.entry_date,
        listId: parseInt(lead.list_id),
        affiliateId: parseInt(lead.affiliate_id),
        clickId: lead.click_id,
        filename: lead.filename,
        fileSize: lead.file_size,
        leads: lead.leads.toString(),
        uploaded: lead.uploaded.toString(),
        failed: "0%",
        unprocessed: (lead.leads - lead.uploaded).toString(),
        uploadedAt: new Date(lead.created_at).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(',', ''),
      }));
      setLeadsData(formattedLeads);
    }
  };

  const handleUploadComplete = async (data: any) => {
    if (!user) return;

    // Insert into database
    const { error } = await supabase
      .from('leads')
      .insert({
        user_id: user.id,
        entry_date: data.entryDate,
        list_id: data.listId,
        affiliate_id: data.affiliateId,
        click_id: data.clickId,
        filename: data.filename,
        file_size: data.fileSize,
        leads: parseInt(data.leads),
        uploaded: parseInt(data.uploaded),
        main_file_path: data.mainFilePath,
        dialables_file_path: data.dialablesFilePath,
      });

    if (error) {
      toast.error("Error saving lead data");
      return;
    }

    toast.success("Files uploaded successfully!");
    fetchLeads(); // Refresh the list
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const parseNumber = (value: string): number => {
    return parseFloat(value.replace(/[,%]/g, ""));
  };

  const parseFileSize = (size: string): number => {
    const match = size.match(/([\d.]+)\s*MB/);
    return match ? parseFloat(match[1]) : 0;
  };

  const sortedData = [...leadsData].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;

    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle different data types
    if (sortField === "fileSize") {
      aValue = parseFileSize(aValue);
      bValue = parseFileSize(bValue);
    } else if (
      sortField === "leads" ||
      sortField === "uploaded" ||
      sortField === "id" ||
      sortField === "listId" ||
      sortField === "affiliateId"
    ) {
      aValue = parseNumber(String(aValue));
      bValue = parseNumber(String(bValue));
    } else if (sortField === "failed") {
      aValue = parseNumber(aValue);
      bValue = parseNumber(bValue);
    } else if (sortField === "unprocessed") {
      aValue = parseNumber(aValue);
      bValue = parseNumber(bValue);
    }

    // Compare values
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold">Lead Files</h2>
          <Button onClick={() => setUploadModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                field="id"
                label="ID"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="entryDate"
                label="Entry Date"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="listId"
                label="List ID"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="affiliateId"
                label="Affiliate ID"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="clickId"
                label="ClickID"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="filename"
                label="Filename"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="fileSize"
                label="File Size"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="leads"
                label="Leads"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="uploaded"
                label="Uploaded"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="failed"
                label="Failed"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="unprocessed"
                label="Unprocessed"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="uploadedAt"
                label="Uploaded At"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.id}</TableCell>
                <TableCell>{lead.entryDate}</TableCell>
                <TableCell>{lead.listId}</TableCell>
                <TableCell>{lead.affiliateId}</TableCell>
                <TableCell className="font-mono text-xs">{lead.clickId}</TableCell>
                <TableCell className="max-w-xs truncate">{lead.filename}</TableCell>
                <TableCell>{lead.fileSize}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-muted text-foreground font-normal">
                    {lead.leads}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-success-muted text-success-muted-foreground font-normal border-0">
                    {lead.uploaded}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-danger-muted text-danger-muted-foreground font-normal border-0">
                    {lead.failed}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-warning-muted text-warning-muted-foreground font-normal border-0">
                    {lead.unprocessed}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{lead.uploadedAt}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-primary hover:bg-primary/90"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="bg-danger hover:bg-danger/90"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <FileUploadModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
};

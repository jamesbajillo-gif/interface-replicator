import { FileText, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Plus, Download } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileUploadModal } from "./FileUploadModal";
import { LeadDetailsModal } from "./LeadDetailsModal";

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
  mainPhoneColumn: string | null;
  dialablesPhoneColumn: string;
  dbId: string;
  mainFilePath: string | null;
  dialablesFilePath: string | null;
  unprocessedFilePath: string | null;
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
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);
  const [leadsData, setLeadsData] = useState<LeadData[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<LeadData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const formattedLeads: LeadData[] = data.map((lead, index) => {
        const totalLeads = lead.leads;
        const uploadedLeads = lead.uploaded;
        const failedPercentage = totalLeads > 0 
          ? (((totalLeads - uploadedLeads) / totalLeads) * 100).toFixed(2) + '%'
          : '0%';
        
        return {
          id: index + 1,
          entryDate: lead.entry_date,
          listId: parseInt(lead.list_id),
          affiliateId: parseInt(lead.affiliate_id),
          clickId: lead.click_id,
          filename: lead.filename,
          fileSize: lead.file_size,
          leads: lead.leads.toString(),
          uploaded: lead.uploaded.toString(),
          failed: failedPercentage,
          unprocessed: ((lead as any).unprocessed || 0).toString(),
        uploadedAt: new Date(lead.created_at).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(',', ''),
          mainPhoneColumn: lead.main_phone_column,
          dialablesPhoneColumn: lead.dialables_phone_column || 'phone_numbers',
          dbId: lead.id,
          mainFilePath: lead.main_file_path,
          dialablesFilePath: lead.dialables_file_path,
          unprocessedFilePath: (lead as any).unprocessed_file_path,
        };
      });
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
        unprocessed: parseInt(data.unprocessed) || 0,
        main_file_path: data.mainFilePath,
        dialables_file_path: data.dialablesFilePath,
        unprocessed_file_path: data.unprocessedFilePath,
        main_phone_column: data.mainPhoneColumn,
        dialables_phone_column: data.dialablesPhoneColumn,
      });

    if (error) {
      toast.error("Error saving lead data");
      return;
    }

    toast.success("Files uploaded successfully!");
    fetchLeads(); // Refresh the list
  };

  const handleDeleteClick = (lead: LeadData) => {
    setLeadToDelete(lead);
    setDeleteDialogOpen(true);
  };

  const handleDownload = async (lead: LeadData) => {
    try {
      toast.success("Processing files for download...");

      // Download dialables file to get uploaded phone numbers
      const { data: dialablesData, error: dialablesError } = await supabase.storage
        .from('lead-files')
        .download(lead.dialablesFilePath!);

      if (dialablesError) {
        toast.error("Failed to download dialables file");
        return;
      }

      // Parse dialables file to extract uploaded phone numbers
      const dialablesText = await dialablesData.text();
      const dialablesLines = dialablesText.trim().split('\n');
      const dialablesHeaders = dialablesLines[0].split('\t');
      const phoneColumnIndex = dialablesHeaders.indexOf(lead.dialablesPhoneColumn);
      
      const uploadedPhones = new Set<string>();
      for (let i = 1; i < dialablesLines.length; i++) {
        const row = dialablesLines[i].split('\t');
        if (row[phoneColumnIndex]) {
          // Normalize phone number (remove non-digits)
          const normalizedPhone = row[phoneColumnIndex].replace(/\D/g, '');
          uploadedPhones.add(normalizedPhone);
        }
      }

      // Download main file
      const { data: mainData, error: mainError } = await supabase.storage
        .from('lead-files')
        .download(lead.mainFilePath!);

      if (mainError) {
        toast.error("Failed to download main file");
        return;
      }

      // Parse main file and filter out uploaded numbers
      const mainText = await mainData.text();
      const mainLines = mainText.trim().split('\n');
      
      // Detect delimiter
      const firstLine = mainLines[0];
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const delimiter = semicolonCount > commaCount ? ';' : ',';
      
      const headers = mainLines[0].split(delimiter);
      const phoneColIndex = headers.indexOf(lead.mainPhoneColumn || '');
      
      if (phoneColIndex === -1) {
        toast.error("Could not find phone column in main file");
        return;
      }

      // Filter rows
      const filteredLines = [mainLines[0]]; // Keep header
      let filteredCount = 0;
      
      for (let i = 1; i < mainLines.length; i++) {
        const row = mainLines[i].split(delimiter);
        const phoneNumber = row[phoneColIndex] || '';
        const normalizedPhone = phoneNumber.replace(/\D/g, '');
        
        // Keep row if phone number was NOT uploaded
        if (!uploadedPhones.has(normalizedPhone)) {
          filteredLines.push(mainLines[i]);
          filteredCount++;
        }
      }

      // Create filtered CSV
      const filteredCSV = filteredLines.join('\n');
      const blob = new Blob([filteredCSV], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      // Download filtered file
      const a = document.createElement('a');
      a.href = url;
      a.download = `filtered_${lead.filename}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Downloaded filtered file with ${filteredCount} unuploaded leads (removed ${uploadedPhones.size} uploaded)`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to process and download files");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;

    setIsDeleting(true);

    try {
      // Delete files from storage
      const filesToDelete = [];
      if (leadToDelete.mainFilePath) filesToDelete.push(leadToDelete.mainFilePath);
      if (leadToDelete.dialablesFilePath) filesToDelete.push(leadToDelete.dialablesFilePath);
      if (leadToDelete.unprocessedFilePath) filesToDelete.push(leadToDelete.unprocessedFilePath);

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('lead-files')
          .remove(filesToDelete);

        if (storageError) {
          console.error("Storage deletion error:", storageError);
          toast.error("Failed to delete files from storage");
          return;
        }
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadToDelete.dbId);

      if (dbError) {
        console.error("Database deletion error:", dbError);
        toast.error("Failed to delete record from database");
        return;
      }

      toast.success("Lead deleted successfully!");
      fetchLeads(); // Refresh the list
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("An error occurred while deleting");
    } finally {
      setIsDeleting(false);
    }
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
                      onClick={() => {
                        setSelectedLead(lead);
                        setDetailsModalOpen(true);
                      }}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(lead)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="bg-danger hover:bg-danger/90"
                      onClick={() => handleDeleteClick(lead)}
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
      
      <LeadDetailsModal 
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        leadData={selectedLead}
        onColumnUpdate={fetchLeads}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead file? This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The database record</li>
                <li>The main CSV file</li>
                <li>The dialables file</li>
              </ul>
              <p className="mt-2 font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-danger hover:bg-danger/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

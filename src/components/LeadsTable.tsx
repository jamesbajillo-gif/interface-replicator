import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const leadsData: LeadData[] = [
  {
    id: 5,
    entryDate: "2025-09-19",
    listId: 9265,
    affiliateId: 21,
    clickId: "668cae97b4d47d3.00576045",
    filename: "ID 21 - 668cae97b4d47d3 - 1.csv",
    fileSize: "16.67 MB",
    leads: "362,346",
    uploaded: "95,617",
    failed: "73.52%",
    unprocessed: "0",
    uploadedAt: "2025-11-24 00:45:42",
  },
  {
    id: 4,
    entryDate: "2025-11-11",
    listId: 9341,
    affiliateId: 32,
    clickId: "368dc4e0e917711.84009355",
    filename: "TC_Debt_1760105669_1111 - export_1760105669_34094 (3).csv",
    fileSize: "22.54 MB",
    leads: "34,094",
    uploaded: "11,048",
    failed: "67.59%",
    unprocessed: "0",
    uploadedAt: "2025-11-24 00:41:53",
  },
  {
    id: 3,
    entryDate: "2025-10-17",
    listId: 9321,
    affiliateId: 16,
    clickId: "468ed406a837e21.06053311",
    filename: "16 - 468ed406a837e21.06053311.csv",
    fileSize: "34 MB",
    leads: "387,467",
    uploaded: "191,761",
    failed: "50.51%",
    unprocessed: "0",
    uploadedAt: "2025-11-24 00:41:03",
  },
  {
    id: 2,
    entryDate: "2025-10-17",
    listId: 9323,
    affiliateId: 16,
    clickId: "268ed407e9d3402.02040256",
    filename: "16 - 268ed407e9d3402.02040256.csv",
    fileSize: "20.36 MB",
    leads: "139,289",
    uploaded: "110,596",
    failed: "20.60%",
    unprocessed: "0",
    uploadedAt: "2025-11-24 00:39:32",
  },
  {
    id: 1,
    entryDate: "2025-10-14",
    listId: 9313,
    affiliateId: 16,
    clickId: "168ee499ab5e157.66293388",
    filename: "16 - 168ee499ab5e157.66293388.csv",
    fileSize: "6.2 MB",
    leads: "328,560",
    uploaded: "116,609",
    failed: "64.51%",
    unprocessed: "0",
    uploadedAt: "2025-11-24 00:38:31",
  },
];

export const LeadsTable = () => {
  return (
    <div className="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">ID</TableHead>
            <TableHead className="font-semibold">Entry Date</TableHead>
            <TableHead className="font-semibold">List ID</TableHead>
            <TableHead className="font-semibold">Affiliate ID</TableHead>
            <TableHead className="font-semibold">ClickID</TableHead>
            <TableHead className="font-semibold">Filename</TableHead>
            <TableHead className="font-semibold">File Size</TableHead>
            <TableHead className="font-semibold">Leads</TableHead>
            <TableHead className="font-semibold">Uploaded</TableHead>
            <TableHead className="font-semibold">Failed</TableHead>
            <TableHead className="font-semibold">Unprocessed</TableHead>
            <TableHead className="font-semibold">Uploaded At</TableHead>
            <TableHead className="font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leadsData.map((lead) => (
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
  );
};

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (data: ParsedLeadData) => void;
}

interface ParsedLeadData {
  entryDate: string;
  listId: string;
  affiliateId: string;
  clickId: string;
  filename: string;
  fileSize: string;
  leads: number;
  uploaded: number;
  mainFilePath: string;
  dialablesFilePath: string;
  mainPhoneColumn: string | null;
  dialablesPhoneColumn: string;
}

interface UploadedFile {
  file: File;
  type: "main" | "dialables";
}

export const FileUploadModal = ({ open, onOpenChange, onUploadComplete }: FileUploadModalProps) => {
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [dialablesFile, setDialablesFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const detectFileType = (filename: string): "main" | "dialables" | null => {
    // Dialables pattern: contains LIST_ or is a .txt file (check first to prioritize)
    if (filename.includes('LIST_') || (!filename.endsWith('.csv') && filename.endsWith('.txt'))) {
      return "dialables";
    }
    // Main file pattern: any CSV file
    if (filename.endsWith('.csv')) {
      return "main";
    }
    return null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  };

  const processFiles = (files: File[]) => {
    if (files.length > 2) {
      toast({
        title: "Too many files",
        description: "Please upload exactly 2 files: Main file and Dialables file",
        variant: "destructive",
      });
      return;
    }

    files.forEach(file => {
      const fileType = detectFileType(file.name);
      
      if (fileType === "main" && !mainFile) {
        setMainFile(file);
      } else if (fileType === "dialables" && !dialablesFile) {
        setDialablesFile(file);
      } else {
        toast({
          title: "File type detection",
          description: `Could not detect type for ${file.name}. Please ensure filenames match the expected pattern.`,
          variant: "destructive",
        });
      }
    });
  };

  const parseMainFile = async (file: File): Promise<number> => {
    const text = await file.text();
    const lines = text.trim().split('\n');
    return lines.length;
  };

  const detectDelimiter = (text: string): ',' | ';' => {
    // Check first line to determine delimiter
    const firstLine = text.trim().split('\n')[0];
    
    // Count occurrences of each delimiter
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    
    // Return the delimiter with more occurrences
    return semicolonCount > commaCount ? ';' : ',';
  };

  const detectPhoneColumn = async (file: File): Promise<string | null> => {
    const text = await file.text();
    const lines = text.trim().split('\n');
    
    if (lines.length < 6) return null; // Need at least header + 5 rows
    
    // Auto-detect delimiter
    const delimiter = detectDelimiter(text);
    const headers = lines[0].split(delimiter).map(h => h.trim());
    
    // Check each column
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      let validPhoneCount = 0;
      
      // Check rows 1-5 (or fewer if file is smaller)
      for (let rowIndex = 1; rowIndex < Math.min(6, lines.length); rowIndex++) {
        const row = lines[rowIndex].split(delimiter);
        const cellValue = row[colIndex] || '';
        
        // Remove all non-digit characters
        const digitsOnly = cellValue.replace(/\D/g, '');
        
        // Check if it has 10 or 11 digits
        if (digitsOnly.length === 10 || digitsOnly.length === 11) {
          validPhoneCount++;
        }
      }
      
      // If at least 5 rows have valid phone numbers, this is our column
      if (validPhoneCount >= 5) {
        return headers[colIndex];
      }
    }
    
    return null; // No suitable column found
  };

  const parseDialablesFile = async (file: File): Promise<{ entryDate: string; listId: string; affiliateId: string; clickId: string; rowCount: number }> => {
    const text = await file.text();
    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error("Dialables file is empty or invalid");
    }

    // Parse header and first data row
    const headers = lines[0].split('\t');
    const firstDataRow = lines[1].split('\t');
    
    const getColumnValue = (columnName: string): string => {
      const index = headers.indexOf(columnName);
      return index >= 0 ? firstDataRow[index] : '';
    };

    return {
      entryDate: getColumnValue('entry_date').split(' ')[0], // Get just the date part
      listId: getColumnValue('list_id'),
      affiliateId: getColumnValue('vendor_lead_code'),
      clickId: getColumnValue('source_id'),
      rowCount: lines.length - 1, // Exclude header
    };
  };

  const handleUpload = async () => {
    if (!mainFile || !dialablesFile) {
      toast({
        title: "Missing files",
        description: "Please upload both Main file and Dialables file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Parse files first to get affiliate ID and detect phone columns
      const [mainRowCount, dialablesData, mainPhoneColumn] = await Promise.all([
        parseMainFile(mainFile),
        parseDialablesFile(dialablesFile),
        detectPhoneColumn(mainFile),
      ]);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Upload files to storage: {user_id}/lead{affiliate_id}/{filename}
      const storagePath = `${user.id}/lead${dialablesData.affiliateId}`;
      
      const [mainUploadResult, dialablesUploadResult] = await Promise.all([
        supabase.storage
          .from('lead-files')
          .upload(`${storagePath}/${mainFile.name}`, mainFile, {
            cacheControl: '3600',
            upsert: true
          }),
        supabase.storage
          .from('lead-files')
          .upload(`${storagePath}/${dialablesFile.name}`, dialablesFile, {
            cacheControl: '3600',
            upsert: true
          })
      ]);

      if (mainUploadResult.error) {
        throw new Error(`Main file upload failed: ${mainUploadResult.error.message}`);
      }
      if (dialablesUploadResult.error) {
        throw new Error(`Dialables file upload failed: ${dialablesUploadResult.error.message}`);
      }

      const fileSize = ((mainFile.size + dialablesFile.size) / (1024 * 1024)).toFixed(2) + " MB";

      const parsedData: ParsedLeadData = {
        entryDate: dialablesData.entryDate,
        listId: dialablesData.listId,
        affiliateId: dialablesData.affiliateId,
        clickId: dialablesData.clickId,
        filename: mainFile.name,
        fileSize: fileSize,
        leads: mainRowCount,
        uploaded: dialablesData.rowCount,
        mainFilePath: mainUploadResult.data.path,
        dialablesFilePath: dialablesUploadResult.data.path,
        mainPhoneColumn: mainPhoneColumn,
        dialablesPhoneColumn: 'phone_numbers',
      };

      onUploadComplete(parsedData);
      
      toast({
        title: "Upload successful",
        description: `Uploaded files to lead${dialablesData.affiliateId} folder and processed ${mainRowCount} leads`,
      });

      // Reset state
      setMainFile(null);
      setDialablesFile(null);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process files",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (type: "main" | "dialables") => {
    if (type === "main") {
      setMainFile(null);
    } else {
      setDialablesFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Lead Files</DialogTitle>
          <DialogDescription>
            Upload exactly 2 files: Main CSV file and Dialables file (should contain LIST_ or be .txt)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag and Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/20"
            }`}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-foreground mb-2">
              Drag and drop your files here, or click to browse
            </p>
            <input
              type="file"
              multiple
              accept=".csv,.txt"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="secondary" className="mt-2" asChild>
                <span>Browse Files</span>
              </Button>
            </label>
          </div>

          {/* File List */}
          <div className="space-y-2">
            {mainFile && (
              <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-medium">Main File</p>
                    <p className="text-xs text-muted-foreground">{mainFile.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile("main")}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {dialablesFile && (
              <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-medium">Dialables File</p>
                    <p className="text-xs text-muted-foreground">{dialablesFile.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile("dialables")}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {!mainFile && !dialablesFile && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No files uploaded yet</p>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!mainFile || !dialablesFile || isProcessing}
            >
              {isProcessing ? "Processing..." : "Upload & Process"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

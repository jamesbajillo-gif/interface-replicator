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
  unprocessed: number;
  mainFilePath: string;
  dialablesFilePath: string;
  unprocessedFilePath: string | null;
  mainPhoneColumn: string | null;
  dialablesPhoneColumn: string;
}

interface UploadedFile {
  file: File;
  type: "main" | "dialables" | "unprocessed";
}

export const FileUploadModal = ({ open, onOpenChange, onUploadComplete }: FileUploadModalProps) => {
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [dialablesFile, setDialablesFile] = useState<File | null>(null);
  const [unprocessedFile, setUnprocessedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadPercentage, setUploadPercentage] = useState<number>(0);

  const detectFileType = (filename: string): "main" | "dialables" | "unprocessed" | null => {
    // Unprocessed pattern: contains _unprocessed (check first to prioritize)
    if (filename.includes('_unprocessed')) {
      return "unprocessed";
    }
    // Dialables pattern: contains LIST_ or is a .txt file
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
    if (files.length > 3) {
      toast({
        title: "Too many files",
        description: "Please upload 2-3 files: Main file, Dialables file, and optionally Unprocessed file",
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
      } else if (fileType === "unprocessed" && !unprocessedFile) {
        setUnprocessedFile(file);
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
    return lines.length - 1; // Exclude header
  };

  const parseUnprocessedFile = async (file: File): Promise<number> => {
    const text = await file.text();
    const lines = text.trim().split('\n');
    return lines.length - 1; // Exclude header
  };

  const detectDelimiter = (text: string): ',' | ';' | '\t' => {
    // Check first line to determine delimiter
    const firstLine = text.trim().split('\n')[0];
    
    // Count occurrences of each delimiter
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    // Return the delimiter with most occurrences
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return semicolonCount > commaCount ? ';' : ',';
  };

  const detectPhoneColumn = async (file: File): Promise<string | null> => {
    const text = await file.text();
    const lines = text.trim().split('\n').filter(line => line.trim()); // Remove empty lines
    
    if (lines.length < 2) return null; // Need at least header + 1 data row
    
    // Auto-detect delimiter
    const delimiter = detectDelimiter(text);
    const headers = lines[0].split(delimiter).map(h => h.trim());
    
    // Determine how many rows to check (up to 10 data rows)
    const rowsToCheck = Math.min(10, lines.length - 1);
    const minValidPhones = Math.max(3, Math.ceil(rowsToCheck * 0.6)); // At least 60% or minimum 3
    
    // Check each column
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      let validPhoneCount = 0;
      
      // Check up to 10 data rows
      for (let rowIndex = 1; rowIndex <= rowsToCheck; rowIndex++) {
        const row = lines[rowIndex].split(delimiter);
        const cellValue = (row[colIndex] || '').trim();
        
        // Skip empty cells
        if (!cellValue) continue;
        
        // Remove all non-digit characters
        const digitsOnly = cellValue.replace(/\D/g, '');
        
        // Check if it has 10 or 11 digits
        if (digitsOnly.length === 10 || digitsOnly.length === 11) {
          validPhoneCount++;
        }
      }
      
      // If enough rows have valid phone numbers (60% threshold or min 3), this is our column
      if (validPhoneCount >= minValidPhones) {
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
    setUploadProgress("Analyzing files...");
    setUploadPercentage(0);

    try {
      // Parse files first to get affiliate ID and detect phone columns
      toast({
        title: "Processing files",
        description: "Analyzing file structure and detecting phone columns...",
      });

      setUploadPercentage(10);

      const [mainRowCount, dialablesData, mainPhoneColumn, unprocessedRowCount] = await Promise.all([
        parseMainFile(mainFile),
        parseDialablesFile(dialablesFile),
        detectPhoneColumn(mainFile),
        unprocessedFile ? parseUnprocessedFile(unprocessedFile) : Promise.resolve(0),
      ]);

      setUploadPercentage(25);

      if (mainPhoneColumn) {
        toast({
          title: "Phone column detected",
          description: `Found phone numbers in column: "${mainPhoneColumn}"`,
        });
      } else {
        toast({
          title: "Warning",
          description: "Could not auto-detect phone column. You can set it manually later.",
          variant: "destructive",
        });
      }

      setUploadProgress("Authenticating...");
      setUploadPercentage(30);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      setUploadProgress(`Uploading files to lead${dialablesData.affiliateId}...`);
      setUploadPercentage(35);

      toast({
        title: "Uploading files",
        description: `Uploading ${unprocessedFile ? '3' : '2'} files to storage...`,
      });

      // Upload files to storage: lead{affiliate_id}/{filename}
      const storagePath = `lead${dialablesData.affiliateId}`;
      
      // Calculate total size for progress tracking
      const totalSize = mainFile.size + dialablesFile.size + (unprocessedFile?.size || 0);
      let uploadedSize = 0;

      // Upload main file
      setUploadProgress(`Uploading main file (${(mainFile.size / 1024 / 1024).toFixed(2)} MB)...`);
      const mainUploadResult = await supabase.storage
        .from('lead-files')
        .upload(`${storagePath}/${mainFile.name}`, mainFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (mainUploadResult.error) {
        throw new Error(`Main file upload failed: ${mainUploadResult.error.message}`);
      }

      uploadedSize += mainFile.size;
      const progressAfterMain = 35 + Math.floor((uploadedSize / totalSize) * 50);
      setUploadPercentage(progressAfterMain);

      // Upload dialables file
      setUploadProgress(`Uploading dialables file (${(dialablesFile.size / 1024 / 1024).toFixed(2)} MB)...`);
      const dialablesUploadResult = await supabase.storage
        .from('lead-files')
        .upload(`${storagePath}/${dialablesFile.name}`, dialablesFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (dialablesUploadResult.error) {
        throw new Error(`Dialables file upload failed: ${dialablesUploadResult.error.message}`);
      }

      uploadedSize += dialablesFile.size;
      const progressAfterDialables = 35 + Math.floor((uploadedSize / totalSize) * 50);
      setUploadPercentage(progressAfterDialables);

      // Upload unprocessed file if exists
      let unprocessedUploadResult;
      if (unprocessedFile) {
        setUploadProgress(`Uploading unprocessed file (${(unprocessedFile.size / 1024 / 1024).toFixed(2)} MB)...`);
        unprocessedUploadResult = await supabase.storage
          .from('lead-files')
          .upload(`${storagePath}/${unprocessedFile.name}`, unprocessedFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (unprocessedUploadResult.error) {
          throw new Error(`Unprocessed file upload failed: ${unprocessedUploadResult.error.message}`);
        }

        uploadedSize += unprocessedFile.size;
      }

      setUploadPercentage(85);
      setUploadProgress("Saving to database...");

      const fileSize = (totalSize / (1024 * 1024)).toFixed(2) + " MB";

      const parsedData: ParsedLeadData = {
        entryDate: dialablesData.entryDate,
        listId: dialablesData.listId,
        affiliateId: dialablesData.affiliateId,
        clickId: dialablesData.clickId,
        filename: mainFile.name,
        fileSize: fileSize,
        leads: mainRowCount,
        uploaded: dialablesData.rowCount,
        unprocessed: unprocessedRowCount,
        mainFilePath: mainUploadResult.data.path,
        dialablesFilePath: dialablesUploadResult.data.path,
        unprocessedFilePath: unprocessedUploadResult?.data?.path || null,
        mainPhoneColumn: mainPhoneColumn,
        dialablesPhoneColumn: 'phone_numbers',
      };

      setUploadPercentage(95);
      onUploadComplete(parsedData);
      
      setUploadPercentage(100);
      toast({
        title: "✅ Upload successful",
        description: `Processed ${mainRowCount.toLocaleString()} leads from ${unprocessedFile ? '3' : '2'} files`,
      });

      // Reset state
      setMainFile(null);
      setDialablesFile(null);
      setUnprocessedFile(null);
      setUploadProgress("");
      setUploadPercentage(0);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process files",
        variant: "destructive",
      });
      setUploadProgress("");
      setUploadPercentage(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (type: "main" | "dialables" | "unprocessed") => {
    if (type === "main") {
      setMainFile(null);
    } else if (type === "dialables") {
      setDialablesFile(null);
    } else {
      setUnprocessedFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Lead Files</DialogTitle>
          <DialogDescription>
            Upload 2-3 files: Main CSV file, Dialables file (LIST_ or .txt), and optionally Unprocessed file (_unprocessed)
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

            {unprocessedFile && (
              <div className="flex items-center justify-between p-3 bg-info/10 border border-info/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-info" />
                  <div>
                    <p className="text-sm font-medium">Unprocessed File (Optional)</p>
                    <p className="text-xs text-muted-foreground">{unprocessedFile.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile("unprocessed")}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {!mainFile && !dialablesFile && !unprocessedFile && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No files uploaded yet</p>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isProcessing && uploadProgress && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <p className="text-sm font-medium text-foreground">{uploadProgress}</p>
                </div>
                <span className="text-sm font-bold text-primary">{uploadPercentage}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!mainFile || !dialablesFile || isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </span>
              ) : (
                "Upload & Process"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

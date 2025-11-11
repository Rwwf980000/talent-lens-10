import { useCallback } from "react";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PdfUploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

export const PdfUploadZone = ({ onFilesAdded, disabled }: PdfUploadZoneProps) => {
  const { toast } = useToast();

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const pdfFiles = Array.from(files).filter(file => {
      if (file.type === "application/pdf") {
        return true;
      }
      toast({
        title: "Invalid file type",
        description: `${file.name} is not a PDF file`,
        variant: "destructive",
      });
      return false;
    });

    if (pdfFiles.length > 0) {
      onFilesAdded(pdfFiles);
    }
  }, [onFilesAdded, toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
        disabled 
          ? "border-muted bg-muted/20 cursor-not-allowed" 
          : "border-primary/50 hover:border-primary bg-primary/5 hover:bg-primary/10 cursor-pointer"
      }`}
    >
      <input
        type="file"
        id="pdf-upload"
        multiple
        accept=".pdf"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
      <label
        htmlFor="pdf-upload"
        className={`flex flex-col items-center gap-4 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">
            Drop PDF resumes here or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Accept multiple PDF files only
          </p>
        </div>
      </label>
    </div>
  );
};

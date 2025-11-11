import { X, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  textContent?: string;
}

interface UploadedFilesListProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export const UploadedFilesList = ({ files, onRemove }: UploadedFilesListProps) => {
  if (files.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {files.length} resume{files.length !== 1 ? "s" : ""} uploaded
        </h3>
      </div>
      <div className="grid gap-2 max-h-60 overflow-y-auto">
        {files.map((file) => (
          <Card key={file.id} className="transition-all hover:shadow-md">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {file.textContent && (
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(file.id)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

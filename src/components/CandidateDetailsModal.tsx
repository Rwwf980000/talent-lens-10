import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CandidateResult {
  fileId: string;
  fileName: string;
  softSkills: number;
  hardSkills: number;
  potential: number;
  summary: string;
  overallScore: number;
}

interface CandidateDetailsModalProps {
  candidate: CandidateResult | null;
  isOpen: boolean;
  onClose: () => void;
  allCandidates: CandidateResult[];
  onNavigate: (direction: "prev" | "next") => void;
}

export const CandidateDetailsModal = ({
  candidate,
  isOpen,
  onClose,
  allCandidates,
  onNavigate,
}: CandidateDetailsModalProps) => {
  const { toast } = useToast();

  if (!candidate) return null;

  const currentIndex = allCandidates.findIndex(c => c.fileId === candidate.fileId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allCandidates.length - 1;

  const downloadIndividualReport = () => {
    const reportContent = `
TALENT EVALUATION REPORT
========================

Candidate: ${candidate.fileName}

SCORES
------
Soft Skills: ${candidate.softSkills}/100
Hard Skills: ${candidate.hardSkills}/100
Potential: ${candidate.potential}/100
Overall Score: ${candidate.overallScore}/100

SUMMARY
-------
${candidate.summary}
    `.trim();

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evaluation-${candidate.fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Individual report has been downloaded successfully.",
    });
  };

  const copySummary = () => {
    navigator.clipboard.writeText(candidate.summary);
    toast({
      title: "Copied!",
      description: "Summary copied to clipboard.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{candidate.fileName}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("prev")}
                disabled={!hasPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("next")}
                disabled={!hasNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Candidate {currentIndex + 1} of {allCandidates.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Soft Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{candidate.softSkills}</div>
                <Progress value={candidate.softSkills} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Hard Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{candidate.hardSkills}</div>
                <Progress value={candidate.hardSkills} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Potential</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{candidate.potential}</div>
                <Progress value={candidate.potential} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Overall</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{candidate.overallScore}</div>
                <Progress value={candidate.overallScore} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Evaluation Summary</CardTitle>
                <Button variant="ghost" size="sm" onClick={copySummary}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <CardDescription>Detailed analysis of the candidate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
                {candidate.summary}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={downloadIndividualReport}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

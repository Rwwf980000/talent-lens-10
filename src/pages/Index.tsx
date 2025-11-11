import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Sparkles, Download, RotateCcw, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PdfUploadZone } from "@/components/PdfUploadZone";
import { UploadedFilesList } from "@/components/UploadedFilesList";
import { ResultsTable } from "@/components/ResultsTable";
import { CandidateDetailsModal } from "@/components/CandidateDetailsModal";
import { extractTextFromPdf } from "@/utils/pdfParser";

interface DebugLog {
  timestamp: string;
  action: string;
  details: any;
  status?: string;
}

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  textContent?: string;
}

interface CandidateResult {
  fileId: string;
  fileName: string;
  softSkills: number;
  hardSkills: number;
  potential: number;
  summary: string;
  overallScore: number;
}

const Index = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [showJobTitleInput, setShowJobTitleInput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState({ current: 0, total: 0 });
  const [allResults, setAllResults] = useState<CandidateResult[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResult | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const { toast } = useToast();

  // Load from localStorage on mount
  useEffect(() => {
    const savedJobDesc = localStorage.getItem("jobDescription");
    if (savedJobDesc) setJobDescription(savedJobDesc);
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem("jobDescription", jobDescription);
  }, [jobDescription]);

  const generateJobDescription = async () => {
    if (!jobTitle.trim()) {
      toast({
        title: "Job title required",
        description: "Please enter a job title to generate a description.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-job-description`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ jobTitle }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate job description");
      }

      const data = await response.json();
      setJobDescription(data.jobDescription);
      setShowJobTitleInput(false);
      setJobTitle("");
      toast({
        title: "Success",
        description: "Job description generated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate job description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFilesAdded = async (newFiles: File[]) => {
    const filesWithIds = newFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
    }));

    setUploadedFiles(prev => [...prev, ...filesWithIds]);

    // Extract text from PDFs
    for (const fileData of filesWithIds) {
      try {
        const text = await extractTextFromPdf(fileData.file);
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === fileData.id ? { ...f, textContent: text } : f
          )
        );
      } catch (error) {
        toast({
          title: "PDF Processing Error",
          description: error instanceof Error ? error.message : `Failed to process ${fileData.name}`,
          variant: "destructive",
        });
        // Remove the file if it failed to process
        setUploadedFiles(prev => prev.filter(f => f.id !== fileData.id));
      }
    }
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const evaluateCandidates = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: "Job description required",
        description: "Please enter a job description first.",
        variant: "destructive",
      });
      return;
    }

    const filesToEvaluate = uploadedFiles.filter(f => f.textContent);
    if (filesToEvaluate.length === 0) {
      toast({
        title: "No resumes ready",
        description: "Please wait for PDFs to finish processing.",
        variant: "destructive",
      });
      return;
    }

    setIsEvaluating(true);
    setEvaluationProgress({ current: 0, total: filesToEvaluate.length });
    setAllResults([]);
    const newDebugLogs: DebugLog[] = [];

    const results: CandidateResult[] = [];

    for (let i = 0; i < filesToEvaluate.length; i++) {
      const file = filesToEvaluate[i];
      setEvaluationProgress({ current: i + 1, total: filesToEvaluate.length });

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-candidate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ 
              jobDescription, 
              resume: file.textContent 
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to evaluate candidate");
        }

        const data = await response.json();

        // Extract debug logs if present
        if (data.debugLogs) {
          newDebugLogs.push(...data.debugLogs);
          delete data.debugLogs;
        }

        const result: CandidateResult = {
          fileId: file.id,
          fileName: file.name.replace('.pdf', ''),
          softSkills: data.softSkills,
          hardSkills: data.hardSkills,
          potential: data.potential,
          summary: data.summary,
          overallScore: Math.round((data.softSkills + data.hardSkills + data.potential) / 3),
        };

        results.push(result);
        setAllResults([...results]);
      } catch (error) {
        toast({
          title: "Evaluation Error",
          description: `Failed to evaluate ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        });
        
        newDebugLogs.push({
          timestamp: new Date().toISOString(),
          action: `Evaluation Failed: ${file.name}`,
          details: { error: error instanceof Error ? error.message : "Unknown error" },
          status: "error",
        });
      }
    }

    setDebugLogs(newDebugLogs);
    setIsEvaluating(false);

    // Smooth scroll to results
    setTimeout(() => {
      document.getElementById("results-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 100);

    toast({
      title: "Evaluation Complete",
      description: `Successfully evaluated ${results.length} out of ${filesToEvaluate.length} candidates via CrewAI!`,
    });
  };

  const resetForm = () => {
    setJobDescription("");
    setUploadedFiles([]);
    setAllResults([]);
    setDebugLogs([]);
    setShowJobTitleInput(false);
    setJobTitle("");
    setEvaluationProgress({ current: 0, total: 0 });
    localStorage.removeItem("jobDescription");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const downloadAllReports = () => {
    if (allResults.length === 0) return;

    const avgSoftSkills = Math.round(allResults.reduce((sum, r) => sum + r.softSkills, 0) / allResults.length);
    const avgHardSkills = Math.round(allResults.reduce((sum, r) => sum + r.hardSkills, 0) / allResults.length);
    const avgPotential = Math.round(allResults.reduce((sum, r) => sum + r.potential, 0) / allResults.length);
    const avgOverall = Math.round(allResults.reduce((sum, r) => sum + r.overallScore, 0) / allResults.length);

    const topCandidates = [...allResults]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 3)
      .map(c => `${c.fileName} (${c.overallScore})`)
      .join(', ');

    const reportContent = `
BULK TALENT EVALUATION REPORT
==============================

Total Candidates Evaluated: ${allResults.length}

SUMMARY STATISTICS
------------------
Average Soft Skills: ${avgSoftSkills}/100
Average Hard Skills: ${avgHardSkills}/100
Average Potential: ${avgPotential}/100
Average Overall Score: ${avgOverall}/100

Top Candidates: ${topCandidates}

JOB DESCRIPTION
--------------
${jobDescription}

INDIVIDUAL RESULTS
------------------
${allResults.map((r, i) => `
${i + 1}. ${r.fileName}
   Overall Score: ${r.overallScore}/100
   Soft Skills: ${r.softSkills}/100
   Hard Skills: ${r.hardSkills}/100
   Potential: ${r.potential}/100
   
   Summary:
   ${r.summary}
   
   ---
`).join('\n')}
    `.trim();

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-talent-evaluation-report.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: `Bulk evaluation report with ${allResults.length} candidates has been downloaded.`,
    });
  };

  const handleViewDetails = (candidate: CandidateResult) => {
    setSelectedCandidate(candidate);
    setIsDetailsModalOpen(true);
  };

  const handleNavigateCandidate = (direction: "prev" | "next") => {
    if (!selectedCandidate) return;
    const currentIndex = allResults.findIndex(c => c.fileId === selectedCandidate.fileId);
    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < allResults.length) {
      setSelectedCandidate(allResults[newIndex]);
    }
  };

  const isFormValid = jobDescription.trim().length > 0 && uploadedFiles.some(f => f.textContent);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Talent Evaluator</h1>
          </div>
          <p className="text-muted-foreground mt-2">AI-powered candidate assessment tool</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Input Section */}
        <div className="grid gap-6 mb-8">
          {/* Job Description */}
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Job Description
              </CardTitle>
              <CardDescription>
                Enter or generate a job description for the role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste or type the job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[300px] resize-none transition-all focus:shadow-md"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{jobDescription.length} characters</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setJobDescription("")}
                    disabled={!jobDescription}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {!showJobTitleInput ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowJobTitleInput(true)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate from Title
                </Button>
              ) : (
                <div className="space-y-2 animate-fade-in">
                  <Input
                    placeholder="Enter job title (e.g., Senior Software Engineer)"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && generateJobDescription()}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={generateJobDescription}
                      disabled={isGenerating || !jobTitle.trim()}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowJobTitleInput(false);
                        setJobTitle("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PDF Upload */}
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Candidate Resumes
              </CardTitle>
              <CardDescription>
                Upload PDF resumes for bulk evaluation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PdfUploadZone 
                onFilesAdded={handleFilesAdded}
                disabled={isEvaluating}
              />
              <UploadedFilesList 
                files={uploadedFiles}
                onRemove={handleRemoveFile}
              />
            </CardContent>
          </Card>
        </div>

        {/* Evaluate Button */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <Button
            size="lg"
            className="h-14 px-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            onClick={evaluateCandidates}
            disabled={!isFormValid || isEvaluating}
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Evaluating candidate {evaluationProgress.current} of {evaluationProgress.total}...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Evaluate Candidates
              </>
            )}
          </Button>
          {isEvaluating && (
            <div className="w-full max-w-md">
              <div className="text-sm text-muted-foreground text-center mb-2">
                Progress: {evaluationProgress.current} / {evaluationProgress.total}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {allResults.length > 0 && (
          <div id="results-section" className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Evaluation Results</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadAllReports}>
                  <Download className="h-4 w-4 mr-2" />
                  Download All Reports
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start New Evaluation
                </Button>
              </div>
            </div>

            <ResultsTable 
              results={allResults}
              onViewDetails={handleViewDetails}
            />
          </div>
        )}

        {/* Candidate Details Modal */}
        <CandidateDetailsModal
          candidate={selectedCandidate}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          allCandidates={allResults}
          onNavigate={handleNavigateCandidate}
        />
      </main>

      {/* Debug Console */}
      {debugLogs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <Collapsible open={isDebugOpen} onOpenChange={setIsDebugOpen}>
            <div className="bg-card border-t shadow-lg">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Debug Console</span>
                    <span className="text-sm text-muted-foreground">
                      ({debugLogs.length} logs)
                    </span>
                  </div>
                  {isDebugOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="max-h-96 overflow-y-auto px-6 pb-4">
                  <div className="space-y-2">
                    {debugLogs.map((log, index) => (
                      <Card
                        key={index}
                        className={`transition-all ${
                          log.status === 'error'
                            ? 'border-destructive bg-destructive/5'
                            : log.status === 'success'
                            ? 'border-primary bg-primary/5'
                            : 'border-muted'
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{log.action}</span>
                                {log.status && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      log.status === 'error'
                                        ? 'bg-destructive text-destructive-foreground'
                                        : log.status === 'success'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {log.status}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </div>
                              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      )}
    </div>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, User, Sparkles, Download, RotateCcw, Copy } from "lucide-react";

interface EvaluationResults {
  softSkills: number;
  hardSkills: number;
  potential: number;
  summary: string;
}

const Index = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [showJobTitleInput, setShowJobTitleInput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvaluationResults | null>(null);
  const { toast } = useToast();

  // Load from localStorage on mount
  useEffect(() => {
    const savedJobDesc = localStorage.getItem("jobDescription");
    const savedResume = localStorage.getItem("resume");
    if (savedJobDesc) setJobDescription(savedJobDesc);
    if (savedResume) setResume(savedResume);
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem("jobDescription", jobDescription);
  }, [jobDescription]);

  useEffect(() => {
    localStorage.setItem("resume", resume);
  }, [resume]);

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
      const response = await fetch("/api/generate-job-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate job description");
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
        description: "Failed to generate job description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluateCandidate = async () => {
    setIsEvaluating(true);
    try {
      const response = await fetch("/api/evaluate-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, resume }),
      });

      if (!response.ok) {
        throw new Error("Failed to evaluate candidate");
      }

      const data = await response.json();
      setResults(data);
      
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById("results-section")?.scrollIntoView({ 
          behavior: "smooth",
          block: "start"
        });
      }, 100);

      toast({
        title: "Evaluation Complete",
        description: "Candidate has been successfully evaluated!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to evaluate candidate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetForm = () => {
    setJobDescription("");
    setResume("");
    setResults(null);
    setShowJobTitleInput(false);
    setJobTitle("");
    localStorage.removeItem("jobDescription");
    localStorage.removeItem("resume");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  const downloadReport = () => {
    if (!results) return;

    const reportContent = `
TALENT EVALUATION REPORT
========================

Soft Skills Score: ${results.softSkills}/100
Hard Skills Score: ${results.hardSkills}/100
Potential Score: ${results.potential}/100

SUMMARY
-------
${results.summary}

JOB DESCRIPTION
--------------
${jobDescription}

RESUME
------
${resume}
    `.trim();

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "talent-evaluation-report.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Evaluation report has been downloaded successfully.",
    });
  };

  const isFormValid = jobDescription.trim().length > 0 && resume.trim().length > 0;

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
        <div className="grid md:grid-cols-2 gap-6 mb-8">
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

          {/* Resume */}
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Resume
              </CardTitle>
              <CardDescription>
                Paste the candidate's resume text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste the candidate's resume here..."
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  className={`min-h-[300px] resize-none transition-all focus:shadow-md ${
                    resume ? "border-primary/50" : ""
                  }`}
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{resume.length} characters</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResume("")}
                    disabled={!resume}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evaluate Button */}
        <div className="flex justify-center mb-12">
          <Button
            size="lg"
            className="h-14 px-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            onClick={evaluateCandidate}
            disabled={!isFormValid || isEvaluating}
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analyzing candidate...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Evaluate Candidate
              </>
            )}
          </Button>
        </div>

        {/* Results Section */}
        {results && (
          <div id="results-section" className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Evaluation Results</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Evaluate Another
                </Button>
              </div>
            </div>

            {/* Score Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Soft Skills */}
              <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Soft Skills</CardTitle>
                  <CardDescription>Communication, teamwork, adaptability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-4xl font-bold text-primary">
                    {results.softSkills}
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </div>
                  <Progress value={results.softSkills} className="h-3" />
                </CardContent>
              </Card>

              {/* Hard Skills */}
              <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Hard Skills</CardTitle>
                  <CardDescription>Technical abilities and expertise</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-4xl font-bold text-primary">
                    {results.hardSkills}
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </div>
                  <Progress value={results.hardSkills} className="h-3" />
                </CardContent>
              </Card>

              {/* Potential */}
              <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Potential</CardTitle>
                  <CardDescription>Growth and development capacity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-4xl font-bold text-primary">
                    {results.potential}
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </div>
                  <Progress value={results.potential} className="h-3" />
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Evaluation Summary</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(results.summary, "Summary")}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <CardDescription>Detailed analysis of the candidate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
                  {results.summary}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

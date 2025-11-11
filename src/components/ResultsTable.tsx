import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Eye } from "lucide-react";

interface CandidateResult {
  fileId: string;
  fileName: string;
  softSkills: number;
  hardSkills: number;
  potential: number;
  summary: string;
  overallScore: number;
}

interface ResultsTableProps {
  results: CandidateResult[];
  onViewDetails: (result: CandidateResult) => void;
}

type SortField = "fileName" | "softSkills" | "hardSkills" | "potential" | "overallScore";
type SortDirection = "asc" | "desc";

export const ResultsTable = ({ results, onViewDetails }: ResultsTableProps) => {
  const [sortField, setSortField] = useState<SortField>("overallScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [minScore, setMinScore] = useState<string>("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredAndSortedResults = useMemo(() => {
    let filtered = results;
    
    if (minScore) {
      const minScoreNum = parseFloat(minScore);
      if (!isNaN(minScoreNum)) {
        filtered = results.filter(r => r.overallScore >= minScoreNum);
      }
    }

    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const modifier = sortDirection === "asc" ? 1 : -1;
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * modifier;
      }
      return ((aVal as number) - (bVal as number)) * modifier;
    });
  }, [results, sortField, sortDirection, minScore]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Evaluation Results</CardTitle>
            <CardDescription>
              {filteredAndSortedResults.length} of {results.length} candidate{results.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min score filter..."
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-40"
              min="0"
              max="100"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("fileName")}
                    className="font-semibold"
                  >
                    Candidate <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                  </Button>
                </th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("softSkills")}
                    className="font-semibold"
                  >
                    Soft Skills <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                  </Button>
                </th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("hardSkills")}
                    className="font-semibold"
                  >
                    Hard Skills <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                  </Button>
                </th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("potential")}
                    className="font-semibold"
                  >
                    Potential <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                  </Button>
                </th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("overallScore")}
                    className="font-semibold"
                  >
                    Overall <ArrowUpDown className="ml-1 h-4 w-4 inline" />
                  </Button>
                </th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedResults.map((result) => (
                <tr key={result.fileId} className="border-b hover:bg-accent/50 transition-colors">
                  <td className="p-3">
                    <p className="font-medium text-sm">{result.fileName}</p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold w-8">{result.softSkills}</span>
                      <Progress value={result.softSkills} className="h-2 flex-1" />
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold w-8">{result.hardSkills}</span>
                      <Progress value={result.hardSkills} className="h-2 flex-1" />
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold w-8">{result.potential}</span>
                      <Progress value={result.potential} className="h-2 flex-1" />
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary w-8">{result.overallScore}</span>
                      <Progress value={result.overallScore} className="h-2 flex-1" />
                    </div>
                  </td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(result)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

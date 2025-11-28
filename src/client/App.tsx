import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function App() {
  const [envConfigured, setEnvConfigured] = useState(false);
  const [honeycombApiKey, setHoneycombApiKey] = useState("");
  const [numQueries, setNumQueries] = useState(100);
  const [queryDuration, setQueryDuration] = useState(10);
  const [enableRollup, setEnableRollup] = useState(true);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3001/api/status")
      .then((res) => res.json())
      .then((data) => {
        setEnvConfigured(data.hasEnvApiKey);
        if (data.hasEnvApiKey) {
          setMessage("✓ API key configured from environment");
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage("");
    try {
      const response = await fetch("http://localhost:3001/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numQueries,
          queryDurationMs: queryDuration,
          enableRollup,
          honeycombApiKey: honeycombApiKey || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(
          `Generated trace with ${data.queriesGenerated} queries! (Rollup: ${enableRollup ? "ON" : "OFF"})`
        );
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (error) {
      setMessage("Error: " + error);
    } finally {
      setGenerating(false);
    }
  };

  const isConfigured = envConfigured || honeycombApiKey.trim().length > 0;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Span Rollup Demo</h1>
          <p className="text-muted-foreground">
            Generate telemetry traces with SQL query rollup processing
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Configure Honeycomb API key for telemetry export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                Honeycomb API Key
                {envConfigured && (
                  <span className="ml-2 text-xs text-green-600 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Environment configured
                  </span>
                )}
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={envConfigured ? "Using environment key" : "Enter your Honeycomb API key"}
                value={honeycombApiKey}
                onChange={(e) => setHoneycombApiKey(e.target.value)}
              />
              {!envConfigured && honeycombApiKey.trim().length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  API key required - enter one above or set HONEYCOMB_API_KEY environment variable
                </p>
              )}
              {honeycombApiKey.trim().length > 0 && (
                <p className="text-xs text-muted-foreground">
                  This API key will be used for the next trace generation
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate Telemetry</CardTitle>
            <CardDescription>
              Configure and generate OpenTelemetry traces with SQL spans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="numQueries">Number of SQL Queries</Label>
              <Input
                id="numQueries"
                type="number"
                value={numQueries}
                onChange={(e) => setNumQueries(parseInt(e.target.value))}
                min="1"
                max="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="queryDuration">Query Duration (ms)</Label>
              <Input
                id="queryDuration"
                type="number"
                value={queryDuration}
                onChange={(e) => setQueryDuration(parseInt(e.target.value))}
                min="0"
                max="1000"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableRollup"
                checked={enableRollup}
                onCheckedChange={(checked) => setEnableRollup(checked as boolean)}
              />
              <Label htmlFor="enableRollup" className="cursor-pointer">
                Enable Rollup Processor
              </Label>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!isConfigured || generating}
              className="w-full"
            >
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {generating ? "Generating..." : "Generate Trace"}
            </Button>
          </CardContent>
        </Card>

        {message && (
          <Alert variant={message.includes("Error") ? "destructive" : "default"}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

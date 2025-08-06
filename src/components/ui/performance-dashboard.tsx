import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { performanceMonitor } from '@/utils/performance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export const PerformanceDashboard = () => {
  const [report, setReport] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  const generateReport = () => {
    const newReport = performanceMonitor.generateReport();
    setReport(newReport);
    console.log('Performance Report:', newReport);
  };

  useEffect(() => {
    // Auto-refresh report every 10 seconds when visible
    if (isVisible) {
      const interval = setInterval(generateReport, 10000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => {
            setIsVisible(true);
            generateReport();
          }}
          variant="outline"
          size="sm"
        >
          📊 Performance
        </Button>
      </div>
    );
  }

  if (!report) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 z-50">
        <CardHeader>
          <CardTitle className="text-sm">Performance Monitor</CardTitle>
          <Button onClick={() => setIsVisible(false)} variant="ghost" size="sm" className="absolute top-2 right-2">×</Button>
        </CardHeader>
        <CardContent>
          <Button onClick={generateReport}>Generate Report</Button>
        </CardContent>
      </Card>
    );
  }

  const { performance_summary } = report;

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto z-50">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm">Performance Dashboard</CardTitle>
          <Button onClick={() => setIsVisible(false)} variant="ghost" size="sm">×</Button>
        </div>
        <CardDescription className="text-xs">Real-time performance metrics</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
            <TabsTrigger value="timings" className="text-xs">Timings</TabsTrigger>
            <TabsTrigger value="issues" className="text-xs">Issues</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Post Creation</div>
                <div className="text-sm font-mono">
                  {performance_summary.avg_post_creation_time.toFixed(0)}ms
                </div>
                <Badge variant={performance_summary.avg_post_creation_time > 3000 ? 'destructive' : 'default'} className="text-xs">
                  {performance_summary.avg_post_creation_time > 3000 ? 'Slow' : 'Good'}
                </Badge>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Page Load</div>
                <div className="text-sm font-mono">
                  {performance_summary.avg_page_load_time.toFixed(0)}ms
                </div>
                <Badge variant={performance_summary.avg_page_load_time > 2000 ? 'destructive' : 'default'} className="text-xs">
                  {performance_summary.avg_page_load_time > 2000 ? 'Slow' : 'Good'}
                </Badge>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-muted-foreground">File Upload</div>
                <div className="text-sm font-mono">
                  {performance_summary.avg_file_upload_time.toFixed(0)}ms
                </div>
                <Badge variant={performance_summary.avg_file_upload_time > 5000 ? 'destructive' : 'default'} className="text-xs">
                  {performance_summary.avg_file_upload_time > 5000 ? 'Slow' : 'Good'}
                </Badge>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Errors</div>
                <div className="text-sm font-mono">{performance_summary.error_count}</div>
                <Badge variant={performance_summary.error_count > 0 ? 'destructive' : 'default'} className="text-xs">
                  {performance_summary.error_count > 0 ? 'Issues' : 'Clean'}
                </Badge>
              </div>
            </div>
            
            {performance_summary.memory_usage_trend.length > 0 && (
              <div className="h-20">
                <div className="text-xs text-muted-foreground mb-1">Memory Usage</div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performance_summary.memory_usage_trend.slice(-10)}>
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={1} dot={false} />
                    <Tooltip formatter={(value: number) => `${(value / 1024 / 1024).toFixed(1)}MB`} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="timings">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Recent Operations</div>
              {report.recent_timings.slice(0, 5).map((timing: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span className="truncate">{timing.name}</span>
                  <Badge variant={timing.value > 3000 ? 'destructive' : 'default'} className="text-xs">
                    {timing.value.toFixed(0)}ms
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="issues">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Performance Issues</div>
              {report.performance_issues.length > 0 ? (
                report.performance_issues.slice(0, 5).map((issue: any, index: number) => (
                  <div key={index} className="text-xs text-destructive">
                    {issue.name}: {issue.value.toFixed(0)}ms
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">No performance issues detected</div>
              )}
              
              {report.memory_leaks && (
                <div className="text-xs text-destructive">
                  ⚠️ Potential memory leak detected
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex gap-2">
          <Button onClick={generateReport} size="sm" variant="outline" className="text-xs">
            Refresh
          </Button>
          <Button 
            onClick={() => console.log(performanceMonitor.generateReport())} 
            size="sm" 
            variant="outline" 
            className="text-xs"
          >
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
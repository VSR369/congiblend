import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "./button";
import { LoadingSkeleton } from "./loading-skeleton";
import { cn } from "@/lib/utils";

interface EmergencyFeedProps {
  className?: string;
}

export const EmergencyFeed = ({ className }: EmergencyFeedProps) => {
  return (
    <div className={cn("max-w-2xl mx-auto space-y-6", className)}>
      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Community Feed</h1>
          <p className="text-sm text-muted-foreground">
            Emergency stabilized view
          </p>
        </div>
      </div>

      {/* Create Post Button */}
      <div className="bg-card border rounded-lg p-4">
        <Button
          className="w-full justify-start text-muted-foreground"
          variant="ghost"
          disabled
        >
          <Plus className="h-5 w-5 mr-2" />
          Post creation temporarily disabled for stability
        </Button>
      </div>

      {/* Emergency Message */}
      <div className="bg-card border rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">System Stabilization in Progress</h3>
        <p className="text-muted-foreground">
          The feed is being stabilized to fix jumping and flickering issues. 
          Please wait while we resolve the database connectivity problems.
        </p>
        <div className="mt-4 space-y-3">
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-3/4" />
          <LoadingSkeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useIsSparkAuthor } from "@/hooks/useIsSparkAuthor";
import { useCanDeleteSpark } from "@/hooks/useCanDeleteSpark";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Spark = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  view_count?: number | null;
  contributor_count?: number | null;
  total_edits?: number | null;
  updated_at?: string | null;
  is_featured?: boolean | null;
};

interface SparkCardProps {
  spark: Spark;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  showActions?: boolean;
}

export const SparkCard: React.FC<SparkCardProps> = ({ spark, onClick, selected, className, showActions = true }) => {
  const { isAuthor } = useIsSparkAuthor(showActions ? spark.id : null);
  const { canDelete } = useCanDeleteSpark(isAuthor && showActions ? spark.id : null);
  const queryClient = useQueryClient();

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    const { error } = await supabase.from("knowledge_sparks").delete().eq("id", spark.id);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
      return;
    }
    toast({ title: "Spark deleted" });
    queryClient.invalidateQueries();
  };

  return (
    <Card
      role="button"
      onClick={onClick}
      className={cn(
        "p-4 hover:bg-accent/40 transition-colors cursor-pointer h-full",
        selected && "ring-2 ring-primary",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{spark.title}</h3>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {spark.is_featured ? (
            <Badge className="shrink-0" variant="secondary">Featured</Badge>
          ) : null}
          {isAuthor ? (
            <AlertDialog>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={canDelete ? "Delete spark" : "Delete disabled: contributions exist"} disabled={!canDelete}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    {canDelete ? "Delete spark" : "Only allowed if no external contributions"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete spark?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action permanently deletes the spark. It is only allowed if no external contributions exist.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => handleDelete(e as any)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      {spark.description ? (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {spark.description}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {spark.category ? (
          <Badge variant="outline" className="text-xs">{spark.category}</Badge>
        ) : null}
        {Array.isArray(spark.tags) &&
          spark.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="outline" className="text-xs">#{t}</Badge>
          ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{spark.view_count ?? 0} views</span>
        <span>{spark.contributor_count ?? 1} contributors</span>
        <span>{spark.total_edits ?? 0} edits</span>
      </div>
      {spark.updated_at ? (
        <div className="mt-2 text-[11px] text-muted-foreground">
          Updated {new Date(spark.updated_at).toLocaleString()}
        </div>
      ) : null}
    </Card>
  );
};

export default SparkCard;

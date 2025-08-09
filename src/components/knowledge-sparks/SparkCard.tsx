
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
}

export const SparkCard: React.FC<SparkCardProps> = ({ spark, onClick, selected, className }) => {
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
        {spark.is_featured ? (
          <Badge className="shrink-0" variant="secondary">Featured</Badge>
        ) : null}
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

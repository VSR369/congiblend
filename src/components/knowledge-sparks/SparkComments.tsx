import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

interface SparkCommentsProps {
  sparkId: string;
}

export const SparkComments: React.FC<SparkCommentsProps> = ({ sparkId }) => {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [content, setContent] = useState("");
  
  const { data, isLoading } = useQuery({
    queryKey: ["spark", sparkId, "comments"],
    enabled: Boolean(sparkId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spark_comments")
        .select("id,content,created_at,user_id,is_resolved,upvotes")
        .eq("spark_id", sparkId)
        .is("parent_comment_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  const handleSubmit = async () => {
    const text = content.trim();
    if (!text) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to comment.");
      return;
    }
    const { error } = await supabase
      .from("spark_comments")
      .insert({ spark_id: sparkId, user_id: user.id, content: text });
    if (error) {
      toast.error("Failed to post comment");
      return;
    }
    setContent("");
    qc.invalidateQueries({ queryKey: ["spark", sparkId, "comments"] });
    toast.success("Comment posted");
  };

  return (
    <section aria-label="Spark comments" className="mt-8">
      <h3 className="text-sm font-medium mb-2">Comments</h3>

      {isAuthenticated && (
        <div className="mb-4 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share feedback or discuss this spark..."
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSubmit} disabled={!content.trim()}>Post</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : data && data.length > 0 ? (
        <ul className="space-y-3">
          {data.map((c: any) => (
            <li key={c.id} className="rounded-md border border-border p-3 bg-muted/30">
              <div className="text-sm whitespace-pre-wrap">{c.content}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {new Date(c.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</div>
      )}
    </section>
  );
};

export default SparkComments;

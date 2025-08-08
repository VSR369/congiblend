import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/authStore";

interface DMRecord {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  link?: string | null;
  source_comment_id?: string | null;
  metadata: any;
  created_at: string;
  read_at?: string | null;
}

const Messages: React.FC = () => {
  const [params] = useSearchParams();
  const [messages, setMessages] = useState<DMRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const { user } = useAuthStore();
  const currentUserId = user?.id || null;

  const peerId = params.get("to");

  useEffect(() => {
    document.title = peerId ? `Chat with ${peerId} | Messages` : "Messages";
    // canonical tag
    const linkEl = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    linkEl.setAttribute('rel', 'canonical');
    linkEl.setAttribute('href', window.location.href);
    if (!linkEl.isConnected) document.head.appendChild(linkEl);
  }, [peerId]);

  const canSend = useMemo(() => !!(text.trim() && currentUserId && peerId), [text, currentUserId, peerId]);

  const load = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      let query = supabase.from('direct_messages').select('*').order('created_at', { ascending: true });
      if (peerId) {
        query = query.or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${currentUserId})`);
      } else {
        query = query.or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`).limit(100);
      }
      const { data, error } = await query;
      if (error) throw error;
      setMessages((data || []) as DMRecord[]);
    } catch (e) {
      console.error('Failed to load messages', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Realtime updates for new messages involving current user
    if (!currentUserId) return;
    const channel = supabase.channel(`dm-${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${currentUserId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as DMRecord]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${currentUserId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as DMRecord]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, peerId]);

  const send = async () => {
    if (!canSend || !currentUserId || !peerId) return;
    const content = text.trim();
    setText("");
    try {
      const { error } = await supabase.from('direct_messages').insert({ sender_id: currentUserId, recipient_id: peerId, content });
      if (error) throw error;
    } catch (e) {
      console.error('Failed to send message', e);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Direct Messages</h1>
        <p className="text-sm text-muted-foreground">Private conversations. Use @user_id in comments to start a thread.</p>
      </header>

      {peerId ? (
        <div className="text-sm text-muted-foreground">Chatting with <span className="font-mono">{peerId}</span>. <Link to="/messages" className="text-primary hover:underline">View all</Link></div>
      ) : (
        <div className="text-sm text-muted-foreground">Select a conversation by opening a link from a mention DM.</div>
      )}

      <section className="border rounded-md p-3 space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">No messages yet.</div>
        ) : (
          messages.map((m) => (
            <article key={m.id} className="text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-mono">{m.sender_id}</span>
                <span>→</span>
                <span className="font-mono">{m.recipient_id}</span>
                <time className="ml-auto text-xs">{new Date(m.created_at).toLocaleString()}</time>
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.link ? (
                <div className="text-xs mt-1"><a href={m.link} className="text-primary hover:underline">View referenced comment</a></div>
              ) : null}
            </article>
          ))
        )}
      </section>

      <section className="space-y-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={peerId ? "Type your message…" : "Open a specific chat using ?to=<user_id> in the URL"} />
        <div className="flex justify-end">
          <Button onClick={send} disabled={!canSend}>Send</Button>
        </div>
      </section>
    </main>
  );
};

export default Messages;

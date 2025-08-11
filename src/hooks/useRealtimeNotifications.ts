import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

export function useRealtimeNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const { setUnreadCount, incrementUnread, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let isMounted = true;

    // Initial unread count fetch
    (async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (!error && isMounted) {
        setUnreadCount(count || 0);
      }
    })();

    // Realtime subscription
    const channel = supabase
      .channel(`user_notifications_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          incrementUnread(1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const wasRead = (payload as any)?.old?.read;
          const isRead = (payload as any)?.new?.read;
          if (wasRead === false && isRead === true) {
            incrementUnread(-1);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, setUnreadCount, incrementUnread]);

  const markAllAsReadOnServer = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (!error) {
      markAllAsRead();
    }
  };

  return { markAllAsRead: markAllAsReadOnServer };
}

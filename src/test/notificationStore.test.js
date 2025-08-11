import { describe, it, expect, beforeEach } from '@jest/globals';
import { useNotificationStore } from '@/stores/notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    const { clearAll, setUnreadCount } = useNotificationStore.getState() as any;
    clearAll();
    setUnreadCount?.(0);
  });

  it('increments unread count on addNotification', () => {
    const store = useNotificationStore.getState();
    expect(store.unreadCount).toBe(0);
    store.addNotification({ type: 'info', title: 'Test', message: 'Hello' });
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it('markAllAsRead resets unread count to 0', () => {
    const store = useNotificationStore.getState();
    store.addNotification({ type: 'info', title: 'A', message: 'B' });
    store.addNotification({ type: 'success', title: 'C', message: 'D' });
    expect(useNotificationStore.getState().unreadCount).toBe(2);
    store.markAllAsRead();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('setUnreadCount and incrementUnread adjust count correctly', () => {
    const { setUnreadCount, incrementUnread } = useNotificationStore.getState() as any;
    setUnreadCount(5);
    expect(useNotificationStore.getState().unreadCount).toBe(5);
    incrementUnread(2);
    expect(useNotificationStore.getState().unreadCount).toBe(7);
    incrementUnread(-10);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});

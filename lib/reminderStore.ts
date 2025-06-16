import { create } from 'zustand';
import { supabase } from './supabase';
import { scheduleLocalNotification, cancelNotification, NotificationData } from './notifications';

export interface Reminder {
  id: string;
  note_id?: string;
  user_id: string;
  remind_at: string;
  natural_input: string;
  is_completed: boolean;
  created_at: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  notification_id?: string;
}

interface CreateReminderData {
  title: string;
  description?: string;
  remind_at: string;
  priority: 'low' | 'medium' | 'high';
  note_id?: string;
}

interface ReminderStore {
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
  fetchReminders: () => Promise<void>;
  createReminder: (data: CreateReminderData) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string, minutes: number) => Promise<void>;
}

export const useReminderStore = create<ReminderStore>((set, get) => ({
  reminders: [],
  loading: false,
  error: null,

  fetchReminders: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('remind_at', { ascending: true });

      if (error) throw error;

      set({ reminders: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching reminders:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch reminders',
        loading: false 
      });
    }
  },

  createReminder: async (data: CreateReminderData) => {
    set({ error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const reminderData = {
        user_id: user.id,
        title: data.title,
        description: data.description || '',
        remind_at: data.remind_at,
        priority: data.priority,
        natural_input: `Remind me about "${data.title}" on ${new Date(data.remind_at).toLocaleString()}`,
        note_id: data.note_id || null,
        is_completed: false,
      };

      const { data: newReminder, error } = await supabase
        .from('reminders')
        .insert([reminderData])
        .select()
        .single();

      if (error) throw error;

      // Schedule local notification
      const notificationData: NotificationData = {
        reminderId: newReminder.id,
        noteId: newReminder.note_id || undefined,
        priority: newReminder.priority,
      };

      const notificationId = await scheduleLocalNotification(
        newReminder.title,
        newReminder.description || 'Reminder notification',
        new Date(newReminder.remind_at),
        notificationData
      );

      // Update reminder with notification ID
      if (notificationId) {
        await supabase
          .from('reminders')
          .update({ notification_id: notificationId })
          .eq('id', newReminder.id);
        
        newReminder.notification_id = notificationId;
      }

      set(state => ({
        reminders: [...state.reminders, newReminder].sort(
          (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
        )
      }));
    } catch (error) {
      console.error('Error creating reminder:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create reminder'
      });
      throw error;
    }
  },

  completeReminder: async (id: string) => {
    set({ error: null });
    
    try {
      const reminder = get().reminders.find(r => r.id === id);
      
      // Cancel notification if exists
      if (reminder?.notification_id) {
        await cancelNotification(reminder.notification_id);
      }

      const { error } = await supabase
        .from('reminders')
        .update({ is_completed: true })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        reminders: state.reminders.filter(reminder => reminder.id !== id)
      }));
    } catch (error) {
      console.error('Error completing reminder:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to complete reminder'
      });
    }
  },

  deleteReminder: async (id: string) => {
    set({ error: null });
    
    try {
      const reminder = get().reminders.find(r => r.id === id);
      
      // Cancel notification if exists
      if (reminder?.notification_id) {
        await cancelNotification(reminder.notification_id);
      }

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        reminders: state.reminders.filter(reminder => reminder.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete reminder'
      });
    }
  },

  snoozeReminder: async (id: string, minutes: number) => {
    set({ error: null });
    
    try {
      const reminder = get().reminders.find(r => r.id === id);
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      // Cancel existing notification
      if (reminder.notification_id) {
        await cancelNotification(reminder.notification_id);
      }

      const newRemindAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

      // Schedule new notification
      const notificationData: NotificationData = {
        reminderId: reminder.id,
        noteId: reminder.note_id || undefined,
        priority: reminder.priority,
      };

      const notificationId = await scheduleLocalNotification(
        reminder.title,
        reminder.description || 'Reminder notification',
        new Date(newRemindAt),
        notificationData
      );

      // Update reminder in database
      const { error } = await supabase
        .from('reminders')
        .update({ 
          remind_at: newRemindAt,
          notification_id: notificationId,
        })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        reminders: state.reminders.map(reminder =>
          reminder.id === id
            ? { ...reminder, remind_at: newRemindAt, notification_id: notificationId }
            : reminder
        ).sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
      }));
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to snooze reminder'
      });
    }
  },
}));
import { create } from 'zustand';
import { supabase, Database } from './supabase';
import { scheduleNotification, cancelNotification } from './reminders';

type Reminder = Database['public']['Tables']['reminders']['Row'] & {
  priority?: 'low' | 'medium' | 'high';
  notification_id?: string;
};

interface ReminderState {
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchReminders: () => Promise<void>;
  createReminder: (reminder: {
    title: string;
    description: string;
    remind_at: string;
    priority: 'low' | 'medium' | 'high';
  }) => Promise<Reminder | null>;
  completeReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string, minutes: number) => Promise<void>;
  clearError: () => void;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  loading: false,
  error: null,

  fetchReminders: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('is_completed', false)
        .order('remind_at', { ascending: true });
      
      if (error) throw error;
      set({ reminders: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createReminder: async (reminderData) => {
    try {
      set({ loading: true, error: null });
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      // Schedule notification first
      const notificationId = await scheduleNotification(
        reminderData.title,
        reminderData.description || 'Reminder notification',
        new Date(reminderData.remind_at),
        reminderData.priority
      );

      // Create reminder in database
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          title: reminderData.title,
          description: reminderData.description,
          remind_at: reminderData.remind_at,
          priority: reminderData.priority,
          notification_id: notificationId,
        })
        .select()
        .single();
      
      if (error) {
        // Cancel notification if database insert fails
        if (notificationId) {
          await cancelNotification(notificationId);
        }
        throw error;
      }
      
      const currentReminders = get().reminders;
      set({ reminders: [...currentReminders, data], loading: false });
      return data;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  completeReminder: async (id) => {
    try {
      set({ loading: true, error: null });
      
      // Find reminder to get notification ID
      const reminder = get().reminders.find(r => r.id === id);
      if (reminder?.notification_id) {
        await cancelNotification(reminder.notification_id);
      }

      const { error } = await supabase
        .from('reminders')
        .update({ is_completed: true })
        .eq('id', id);
      
      if (error) throw error;
      
      const currentReminders = get().reminders;
      const filteredReminders = currentReminders.filter(reminder => reminder.id !== id);
      set({ reminders: filteredReminders, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteReminder: async (id) => {
    try {
      set({ loading: true, error: null });
      
      // Find reminder to get notification ID
      const reminder = get().reminders.find(r => r.id === id);
      if (reminder?.notification_id) {
        await cancelNotification(reminder.notification_id);
      }

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      const currentReminders = get().reminders;
      const filteredReminders = currentReminders.filter(reminder => reminder.id !== id);
      set({ reminders: filteredReminders, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  snoozeReminder: async (id, minutes) => {
    try {
      set({ loading: true, error: null });
      
      const reminder = get().reminders.find(r => r.id === id);
      if (!reminder) throw new Error('Reminder not found');

      // Cancel existing notification
      if (reminder.notification_id) {
        await cancelNotification(reminder.notification_id);
      }

      // Calculate new reminder time
      const newRemindAt = new Date(Date.now() + minutes * 60 * 1000);

      // Schedule new notification
      const notificationId = await scheduleNotification(
        reminder.title,
        reminder.description || 'Reminder notification',
        newRemindAt,
        reminder.priority || 'medium'
      );

      // Update reminder in database
      const { error } = await supabase
        .from('reminders')
        .update({ 
          remind_at: newRemindAt.toISOString(),
          notification_id: notificationId,
        })
        .eq('id', id);
      
      if (error) {
        // Cancel new notification if database update fails
        if (notificationId) {
          await cancelNotification(notificationId);
        }
        throw error;
      }
      
      // Update local state
      const currentReminders = get().reminders;
      const updatedReminders = currentReminders.map(r => 
        r.id === id 
          ? { ...r, remind_at: newRemindAt.toISOString(), notification_id: notificationId }
          : r
      );
      set({ reminders: updatedReminders, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
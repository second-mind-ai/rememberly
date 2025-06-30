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
  markAsRead: (id: string) => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
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

      if (error) {
        console.error('Supabase error fetching reminders:', error);
        throw error;
      }

      console.log('Fetched reminders:', data?.length || 0);
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
      console.log('Creating reminder with data:', data);
      
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

      console.log('Inserting reminder data:', reminderData);

      const { data: newReminder, error } = await supabase
        .from('reminders')
        .insert([reminderData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating reminder:', error);
        throw error;
      }

      console.log('Created reminder:', newReminder);

      // Schedule local notification with enhanced data
      try {
        const notificationData: NotificationData = {
          id: newReminder.id,
          type: 'reminder',
          priority: newReminder.priority,
          sound: newReminder.priority === 'high' ? 'default' : 'default',
          metadata: {
            reminderId: newReminder.id,
            noteId: newReminder.note_id,
            createdAt: newReminder.created_at,
          },
        };

        const notificationId = await scheduleLocalNotification({
          title: newReminder.title,
          body: newReminder.description || 'Reminder notification',
          triggerDate: new Date(newReminder.remind_at),
          data: notificationData,
          sound: newReminder.priority === 'high' ? 'default' : 'default',
          badge: 1,
        });

        console.log('Scheduled notification with ID:', notificationId);

        // Update reminder with notification ID
        if (notificationId) {
          const { error: updateError } = await supabase
            .from('reminders')
            .update({ notification_id: notificationId })
            .eq('id', newReminder.id);

          if (updateError) {
            console.error('Error updating notification ID:', updateError);
          } else {
            newReminder.notification_id = notificationId;
            console.log('Updated reminder with notification ID');
          }
        }
      } catch (notificationError) {
        console.error('Error scheduling notification:', notificationError);
        // Don't throw here - reminder was created successfully
      }

      set(state => ({
        reminders: [...state.reminders, newReminder].sort(
          (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
        )
      }));

      console.log('Reminder created and added to state successfully');
    } catch (error) {
      console.error('Error creating reminder:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create reminder'
      });
      throw error;
    }
  },

  markAsRead: async (id: string) => {
    set({ error: null });
    
    try {
      console.log('Marking reminder as read:', id);
      
      const { error } = await supabase
        .from('reminders')
        .update({ is_completed: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking reminder as read:', error);
        throw error;
      }

      // Update local state
      set(state => ({
        reminders: state.reminders.map(reminder =>
          reminder.id === id
            ? { ...reminder, is_completed: true }
            : reminder
        )
      }));

      console.log('Reminder marked as read successfully');
    } catch (error) {
      console.error('Error marking reminder as read:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to mark reminder as read'
      });
      throw error;
    }
  },

  clearNotification: async (id: string) => {
    set({ error: null });
    
    try {
      console.log('Clearing notification for reminder:', id);
      
      const reminder = get().reminders.find(r => r.id === id);
      
      // Cancel notification if exists
      if (reminder?.notification_id) {
        try {
          await cancelNotification(reminder.notification_id);
          console.log('Cancelled notification:', reminder.notification_id);
        } catch (cancelError) {
          console.error('Error cancelling notification:', cancelError);
          // Continue with database update even if notification cancellation fails
        }
      }

      // Remove from database
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting reminder:', error);
        throw error;
      }

      // Update local state
      set(state => ({
        reminders: state.reminders.filter(reminder => reminder.id !== id)
      }));

      console.log('Notification cleared successfully');
    } catch (error) {
      console.error('Error clearing notification:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to clear notification'
      });
      throw error;
    }
  },

  completeReminder: async (id: string) => {
    set({ error: null });
    
    try {
      console.log('Completing reminder:', id);
      
      const reminder = get().reminders.find(r => r.id === id);
      
      // Cancel notification if exists
      if (reminder?.notification_id) {
        try {
          await cancelNotification(reminder.notification_id);
          console.log('Cancelled notification for completed reminder');
        } catch (cancelError) {
          console.error('Error cancelling notification:', cancelError);
        }
      }

      const { error } = await supabase
        .from('reminders')
        .update({ is_completed: true })
        .eq('id', id);

      if (error) {
        console.error('Error completing reminder:', error);
        throw error;
      }

      set(state => ({
        reminders: state.reminders.filter(reminder => reminder.id !== id)
      }));

      console.log('Reminder completed successfully');
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
      console.log('Deleting reminder:', id);
      
      const reminder = get().reminders.find(r => r.id === id);
      
      // Cancel notification if exists
      if (reminder?.notification_id) {
        try {
          await cancelNotification(reminder.notification_id);
          console.log('Cancelled notification for deleted reminder');
        } catch (cancelError) {
          console.error('Error cancelling notification:', cancelError);
        }
      }

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting reminder:', error);
        throw error;
      }

      set(state => ({
        reminders: state.reminders.filter(reminder => reminder.id !== id)
      }));

      console.log('Reminder deleted successfully');
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
      console.log('Snoozing reminder:', id, 'for', minutes, 'minutes');
      
      const reminder = get().reminders.find(r => r.id === id);
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      // Cancel existing notification
      if (reminder.notification_id) {
        try {
          await cancelNotification(reminder.notification_id);
          console.log('Cancelled existing notification for snooze');
        } catch (cancelError) {
          console.error('Error cancelling existing notification:', cancelError);
        }
      }

      const newRemindAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

      // Schedule new notification with enhanced data
      let notificationId = null;
      try {
        const notificationData: NotificationData = {
          id: reminder.id,
          type: 'reminder',
          priority: reminder.priority,
          sound: reminder.priority === 'high' ? 'default' : 'default',
          metadata: {
            reminderId: reminder.id,
            noteId: reminder.note_id,
            snoozedAt: new Date().toISOString(),
            originalTime: reminder.remind_at,
          },
        };

        notificationId = await scheduleLocalNotification({
          title: reminder.title,
          body: reminder.description || 'Reminder notification (snoozed)',
          triggerDate: new Date(newRemindAt),
          data: notificationData,
          sound: reminder.priority === 'high' ? 'default' : 'default',
          badge: 1,
        });

        console.log('Scheduled new notification for snoozed reminder:', notificationId);
      } catch (notificationError) {
        console.error('Error scheduling snoozed notification:', notificationError);
        // Continue with database update
      }

      // Update reminder in database
      const { error } = await supabase
        .from('reminders')
        .update({ 
          remind_at: newRemindAt,
          notification_id: notificationId,
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating snoozed reminder:', error);
        throw error;
      }

      set(state => ({
        reminders: state.reminders.map(reminder =>
          reminder.id === id
            ? { ...reminder, remind_at: newRemindAt, notification_id: notificationId }
            : reminder
        ).sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
      }));

      console.log('Reminder snoozed successfully');
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to snooze reminder'
      });
    }
  },
}));
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

    let scheduledNotificationId: string | null = null;

    try {
      console.log('Creating reminder with data:', data);

      // INPUT VALIDATION: Validate reminder data before processing
      if (!data.title?.trim()) {
        throw new Error('Reminder title is required');
      }

      if (data.title.length > 200) {
        throw new Error('Reminder title is too long (max 200 characters)');
      }

      if (!['low', 'medium', 'high'].includes(data.priority)) {
        throw new Error('Invalid priority value. Must be low, medium, or high');
      }

      const remindDate = new Date(data.remind_at);
      if (isNaN(remindDate.getTime())) {
        throw new Error('Invalid reminder date');
      }

      if (remindDate <= new Date()) {
        throw new Error('Reminder time must be in the future');
      }

      // Check if date is too far in the future (max 2 years)
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 2);
      if (remindDate > maxDate) {
        throw new Error('Reminder date cannot be more than 2 years in the future');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // SECURITY FIX: Schedule notification first, then create reminder with notification_id
      // This prevents orphaned notifications if database update fails
      try {
        const tempNotificationData: NotificationData = {
          id: 'temp-' + Date.now(), // Temporary ID, will be replaced after DB insert
          type: 'reminder',
          priority: data.priority,
          sound: data.priority === 'high' ? 'default' : 'default',
          metadata: {
            reminderId: 'pending',
            noteId: data.note_id,
            createdAt: new Date().toISOString(),
          },
        };

        scheduledNotificationId = await scheduleLocalNotification({
          title: data.title,
          body: data.description || 'Reminder notification',
          triggerDate: new Date(data.remind_at),
          data: tempNotificationData,
          sound: data.priority === 'high' ? 'default' : 'default',
          badge: 1,
        });

        console.log('Pre-scheduled notification with ID:', scheduledNotificationId);
      } catch (notificationError) {
        console.error('Error pre-scheduling notification:', notificationError);
        // Continue without notification - better than failing entirely
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
        notification_id: scheduledNotificationId, // Include notification ID in initial insert
      };

      console.log('Inserting reminder data:', reminderData);

      const { data: newReminder, error } = await supabase
        .from('reminders')
        .insert([reminderData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating reminder:', error);

        // ROLLBACK: Cancel the notification since DB insert failed
        if (scheduledNotificationId) {
          try {
            await cancelNotification(scheduledNotificationId);
            console.log('Rolled back notification due to DB error');
          } catch (cancelError) {
            console.error('Error rolling back notification:', cancelError);
          }
        }

        throw error;
      }

      console.log('Created reminder with notification ID:', newReminder);

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
      
      // Cancel notification if exists (with validation)
      if (reminder?.notification_id?.trim()) {
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
      
      // Cancel notification if exists (with validation)
      if (reminder?.notification_id?.trim()) {
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
      
      // Cancel notification if exists (with validation)
      if (reminder?.notification_id?.trim()) {
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

      // Cancel existing notification (with validation)
      if (reminder.notification_id?.trim()) {
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
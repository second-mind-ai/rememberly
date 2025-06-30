import { create } from 'zustand';
import { supabase, Database } from './supabase';
import { guestModeManager, GuestNote } from './guestMode';

type DatabaseNote = Database['public']['Tables']['notes']['Row'];
type Reminder = Database['public']['Tables']['reminders']['Row'];

interface NotesState {
  notes: (DatabaseNote | GuestNote)[];
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
  isGuestMode: boolean;

  // Actions
  fetchNotes: () => Promise<void>;
  fetchReminders: () => Promise<void>;
  fetchAll: () => Promise<void>;
  createNote: (
    note: Omit<DatabaseNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<DatabaseNote | GuestNote | null>;
  createReminder: (
    reminder: Omit<Reminder, 'id' | 'created_at'>
  ) => Promise<Reminder | null>;
  updateNote: (id: string, updates: any) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  reminders: [],
  loading: false,
  error: null,
  isGuestMode: false,

  fetchNotes: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Guest mode - fetch from local storage
        const guestNotes = await guestModeManager.getGuestNotes();
        set({ notes: guestNotes, loading: false, isGuestMode: true });
        return;
      }

      // Authenticated user - fetch from database
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ notes: data || [], loading: false, isGuestMode: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notes';
      set({ error: errorMessage, loading: false });
      console.error('Error fetching notes:', error);
    }
  },

  fetchReminders: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Guest mode - fetch from local storage
        const guestReminders = await guestModeManager.getGuestReminders();
        set({ reminders: guestReminders, loading: false });
        return;
      }

      // Authenticated user - fetch from database
      const { data, error } = await supabase
        .from('reminders')
        .select('*, notes!inner(*)')
        .eq('is_completed', false)
        .order('remind_at', { ascending: true });

      if (error) throw error;
      set({ reminders: data || [], loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reminders';
      set({ error: errorMessage, loading: false });
      console.error('Error fetching reminders:', error);
    }
  },

  // Add a method to fetch both in parallel
  fetchAll: async () => {
    const notesPromise = get().fetchNotes();
    const remindersPromise = get().fetchReminders();
    await Promise.all([notesPromise, remindersPromise]);
  },

  createNote: async (noteData) => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Guest mode - create in local storage
        const guestNoteData = {
          title: noteData.title,
          original_content: noteData.original_content,
          summary: noteData.summary,
          type: noteData.type,
          tags: noteData.tags,
          source_url: noteData.source_url || undefined,
          file_url: noteData.file_url || undefined,
        };
        const newNote = await guestModeManager.createGuestNote(guestNoteData);
        if (newNote) {
          const currentNotes = get().notes;
          set({ notes: [newNote, ...currentNotes], loading: false, isGuestMode: true });
        }
        return newNote;
      }

      // Authenticated user - create in database
      const { data, error } = await supabase
        .from('notes')
        .insert({ ...noteData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      const currentNotes = get().notes;
      set({ notes: [data, ...currentNotes], loading: false, isGuestMode: false });
      return data;
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ error: errorMessage, loading: false });
      
      // Check if it's a guest limit error
      if (errorMessage.includes('Guest note limit reached')) {
        throw new Error('GUEST_LIMIT_REACHED');
      }
      
      return null;
    }
  },

  createReminder: async (reminderData) => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Guest mode - create in local storage
        const newReminder = await guestModeManager.createGuestReminder(reminderData);
        if (newReminder) {
          const currentReminders = get().reminders;
          set({ reminders: [...currentReminders, newReminder], loading: false });
        }
        return newReminder;
      }

      // Authenticated user - create in database
      const { data, error } = await supabase
        .from('reminders')
        .insert({ ...reminderData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      const currentReminders = get().reminders;
      set({ reminders: [...currentReminders, data], loading: false });
      return data;
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ error: errorMessage, loading: false });
      
      // Check if it's a guest limit error
      if (errorMessage.includes('Guest reminder limit reached')) {
        throw new Error('GUEST_LIMIT_REACHED');
      }
      
      return null;
    }
  },

  updateNote: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Guest mode - update in local storage
        const guestUpdates = {
          title: updates.title,
          original_content: updates.original_content,
          summary: updates.summary,
          type: updates.type,
          tags: updates.tags,
          source_url: updates.source_url || undefined,
          file_url: updates.file_url || undefined,
        };
        await guestModeManager.updateGuestNote(id, guestUpdates);
        const currentNotes = get().notes;
        const updatedNotes = currentNotes.map((note) =>
          note.id === id ? { ...note, ...guestUpdates, updated_at: new Date().toISOString() } : note
        );
        set({ notes: updatedNotes, loading: false });
        return;
      }

      // Authenticated user - update in database
      const { error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      const currentNotes = get().notes;
      const updatedNotes = currentNotes.map((note) =>
        note.id === id ? { ...note, ...updates } : note
      );
      set({ notes: updatedNotes, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteNote: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Guest mode - delete from local storage
        await guestModeManager.deleteGuestNote(id);
        const currentNotes = get().notes;
        const filteredNotes = currentNotes.filter((note) => note.id !== id);
        set({ notes: filteredNotes, loading: false });
        return;
      }

      // Authenticated user - delete from database
      const { data, error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Note not found or you do not have permission to delete it');
      }

      const currentNotes = get().notes;
      const filteredNotes = currentNotes.filter((note) => note.id !== id);
      set({ notes: filteredNotes, loading: false });
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  completeReminder: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Guest mode - complete in local storage
        await guestModeManager.completeGuestReminder(id);
        const currentReminders = get().reminders;
        const filteredReminders = currentReminders.filter((reminder) => reminder.id !== id);
        set({ reminders: filteredReminders, loading: false });
        return;
      }

      // Authenticated user - complete in database
      const { error } = await supabase
        .from('reminders')
        .update({ is_completed: true })
        .eq('id', id);

      if (error) throw error;

      const currentReminders = get().reminders;
      const filteredReminders = currentReminders.filter((reminder) => reminder.id !== id);
      set({ reminders: filteredReminders, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

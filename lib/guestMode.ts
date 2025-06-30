import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid';

export interface GuestNote {
  id: string;
  title: string;
  original_content: string;
  summary: string;
  type: 'text' | 'url' | 'file' | 'image';
  tags: string[];
  source_url?: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
  is_guest: boolean;
}

export interface GuestUser {
  id: string;
  email?: string;
  is_guest: boolean;
  note_count: number;
  created_at: string;
}

const GUEST_STORAGE_KEYS = {
  GUEST_USER: 'rememberly_guest_user',
  GUEST_NOTES: 'rememberly_guest_notes',
  GUEST_REMINDERS: 'rememberly_guest_reminders',
} as const;

const GUEST_LIMITS = {
  MAX_NOTES: 3,
  MAX_REMINDERS: 2,
} as const;

export class GuestModeManager {
  private static instance: GuestModeManager;
  private guestUser: GuestUser | null = null;
  private guestNotes: GuestNote[] = [];
  private guestReminders: any[] = [];

  static getInstance(): GuestModeManager {
    if (!GuestModeManager.instance) {
      GuestModeManager.instance = new GuestModeManager();
    }
    return GuestModeManager.instance;
  }

  async initialize(): Promise<void> {
    await this.loadGuestData();
  }

  private async loadGuestData(): Promise<void> {
    try {
      const [userData, notesData, remindersData] = await Promise.all([
        AsyncStorage.getItem(GUEST_STORAGE_KEYS.GUEST_USER),
        AsyncStorage.getItem(GUEST_STORAGE_KEYS.GUEST_NOTES),
        AsyncStorage.getItem(GUEST_STORAGE_KEYS.GUEST_REMINDERS),
      ]);

      this.guestUser = userData ? JSON.parse(userData) : null;
      this.guestNotes = notesData ? JSON.parse(notesData) : [];
      this.guestReminders = remindersData ? JSON.parse(remindersData) : [];
    } catch (error) {
      console.error('Error loading guest data:', error);
    }
  }

  private async saveGuestData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(GUEST_STORAGE_KEYS.GUEST_USER, JSON.stringify(this.guestUser)),
        AsyncStorage.setItem(GUEST_STORAGE_KEYS.GUEST_NOTES, JSON.stringify(this.guestNotes)),
        AsyncStorage.setItem(GUEST_STORAGE_KEYS.GUEST_REMINDERS, JSON.stringify(this.guestReminders)),
      ]);
    } catch (error) {
      console.error('Error saving guest data:', error);
    }
  }

  async createGuestUser(): Promise<GuestUser> {
    const guestUser: GuestUser = {
      id: `guest_${nanoid()}`,
      is_guest: true,
      note_count: 0,
      created_at: new Date().toISOString(),
    };

    this.guestUser = guestUser;
    await this.saveGuestData();
    return guestUser;
  }

  async getGuestUser(): Promise<GuestUser | null> {
    if (!this.guestUser) {
      await this.loadGuestData();
    }
    return this.guestUser;
  }

  async createGuestNote(noteData: Omit<GuestNote, 'id' | 'created_at' | 'updated_at' | 'is_guest'>): Promise<GuestNote | null> {
    const guestUser = await this.getGuestUser();
    if (!guestUser) {
      throw new Error('Guest user not initialized');
    }

    if (guestUser.note_count >= GUEST_LIMITS.MAX_NOTES) {
      throw new Error('Guest note limit reached. Please sign up to create more notes.');
    }

    const newNote: GuestNote = {
      ...noteData,
      id: nanoid(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_guest: true,
    };

    this.guestNotes.unshift(newNote);
    if (this.guestUser) {
      this.guestUser.note_count = this.guestNotes.length;
    }
    await this.saveGuestData();

    return newNote;
  }

  async getGuestNotes(): Promise<GuestNote[]> {
    if (this.guestNotes.length === 0) {
      await this.loadGuestData();
    }
    return this.guestNotes;
  }

  async updateGuestNote(id: string, updates: Partial<GuestNote>): Promise<void> {
    const noteIndex = this.guestNotes.findIndex(note => note.id === id);
    if (noteIndex === -1) {
      throw new Error('Note not found');
    }

    this.guestNotes[noteIndex] = {
      ...this.guestNotes[noteIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await this.saveGuestData();
  }

  async deleteGuestNote(id: string): Promise<void> {
    const noteIndex = this.guestNotes.findIndex(note => note.id === id);
    if (noteIndex === -1) {
      throw new Error('Note not found');
    }

    this.guestNotes.splice(noteIndex, 1);
    if (this.guestUser) {
      this.guestUser.note_count = this.guestNotes.length;
    }
    await this.saveGuestData();
  }

  async createGuestReminder(reminderData: any): Promise<any> {
    const guestUser = await this.getGuestUser();
    if (!guestUser) {
      throw new Error('Guest user not initialized');
    }

    if (this.guestReminders.length >= GUEST_LIMITS.MAX_REMINDERS) {
      throw new Error('Guest reminder limit reached. Please sign up to create more reminders.');
    }

    const newReminder = {
      ...reminderData,
      id: nanoid(),
      user_id: guestUser.id,
      created_at: new Date().toISOString(),
      is_guest: true,
    };

    this.guestReminders.push(newReminder);
    await this.saveGuestData();

    return newReminder;
  }

  async getGuestReminders(): Promise<any[]> {
    if (this.guestReminders.length === 0) {
      await this.loadGuestData();
    }
    return this.guestReminders;
  }

  async deleteGuestReminder(id: string): Promise<void> {
    const reminderIndex = this.guestReminders.findIndex(reminder => reminder.id === id);
    if (reminderIndex === -1) {
      throw new Error('Reminder not found');
    }

    this.guestReminders.splice(reminderIndex, 1);
    await this.saveGuestData();
  }

  async completeGuestReminder(id: string): Promise<void> {
    const reminderIndex = this.guestReminders.findIndex(reminder => reminder.id === id);
    if (reminderIndex === -1) {
      throw new Error('Reminder not found');
    }

    this.guestReminders[reminderIndex] = {
      ...this.guestReminders[reminderIndex],
      is_completed: true,
    };

    await this.saveGuestData();
  }

  getGuestLimits() {
    return GUEST_LIMITS;
  }

  async getGuestUsage(): Promise<{ notes: number; reminders: number; maxNotes: number; maxReminders: number }> {
    const guestUser = await this.getGuestUser();
    return {
      notes: guestUser?.note_count || 0,
      reminders: this.guestReminders.length,
      maxNotes: GUEST_LIMITS.MAX_NOTES,
      maxReminders: GUEST_LIMITS.MAX_REMINDERS,
    };
  }

  async clearGuestData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(GUEST_STORAGE_KEYS.GUEST_USER),
        AsyncStorage.removeItem(GUEST_STORAGE_KEYS.GUEST_NOTES),
        AsyncStorage.removeItem(GUEST_STORAGE_KEYS.GUEST_REMINDERS),
      ]);
      
      this.guestUser = null;
      this.guestNotes = [];
      this.guestReminders = [];
    } catch (error) {
      console.error('Error clearing guest data:', error);
    }
  }

  async migrateGuestDataToUser(userId: string): Promise<{ notes: GuestNote[]; reminders: any[] }> {
    const notes = [...this.guestNotes];
    const reminders = [...this.guestReminders];
    
    // Clear guest data after migration
    await this.clearGuestData();
    
    return { notes, reminders };
  }
}

export const guestModeManager = GuestModeManager.getInstance(); 
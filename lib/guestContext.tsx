import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { guestModeManager, GuestUser, GuestNote } from './guestMode';
import { migrateGuestDataToUser } from './migration';
import { getCurrentUser } from './auth';
import { supabase } from './supabase';

interface GuestContextType {
  isGuestMode: boolean;
  guestUser: GuestUser | null;
  guestNotes: GuestNote[];
  guestUsage: {
    notes: number;
    reminders: number;
    maxNotes: number;
    maxReminders: number;
  };
  loading: boolean;
  initializeGuestMode: () => Promise<void>;
  createGuestNote: (noteData: Omit<GuestNote, 'id' | 'created_at' | 'updated_at' | 'is_guest'>) => Promise<GuestNote | null>;
  updateGuestNote: (id: string, updates: Partial<GuestNote>) => Promise<void>;
  deleteGuestNote: (id: string) => Promise<void>;
  clearGuestData: () => Promise<void>;
  refreshGuestData: () => Promise<void>;
  checkAndMigrateGuestData: () => Promise<void>;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [guestNotes, setGuestNotes] = useState<GuestNote[]>([]);
  const [guestUsage, setGuestUsage] = useState({
    notes: 0,
    reminders: 0,
    maxNotes: 3,
    maxReminders: 2,
  });
  const [loading, setLoading] = useState(true);

  const initializeGuestMode = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const { user } = await getCurrentUser();
      
      if (user) {
        // User is authenticated, check for pending migration
        await checkAndMigrateGuestData();
        setIsGuestMode(false);
        setGuestUser(null);
        setGuestNotes([]);
        setGuestUsage({ notes: 0, reminders: 0, maxNotes: 3, maxReminders: 2 });
      } else {
        // User is not authenticated, initialize guest mode
        await guestModeManager.initialize();
        const guestUser = await guestModeManager.getGuestUser();
        
        if (!guestUser) {
          // Create new guest user
          const newGuestUser = await guestModeManager.createGuestUser();
          setGuestUser(newGuestUser);
        } else {
          setGuestUser(guestUser);
        }
        
        // Load guest notes and usage
        const notes = await guestModeManager.getGuestNotes();
        const usage = await guestModeManager.getGuestUsage();
        
        setGuestNotes(notes);
        setGuestUsage(usage);
        setIsGuestMode(true);
      }
    } catch (error) {
      console.error('Error initializing guest mode:', error);
      // On error, default to guest mode
      setIsGuestMode(true);
    } finally {
      setLoading(false);
    }
  };

  const checkAndMigrateGuestData = async () => {
    try {
      // Check if there's guest data to migrate
      const hasGuestData = await guestModeManager.getGuestUser();
      if (hasGuestData) {
        const { user } = await getCurrentUser();
        if (user) {
          try {
            const migrationResult = await migrateGuestDataToUser(user.id);
            console.log('Migration completed:', migrationResult);
          } catch (migrationError) {
            console.error('Migration failed:', migrationError);
            // Don't throw error, just log it
          }
        }
      }
    } catch (error) {
      console.error('Error checking for guest data migration:', error);
    }
  };

  const createGuestNote = async (noteData: Omit<GuestNote, 'id' | 'created_at' | 'updated_at' | 'is_guest'>) => {
    try {
      const newNote = await guestModeManager.createGuestNote(noteData);
      if (newNote) {
        setGuestNotes(prev => [newNote, ...prev]);
        const usage = await guestModeManager.getGuestUsage();
        setGuestUsage(usage);
      }
      return newNote;
    } catch (error) {
      console.error('Error creating guest note:', error);
      throw error;
    }
  };

  const updateGuestNote = async (id: string, updates: Partial<GuestNote>) => {
    try {
      await guestModeManager.updateGuestNote(id, updates);
      setGuestNotes(prev => 
        prev.map(note => 
          note.id === id 
            ? { ...note, ...updates, updated_at: new Date().toISOString() }
            : note
        )
      );
    } catch (error) {
      console.error('Error updating guest note:', error);
      throw error;
    }
  };

  const deleteGuestNote = async (id: string) => {
    try {
      await guestModeManager.deleteGuestNote(id);
      setGuestNotes(prev => prev.filter(note => note.id !== id));
      const usage = await guestModeManager.getGuestUsage();
      setGuestUsage(usage);
    } catch (error) {
      console.error('Error deleting guest note:', error);
      throw error;
    }
  };

  const clearGuestData = async () => {
    try {
      await guestModeManager.clearGuestData();
      setGuestUser(null);
      setGuestNotes([]);
      setGuestUsage({ notes: 0, reminders: 0, maxNotes: 3, maxReminders: 2 });
      setIsGuestMode(false);
    } catch (error) {
      console.error('Error clearing guest data:', error);
    }
  };

  const refreshGuestData = async () => {
    try {
      const notes = await guestModeManager.getGuestNotes();
      const usage = await guestModeManager.getGuestUsage();
      setGuestNotes(notes);
      setGuestUsage(usage);
    } catch (error) {
      console.error('Error refreshing guest data:', error);
    }
  };

  useEffect(() => {
    initializeGuestMode();
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in, migrate guest data and switch to authenticated mode
          try {
            await checkAndMigrateGuestData();
            setIsGuestMode(false);
            setGuestUser(null);
            setGuestNotes([]);
            setGuestUsage({ notes: 0, reminders: 0, maxNotes: 3, maxReminders: 2 });
          } catch (error) {
            console.error('Error handling sign in:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          // User signed out, switch to guest mode
          try {
            await guestModeManager.initialize();
            const guestUser = await guestModeManager.getGuestUser();
            
            if (!guestUser) {
              const newGuestUser = await guestModeManager.createGuestUser();
              setGuestUser(newGuestUser);
            } else {
              setGuestUser(guestUser);
            }
            
            const notes = await guestModeManager.getGuestNotes();
            const usage = await guestModeManager.getGuestUsage();
            
            setGuestNotes(notes);
            setGuestUsage(usage);
            setIsGuestMode(true);
          } catch (error) {
            console.error('Error handling sign out:', error);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: GuestContextType = {
    isGuestMode,
    guestUser,
    guestNotes,
    guestUsage,
    loading,
    initializeGuestMode,
    createGuestNote,
    updateGuestNote,
    deleteGuestNote,
    clearGuestData,
    refreshGuestData,
    checkAndMigrateGuestData,
  };

  return (
    <GuestContext.Provider value={value}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuestMode() {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuestMode must be used within a GuestProvider');
  }
  return context;
} 
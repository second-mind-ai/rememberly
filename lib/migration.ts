import { supabase } from './supabase';
import { guestModeManager, GuestNote } from './guestMode';

export async function migrateGuestDataToUser(userId: string): Promise<{
  notesMigrated: number;
  remindersMigrated: number;
}> {
  try {
    // Get guest data before clearing it
    const guestData = await guestModeManager.migrateGuestDataToUser(userId);
    const { notes, reminders } = guestData;

    let notesMigrated = 0;
    let remindersMigrated = 0;

    // Wait for the user session to be properly established
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify the current user session multiple times
    let retries = 0;
    let userVerified = false;
    
    while (retries < 3 && !userVerified) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!userError && user && user.id === userId) {
        userVerified = true;
      } else {
        console.log(`User session verification attempt ${retries + 1} failed:`, userError);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!userVerified) {
      console.error('User session could not be verified after multiple attempts');
      // Restore guest data and throw error
      await guestModeManager.initialize();
      throw new Error('User session not properly established');
    }

    // Migrate notes
    if (notes.length > 0) {
      const notesToInsert = notes.map((note: GuestNote) => ({
        user_id: userId,
        title: note.title,
        original_content: note.original_content,
        summary: note.summary,
        type: note.type,
        tags: note.tags,
        source_url: note.source_url,
        file_url: note.file_url,
        created_at: note.created_at,
        updated_at: note.updated_at,
      }));

      const { data: insertedNotes, error: notesError } = await supabase
        .from('notes')
        .insert(notesToInsert)
        .select();

      if (notesError) {
        console.error('Error migrating notes:', notesError);
        // If notes migration fails, restore guest data
        await guestModeManager.initialize();
        throw new Error(`Failed to migrate notes: ${notesError.message}`);
      } else {
        notesMigrated = insertedNotes?.length || 0;
        console.log(`Successfully migrated ${notesMigrated} notes`);
      }
    }

    // Migrate reminders (if any)
    if (reminders.length > 0) {
      const remindersToInsert = reminders.map((reminder: any) => ({
        user_id: userId,
        note_id: reminder.note_id,
        remind_at: reminder.remind_at,
        natural_input: reminder.natural_input,
        is_completed: reminder.is_completed,
        created_at: reminder.created_at,
      }));

      const { data: insertedReminders, error: remindersError } = await supabase
        .from('reminders')
        .insert(remindersToInsert)
        .select();

      if (remindersError) {
        console.error('Error migrating reminders:', remindersError);
        // Note: We don't throw here as notes migration was successful
      } else {
        remindersMigrated = insertedReminders?.length || 0;
        console.log(`Successfully migrated ${remindersMigrated} reminders`);
      }
    }

    return {
      notesMigrated,
      remindersMigrated,
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw new Error('Failed to migrate guest data');
  }
}

export async function checkForGuestData(): Promise<boolean> {
  try {
    const guestUser = await guestModeManager.getGuestUser();
    const guestNotes = await guestModeManager.getGuestNotes();
    return !!(guestUser && guestNotes.length > 0);
  } catch (error) {
    console.error('Error checking for guest data:', error);
    return false;
  }
} 
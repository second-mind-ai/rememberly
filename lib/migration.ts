import { supabase } from './supabase';
import { guestModeManager, GuestNote } from './guestMode';

export async function migrateGuestDataToUser(userId: string): Promise<{
  notesMigrated: number;
  remindersMigrated: number;
}> {
  try {
    if (!userId) {
      console.error('❌ Cannot migrate guest data: userId is null or undefined');
      throw new Error('Invalid user ID for migration');
    }

    console.log('🔄 Starting migration of guest data to user:', userId);
    
    // Get guest data before clearing it
    const guestData = await guestModeManager.migrateGuestDataToUser(userId);
    const { notes, reminders } = guestData;

    console.log(`📋 Found ${notes.length} guest notes and ${reminders.length} guest reminders to migrate`);

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
        console.log('✅ User session verified for migration');
      } else {
        console.log(`⚠️ User session verification attempt ${retries + 1} failed:`, userError);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!userVerified) {
      console.error('❌ User session could not be verified after multiple attempts');
      // Restore guest data and throw error
      await guestModeManager.initialize();
      throw new Error('User session not properly established');
    }

    // Migrate notes
    if (notes.length > 0) {
      console.log('📝 Migrating notes to user account...');
      
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

      // Insert notes in batches to avoid potential size limits
      const batchSize = 10;
      for (let i = 0; i < notesToInsert.length; i += batchSize) {
        const batch = notesToInsert.slice(i, i + batchSize);
        
        const { data: insertedNotes, error: notesError } = await supabase
          .from('notes')
          .insert(batch)
          .select();

        if (notesError) {
          console.error('❌ Error migrating notes batch:', notesError);
          // Continue with next batch instead of failing completely
        } else {
          notesMigrated += insertedNotes?.length || 0;
          console.log(`✅ Migrated batch of ${insertedNotes?.length || 0} notes`);
        }
      }

      console.log(`✅ Successfully migrated ${notesMigrated} notes`);
    }

    // Migrate reminders (if any)
    if (reminders.length > 0) {
      console.log('🔔 Migrating reminders to user account...');
      
      const remindersToInsert = reminders.map((reminder: any) => ({
        user_id: userId,
        note_id: reminder.note_id,
        remind_at: reminder.remind_at,
        natural_input: reminder.natural_input || `Reminder set on ${new Date(reminder.created_at).toLocaleDateString()}`,
        is_completed: reminder.is_completed,
        created_at: reminder.created_at,
        title: reminder.title || 'Migrated Reminder',
        description: reminder.description || '',
        priority: reminder.priority || 'medium',
      }));

      const { data: insertedReminders, error: remindersError } = await supabase
        .from('reminders')
        .insert(remindersToInsert)
        .select();

      if (remindersError) {
        console.error('❌ Error migrating reminders:', remindersError);
        // Note: We don't throw here as notes migration was successful
      } else {
        remindersMigrated = insertedReminders?.length || 0;
        console.log(`✅ Successfully migrated ${remindersMigrated} reminders`);
      }
    }

    console.log('🎉 Migration completed successfully!');
    return {
      notesMigrated,
      remindersMigrated,
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
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
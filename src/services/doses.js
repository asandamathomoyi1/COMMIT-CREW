import { supabase } from './supabase';
import { getUserFast } from './currentUser';

const MISSED_DOSE_GRACE_MINUTES = 60;

function getLocalDateString(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, '0');

  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createScheduledDate(doseTime) {
  const [hours, minutes] = doseTime.slice(0, 5).split(':').map(Number);

  const scheduledDate = new Date();

  scheduledDate.setHours(hours, minutes, 0, 0);

  return scheduledDate;
}

export async function processMissedDoses() {
  const { data: userData, error: userError } = await getUserFast();

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    throw new Error('Your session has expired.');
  }

  const { data, error } = await supabase
    .from('medication_schedules')
    .select(
      `
      id,
      medication_id,
      dose_time,
      is_active,
      medications (
        id,
        start_date,
        end_date,
        is_active
      )
    `
    )
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  const schedules = (data ?? [])
    .map((item) => ({
      ...item,

      medications: Array.isArray(item.medications)
        ? (item.medications[0] ?? null)
        : item.medications,
    }))
    .filter((item) => item.medications?.id);

  const now = new Date();

  const today = getLocalDateString(now);

  const dueSchedules = schedules.filter((schedule) => {
    const medication = schedule.medications;

    if (!medication || !medication.is_active) {
      return false;
    }

    if (medication.start_date && today < medication.start_date) {
      return false;
    }

    if (medication.end_date && today > medication.end_date) {
      return false;
    }

    const scheduledDate = createScheduledDate(schedule.dose_time);

    const missedAfter = new Date(scheduledDate.getTime() + MISSED_DOSE_GRACE_MINUTES * 60 * 1000);

    return now >= missedAfter;
  });

  // Run all the checks at the same time instead of one after another.
  const results = await Promise.all(
    dueSchedules.map(async (schedule) => {
      const scheduledDate = createScheduledDate(schedule.dose_time);

      const { data: inserted, error: missedDoseError } = await supabase.rpc('record_missed_dose', {
        p_medication_id: schedule.medication_id,

        p_schedule_id: schedule.id,

        p_scheduled_for: scheduledDate.toISOString(),
      });

      if (missedDoseError) {
        console.error('Missed dose processing error:', missedDoseError.message);

        return false;
      }

      return inserted === true;
    })
  );

  const recordedCount = results.filter(Boolean).length;

  return recordedCount;
}

import { supabase } from './supabase';


const SAFETY_NOTE =
  'MedTrack supports medication tracking and does not replace advice from your doctor or pharmacist.';

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function describeMedication(medication) {
  const dosage = medication.dosage ? ` — ${medication.dosage}` : '';
  return `• ${medication.name}${dosage}`;
}

export function buildLocalReply(question, { firstName = '', medications = [], doseLogs = [] }) {
  const q = String(question ?? '').toLowerCase();
  const name = firstName ? `${firstName}, ` : '';

  const taken = doseLogs.filter((log) => log.status === 'taken').length;
  const missed = doseLogs.filter((log) => log.status === 'missed').length;
  const skipped = doseLogs.filter((log) => log.status === 'skipped').length;
  const adherence = doseLogs.length ? Math.round((taken / doseLogs.length) * 100) : null;

  const nameById = Object.fromEntries(medications.map((m) => [m.id, m.name]));

  const wantsEmergency =
    /overdose|too many (pills|tablets)|can'?t breathe|cannot breathe|chest pain|allergic reaction|swelling|suicid|kill myself|poison/.test(
      q
    );

  if (wantsEmergency) {
    return 'This could be an emergency. Please call your local emergency number or go to the nearest emergency room now. You can also open the Emergency screen in MedTrack to reach your emergency contacts.';
  }

  if (
    /refill|running low|low (on )?(stock|supply)|how many (left|remaining)|supply|quantity/.test(q)
  ) {
    if (medications.length === 0) {
      return `${name}you do not have any active medications saved yet.`;
    }

    const lines = medications.map((m) =>
      m.current_quantity === null || m.current_quantity === undefined
        ? `• ${m.name}: no supply count saved`
        : `• ${m.name}: ${plural(m.current_quantity, 'dose')} left`
    );

    return `Here is your remaining supply:\n${lines.join('\n')}`;
  }

  if (
    /instruction|direction|how (do|should) i take|with food|before (food|meal)|after (food|meal)/.test(
      q
    )
  ) {
    if (medications.length === 0) {
      return `${name}you do not have any active medications saved yet.`;
    }

    const lines = medications.map(
      (m) =>
        `• ${m.name}: ${m.instructions?.trim() || 'no instructions saved. Check the label or ask your pharmacist.'}`
    );

    return `Here are the instructions you saved:\n${lines.join('\n')}\n\n${SAFETY_NOTE}`;
  }

  if (/miss|forgot|forget|late/.test(q)) {
    if (doseLogs.length === 0) {
      return `${name}I do not see any recorded doses in the last 7 days yet.`;
    }

    if (missed === 0) {
      return `${name}you have no missed doses in the last 7 days. Great work!`;
    }

    const recent = doseLogs
      .filter((log) => log.status === 'missed')
      .slice(0, 5)
      .map((log) => {
        const when = new Date(log.scheduled_for).toLocaleString([], {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `• ${nameById[log.medication_id] ?? 'Medication'} — ${when}`;
      });

    return `You missed ${plural(missed, 'dose')} in the last 7 days:\n${recent.join(
      '\n'
    )}\n\nIf you miss a dose, check your medication leaflet or ask your pharmacist what to do. Do not double up unless a professional tells you to.`;
  }

  if (/adherence|progress|how am i doing|on track|streak|score/.test(q)) {
    if (adherence === null) {
      return `${name}there are no recorded doses in the last 7 days yet, so I cannot calculate your adherence.`;
    }

    return `In the last 7 days you recorded ${plural(doseLogs.length, 'dose')}: ${taken} taken, ${missed} missed, ${skipped} skipped. That is ${adherence}% adherence.${
      adherence >= 90
        ? ' Excellent consistency!'
        : adherence >= 70
          ? ' Good progress. Reminders can help you reach 90%+.'
          : ' Turning on reminders and keeping doses at the same times each day can help.'
    }`;
  }

  if (/medication|medicine|pill|tablet|taking|prescri|list|what am i/.test(q)) {
    if (medications.length === 0) {
      return `${name}you do not have any active medications saved yet. Tap the + button to add one.`;
    }

    return `You are currently taking ${plural(medications.length, 'medication')}:\n${medications
      .map(describeMedication)
      .join('\n')}`;
  }

  if (/side effect|interact|safe to|can i take|dose|dosage|stop taking|pregnan/.test(q)) {
    return `That is a question for your doctor or pharmacist, because the answer depends on your health and your other medicines. I can show you your saved medications, instructions, supply and adherence. ${SAFETY_NOTE}`;
  }

  return `I can help with your medication list, instructions, remaining supply, missed doses and adherence. Try asking "What medications am I taking?" or "Have I missed any doses?". ${SAFETY_NOTE}`;
}

/**
 * Asks the cloud assistant. Resolves to { reply, source } where source is
 * 'ai' (edge function) or 'local' (on-device fallback).
 */
export async function askMedTrackAI(message, { history = [], context = {} } = {}) {
  try {
    const { data, error } = await supabase.functions.invoke('dosewise-ai', {
      body: {
        message,
        history: history.slice(-10).map((item) => ({ role: item.role, text: item.text })),
      },
    });

    if (error) {
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';

    if (!reply) {
      throw new Error('Empty reply from AI service.');
    }

    return { reply, source: 'ai' };
  } catch (error) {
    console.log('MedTrack AI unavailable, using on-device answer:', error?.message);

    return { reply: buildLocalReply(message, context), source: 'local' };
  }
}

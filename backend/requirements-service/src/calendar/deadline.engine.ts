import { calendarRepository } from './calendar.repository';

export interface DeadlineAdjustmentResult {
  original_deadline: string;
  adjusted_deadline: string;
  was_adjusted: boolean;
  shifts_applied: number;
  reasons: string[];
}

export class DeadlineEngine {
  /**
   * SMS-033: Calendar-Aware Intelligent Deadline Engine
   * AC 1: The standard submission cut-off time is strictly 23:59:59.
   * AC 2: If a deadline falls on a weekend, statutory holiday, or campus suspension,
   *       it automatically rolls forward to 23:59:59 of the next official working day.
   * AC 3: Handles multi-day cascading holidays and suspensions without manual intervention.
   */
  async calculateAdjustedDeadline(rawDeadline: string | Date, termCode: string): Promise<DeadlineAdjustmentResult> {
    const inputDate = typeof rawDeadline === 'string' ? new Date(rawDeadline) : new Date(rawDeadline.getTime());
    
    // Normalize to YYYY-MM-DD in UTC/Local context
    let year = inputDate.getFullYear();
    let month = inputDate.getMonth();
    let day = inputDate.getDate();

    let current = new Date(Date.UTC(year, month, day, 12, 0, 0));
    const originalDateIso = current.toISOString().split('T')[0];
    
    const reasons: string[] = [];
    let shifts = 0;
    const maxShifts = 30; // Safety guard against infinite loops

    while (shifts < maxShifts) {
      const dateStr = current.toISOString().split('T')[0];
      const check = await calendarRepository.isNonWorkingDay(termCode, dateStr);

      if (!check.isNonWorking) {
        break;
      }

      reasons.push(`Pushed out from ${dateStr} due to: ${check.reason}`);
      current.setUTCDate(current.getUTCDate() + 1);
      shifts++;
    }

    const finalDateStr = current.toISOString().split('T')[0];
    // Strictly format to 23:59:59 Philippine Time / Local ISO (UTC+8)
    const adjustedIso = `${finalDateStr}T23:59:59+08:00`;

    return {
      original_deadline: typeof rawDeadline === 'string' ? rawDeadline : rawDeadline.toISOString(),
      adjusted_deadline: adjustedIso,
      was_adjusted: shifts > 0,
      shifts_applied: shifts,
      reasons,
    };
  }
}

export const deadlineEngine = new DeadlineEngine();

export interface WeightEntryItem {
  id: string;
  weightKg: number;
  recordedAt: Date;
  note?: string | null;
}

export interface WeightSummaryCalculationInput {
  entries: WeightEntryItem[];
  profileBaselineWeightKg?: number;
  targetWeightKg?: number | null;
  goal?: 'lose_weight' | 'maintain_weight' | 'gain_weight';
}

export interface WeightSummaryResult {
  startingWeight: number;
  currentWeight: number;
  targetWeight: number | null;
  totalChange: number;
  remainingToGoal: number | null;
  percentageProgress: number | null;
  totalEntries: number;
  latestRecordedAt: Date | null;
}

export class WeightCalculatorService {
  /**
   * Calculates comprehensive weight progression metrics from historical entries and user goals.
   */
  public calculateSummary(input: WeightSummaryCalculationInput): WeightSummaryResult {
    const {
      entries,
      profileBaselineWeightKg = 0,
      targetWeightKg = null,
      goal = 'lose_weight',
    } = input;

    // Sort entries chronologically (oldest first)
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    let startingWeight: number;
    let currentWeight: number;
    let latestRecordedAt: Date | null = null;

    if (sortedEntries.length > 0) {
      // Rule 1: startingWeight is the chronologically earliest recorded entry
      startingWeight = sortedEntries[0].weightKg;
      // Rule 2: currentWeight is the chronologically latest recorded entry
      const latestEntry = sortedEntries[sortedEntries.length - 1];
      currentWeight = latestEntry.weightKg;
      latestRecordedAt = new Date(latestEntry.recordedAt);
    } else {
      // Fallback baseline when no weight entries exist yet
      startingWeight = profileBaselineWeightKg;
      currentWeight = profileBaselineWeightKg;
    }

    // Total change = currentWeight - startingWeight
    const totalChange = Math.round((currentWeight - startingWeight) * 10) / 10;

    let remainingToGoal: number | null = null;
    let percentageProgress: number | null = null;

    if (targetWeightKg !== null && targetWeightKg !== undefined) {
      if (goal === 'lose_weight') {
        // Remaining to lose
        remainingToGoal = Math.round(Math.max(0, currentWeight - targetWeightKg) * 10) / 10;

        const totalLossNeeded = startingWeight - targetWeightKg;
        if (totalLossNeeded > 0) {
          const lossAchieved = startingWeight - currentWeight;
          const rawPct = Math.round((lossAchieved / totalLossNeeded) * 100);
          percentageProgress = Math.max(0, Math.min(100, rawPct));
        }
      } else if (goal === 'gain_weight') {
        // Remaining to gain
        remainingToGoal = Math.round(Math.max(0, targetWeightKg - currentWeight) * 10) / 10;

        const totalGainNeeded = targetWeightKg - startingWeight;
        if (totalGainNeeded > 0) {
          const gainAchieved = currentWeight - startingWeight;
          const rawPct = Math.round((gainAchieved / totalGainNeeded) * 100);
          percentageProgress = Math.max(0, Math.min(100, rawPct));
        }
      } else if (goal === 'maintain_weight') {
        // For maintenance, report variance from target/starting without a misleading % progress
        remainingToGoal = Math.round(Math.abs(currentWeight - targetWeightKg) * 10) / 10;
        percentageProgress = null;
      }
    }

    return {
      startingWeight: Math.round(startingWeight * 10) / 10,
      currentWeight: Math.round(currentWeight * 10) / 10,
      targetWeight: targetWeightKg !== null ? Math.round(targetWeightKg * 10) / 10 : null,
      totalChange,
      remainingToGoal,
      percentageProgress,
      totalEntries: sortedEntries.length,
      latestRecordedAt,
    };
  }
}

export const weightCalculator = new WeightCalculatorService();

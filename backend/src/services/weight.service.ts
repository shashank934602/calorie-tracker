import { prisma } from '../config/prisma';
import { CreateWeightEntryInput, UpdateWeightEntryInput, WeightQuery } from '../schemas/weight.schema';
import { weightCalculator, WeightSummaryResult } from './weight-calculator.service';

export interface WeightEntryResponse {
  id: string;
  userId: string;
  weightKg: number;
  recordedAt: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class WeightService {
  /**
   * Retrieves weight history for the authenticated user.
   */
  async listWeightEntries(userId: string, query: WeightQuery): Promise<WeightEntryResponse[]> {
    const { order = 'desc', limit = 100 } = query;

    const entries = await prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { recordedAt: order },
      take: limit,
    });

    return entries;
  }

  /**
   * Records a new body weight measurement.
   */
  async createWeightEntry(userId: string, data: CreateWeightEntryInput): Promise<WeightEntryResponse> {
    const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date();

    const entry = await prisma.weightEntry.create({
      data: {
        userId,
        weightKg: data.weightKg,
        recordedAt,
        note: data.note || null,
      },
    });

    return entry;
  }

  /**
   * Updates an existing weight measurement ensuring user ownership.
   */
  async updateWeightEntry(
    userId: string,
    entryId: string,
    data: UpdateWeightEntryInput
  ): Promise<WeightEntryResponse> {
    const existing = await prisma.weightEntry.findFirst({
      where: {
        id: entryId,
        userId,
      },
    });

    if (!existing) {
      const error = new Error('Weight entry not found or unauthorized to modify');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    const updated = await prisma.weightEntry.update({
      where: { id: entryId },
      data: {
        ...(data.weightKg !== undefined && { weightKg: data.weightKg }),
        ...(data.recordedAt !== undefined && { recordedAt: new Date(data.recordedAt) }),
        ...(data.note !== undefined && { note: data.note }),
      },
    });

    return updated;
  }

  /**
   * Deletes a weight measurement ensuring user ownership.
   */
  async deleteWeightEntry(userId: string, entryId: string): Promise<{ id: string; message: string }> {
    const existing = await prisma.weightEntry.findFirst({
      where: {
        id: entryId,
        userId,
      },
    });

    if (!existing) {
      const error = new Error('Weight entry not found or unauthorized to delete');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    await prisma.weightEntry.delete({
      where: { id: entryId },
    });

    return {
      id: entryId,
      message: 'Weight entry deleted successfully',
    };
  }

  /**
   * Computes the weight summary, goal progress, and historical progression.
   */
  async getWeightSummary(userId: string): Promise<WeightSummaryResult> {
    // 1. Fetch user's profile and all weight entries in parallel
    const [profile, entries] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.weightEntry.findMany({
        where: { userId },
        orderBy: { recordedAt: 'asc' },
      }),
    ]);

    // 2. Compute via pure calculation service
    return weightCalculator.calculateSummary({
      entries,
      profileBaselineWeightKg: profile?.weightKg,
      targetWeightKg: profile?.targetWeightKg,
      goal: profile?.goal as 'lose_weight' | 'maintain_weight' | 'gain_weight' | undefined,
    });
  }
}

export const weightService = new WeightService();

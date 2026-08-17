import { prisma } from '../config/prisma';
import { ProfileInput } from '../schemas/profile.schema';
import { nutritionCalculator, NutritionTargets, Sex, ActivityLevel, Goal } from './nutrition-calculator.service';

export interface ProfileWithTargets {
  profile: {
    id: string;
    userId: string;
    age: number;
    sex: Sex;
    heightCm: number;
    weightKg: number;
    targetWeightKg: number | null;
    activityLevel: ActivityLevel;
    goal: Goal;
    createdAt: Date;
    updatedAt: Date;
  };
  targets: NutritionTargets;
}

export class ProfileService {
  /**
   * Retrieves user profile and calculated targets.
   */
  async getProfile(userId: string): Promise<ProfileWithTargets | null> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return null;
    }

    const targets = nutritionCalculator.calculateAllTargets({
      age: profile.age,
      sex: profile.sex as Sex,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      activityLevel: profile.activityLevel as ActivityLevel,
      goal: profile.goal as Goal,
    });

    return {
      profile: {
        id: profile.id,
        userId: profile.userId,
        age: profile.age,
        sex: profile.sex as Sex,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        targetWeightKg: profile.targetWeightKg,
        activityLevel: profile.activityLevel as ActivityLevel,
        goal: profile.goal as Goal,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      targets,
    };
  }

  /**
   * Creates or updates the user profile and calculates updated nutrition targets.
   */
  async upsertProfile(userId: string, data: ProfileInput): Promise<ProfileWithTargets> {
    const profile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        age: data.age,
        sex: data.sex,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        targetWeightKg: data.targetWeightKg ?? null,
        activityLevel: data.activityLevel,
        goal: data.goal,
      },
      update: {
        age: data.age,
        sex: data.sex,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        targetWeightKg: data.targetWeightKg !== undefined ? data.targetWeightKg : undefined,
        activityLevel: data.activityLevel,
        goal: data.goal,
      },
    });

    const targets = nutritionCalculator.calculateAllTargets({
      age: profile.age,
      sex: profile.sex as Sex,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      activityLevel: profile.activityLevel as ActivityLevel,
      goal: profile.goal as Goal,
    });

    return {
      profile: {
        id: profile.id,
        userId: profile.userId,
        age: profile.age,
        sex: profile.sex as Sex,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        targetWeightKg: profile.targetWeightKg,
        activityLevel: profile.activityLevel as ActivityLevel,
        goal: profile.goal as Goal,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      targets,
    };
  }

  /**
   * Retrieves calculated nutrition targets for a user.
   */
  async getNutritionTargets(userId: string): Promise<NutritionTargets> {
    const profileWithTargets = await this.getProfile(userId);

    if (!profileWithTargets) {
      const error = new Error('Nutrition profile not found. Please complete profile onboarding first.');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    return profileWithTargets.targets;
  }
}

export const profileService = new ProfileService();

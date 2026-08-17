export interface UnitConversionResult {
  quantityInServingUnit: number;
  servingUnit: string;
  needsConfirmation: boolean;
  conversionNote: string | null;
}

export class UnitConverterService {
  /**
   * Translates colloquial user portions and food units into standardized gram / ml quantities.
   */
  public resolvePortion(
    foodName: string,
    foodCatalogServingUnit: string,
    rawQuantity: number,
    rawUnit: string
  ): UnitConversionResult {
    const normFood = foodName.toLowerCase();
    const normUnit = rawUnit.trim().toLowerCase();
    const qty = rawQuantity > 0 ? rawQuantity : 1;

    // 1. Direct Grams
    if (normUnit === 'g' || normUnit === 'gram' || normUnit === 'grams') {
      return {
        quantityInServingUnit: Math.round(qty * 10) / 10,
        servingUnit: 'g',
        needsConfirmation: false,
        conversionNote: null,
      };
    }

    // 2. Kilograms
    if (normUnit === 'kg' || normUnit === 'kilogram' || normUnit === 'kilograms') {
      return {
        quantityInServingUnit: Math.round(qty * 1000),
        servingUnit: 'g',
        needsConfirmation: false,
        conversionNote: null,
      };
    }

    // 3. Milliliters (Volume)
    if (normUnit === 'ml' || normUnit === 'milliliter' || normUnit === 'milliliters') {
      if (foodCatalogServingUnit === 'ml') {
        return {
          quantityInServingUnit: Math.round(qty),
          servingUnit: 'ml',
          needsConfirmation: false,
          conversionNote: null,
        };
      }
      // For non-liquid foods, do NOT silently assume 1ml = 1g
      return {
        quantityInServingUnit: Math.round(qty),
        servingUnit: 'g',
        needsConfirmation: true,
        conversionNote: 'Volume specified for solid food; please confirm weight in grams.',
      };
    }

    // 4. Predefined Food-Specific Conversions
    // Whole Eggs (50g per egg)
    if (normFood.includes('egg')) {
      if (normUnit === 'piece' || normUnit === 'pieces' || normUnit === 'egg' || normUnit === 'eggs' || normUnit === 'whole') {
        return {
          quantityInServingUnit: Math.round(qty * 50),
          servingUnit: 'g',
          needsConfirmation: false,
          conversionNote: `${qty} whole egg${qty > 1 ? 's' : ''} (50g each = ${qty * 50}g)`,
        };
      }
    }

    // Roti / Chapati (40g per roti)
    if (normFood.includes('roti') || normFood.includes('chapati') || normFood.includes('bread')) {
      if (normUnit === 'piece' || normUnit === 'pieces' || normUnit === 'roti' || normUnit === 'rotis' || normUnit === 'slice' || normUnit === 'slices') {
        const weightPerPiece = normFood.includes('bread') ? 35 : 40;
        return {
          quantityInServingUnit: Math.round(qty * weightPerPiece),
          servingUnit: 'g',
          needsConfirmation: false,
          conversionNote: `${qty} piece${qty > 1 ? 's' : ''} (~${weightPerPiece}g each = ${qty * weightPerPiece}g)`,
        };
      }
    }

    // Banana (120g per medium banana)
    if (normFood.includes('banana')) {
      if (normUnit === 'piece' || normUnit === 'pieces' || normUnit === 'banana' || normUnit === 'bananas' || normUnit === 'medium') {
        return {
          quantityInServingUnit: Math.round(qty * 120),
          servingUnit: 'g',
          needsConfirmation: false,
          conversionNote: `${qty} medium banana${qty > 1 ? 's' : ''} (~120g each = ${qty * 120}g)`,
        };
      }
    }

    // Apple (180g per medium apple)
    if (normFood.includes('apple')) {
      if (normUnit === 'piece' || normUnit === 'pieces' || normUnit === 'apple' || normUnit === 'apples' || normUnit === 'medium') {
        return {
          quantityInServingUnit: Math.round(qty * 180),
          servingUnit: 'g',
          needsConfirmation: false,
          conversionNote: `${qty} medium apple${qty > 1 ? 's' : ''} (~180g each = ${qty * 180}g)`,
        };
      }
    }

    // Whey Protein Scoop (30g per scoop)
    if (normFood.includes('whey') || normFood.includes('protein powder')) {
      if (normUnit === 'scoop' || normUnit === 'scoops') {
        return {
          quantityInServingUnit: Math.round(qty * 30),
          servingUnit: 'g',
          needsConfirmation: false,
          conversionNote: `${qty} scoop${qty > 1 ? 's' : ''} (30g each = ${qty * 30}g)`,
        };
      }
    }

    // Bowls of Cooked Staples (Flags needsConfirmation)
    if (normUnit === 'bowl' || normUnit === 'bowls') {
      if (normFood.includes('rice')) {
        return {
          quantityInServingUnit: Math.round(qty * 180),
          servingUnit: 'g',
          needsConfirmation: true,
          conversionNote: 'Estimated 1 standard bowl of cooked rice (~180g); please confirm.',
        };
      }
      if (normFood.includes('dal') || normFood.includes('lentil')) {
        return {
          quantityInServingUnit: Math.round(qty * 200),
          servingUnit: 'g',
          needsConfirmation: true,
          conversionNote: 'Estimated 1 standard bowl of dal (~200g); please confirm.',
        };
      }
      return {
        quantityInServingUnit: Math.round(qty * 200),
        servingUnit: 'g',
        needsConfirmation: true,
        conversionNote: `Estimated standard bowl (~200g); please adjust to your exact portion.`,
      };
    }

    // Cups of Liquids / Solids
    if (normUnit === 'cup' || normUnit === 'cups') {
      if (foodCatalogServingUnit === 'ml' || normFood.includes('milk')) {
        return {
          quantityInServingUnit: Math.round(qty * 240),
          servingUnit: 'ml',
          needsConfirmation: true,
          conversionNote: 'Estimated 1 standard cup (~240ml); please confirm.',
        };
      }
      if (normFood.includes('rice')) {
        return {
          quantityInServingUnit: Math.round(qty * 150),
          servingUnit: 'g',
          needsConfirmation: true,
          conversionNote: 'Estimated 1 cup cooked (~150g); please confirm.',
        };
      }
      if (normFood.includes('oats')) {
        return {
          quantityInServingUnit: Math.round(qty * 80),
          servingUnit: 'g',
          needsConfirmation: true,
          conversionNote: 'Estimated 1 cup raw oats (~80g); please confirm.',
        };
      }
    }

    // Tablespoon
    if (normUnit === 'tbsp' || normUnit === 'tablespoon' || normUnit === 'tablespoons') {
      const weightPerTbsp = normFood.includes('peanut butter') ? 16 : 15;
      return {
        quantityInServingUnit: Math.round(qty * weightPerTbsp),
        servingUnit: 'g',
        needsConfirmation: true,
        conversionNote: `Estimated ${qty} tbsp (~${weightPerTbsp}g each = ${qty * weightPerTbsp}g); please confirm.`,
      };
    }

    // Default Fallback
    return {
      quantityInServingUnit: Math.round(qty),
      servingUnit: foodCatalogServingUnit,
      needsConfirmation: true,
      conversionNote: `Unspecified or generic unit "${rawUnit}". Estimated ${qty}${foodCatalogServingUnit}; please confirm.`,
    };
  }
}

export const unitConverter = new UnitConverterService();

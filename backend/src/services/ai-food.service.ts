import { GoogleGenAI } from '@google/genai';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { RawAiParsedResponse, rawAiParsedResponseSchema } from '../schemas/ai-food.schema';
import { unitConverter, UnitConversionResult } from './unit-converter.service';
import { foodCalculator, CalculatedFoodNutrition } from './food-calculator.service';

export interface AiFoodCandidateItem {
  rawText: string;
  foodId: string | null;
  foodName: string;
  matchedFoodName: string | null;
  quantityInServingUnit: number;
  servingUnit: string;
  matchConfidence: 'high' | 'medium' | 'low' | 'none';
  needsConfirmation: boolean;
  conversionNote: string | null;
  calculatedNutrition: CalculatedFoodNutrition | null;
  alternateCandidates?: Array<{
    id: string;
    name: string;
    servingUnit: string;
    caloriesPer100g: number;
  }>;
}

export interface AiFoodParseResponse {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  originalText: string;
  items: AiFoodCandidateItem[];
  totals: CalculatedFoodNutrition;
  requiresUserClarification: boolean;
}

export class AiFoodService {
  private client: GoogleGenAI | null = null;
  private isMockMode: boolean = false;
  private mockResponse: RawAiParsedResponse | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      try {
        this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      } catch (err) {
        console.warn('Could not initialize GoogleGenAI client:', err);
      }
    }
  }

  /**
   * Sets mock response for automated testing.
   */
  public setMockMode(enabled: boolean, response: RawAiParsedResponse | null = null): void {
    this.isMockMode = enabled;
    this.mockResponse = response;
  }

  /**
   * Calls Google Gemini with structured output to parse freeform text.
   */
  private async parseWithLLM(text: string): Promise<RawAiParsedResponse> {
    // 1. Mock Mode for unit tests
    if (this.isMockMode && this.mockResponse) {
      return this.mockResponse;
    }

    // 2. Real Gemini Interactions / Generation API if API key is provided
    if (this.client && env.GEMINI_API_KEY) {
      try {
        const systemPrompt = `You are a nutrition logging semantic parser.
Your task is to analyze natural-language descriptions of food consumption and extract:
1. "mealType": One of "breakfast", "lunch", "dinner", or "snack". Infer from context or time of day mentioned (e.g. morning -> breakfast, evening -> dinner/snack). Default to "lunch" if unspecified.
2. "items": An array of individual food items found in the text.
For each food item:
- "rawText": The exact phrase from the user description.
- "foodName": The clean, standard name of the food item (e.g. "Whole Egg", "Chicken Breast", "Cooked Rice", "Roti", "Milk", "Banana", "Apple", "Curd", "Oats").
- "quantity": Numeric quantity (e.g. 3, 200, 1.5). Default to 1 if unspecified.
- "unit": Unit of measurement (e.g. "g", "grams", "ml", "egg", "roti", "piece", "banana", "bowl", "cup", "tbsp", "scoop"). Default to "piece" or "g".
- "notes": Optional context.

CRITICAL: Do NOT calculate calories, protein, carbs, or fat. Output strictly valid JSON conforming to the schema.`;

        const response = await this.client.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: `User food description: "${text}"`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                mealType: {
                  type: 'string',
                  enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      rawText: { type: 'string' },
                      foodName: { type: 'string' },
                      quantity: { type: 'number' },
                      unit: { type: 'string' },
                      notes: { type: 'string' },
                    },
                    required: ['rawText', 'foodName', 'quantity', 'unit'],
                  },
                },
              },
              required: ['mealType', 'items'],
            },
          },
        });

        const outputText = response.text?.trim();
        if (outputText) {
          const parsed = JSON.parse(outputText);
          return rawAiParsedResponseSchema.parse(parsed);
        }
      } catch (err) {
        console.warn('Gemini API call failed or timed out, falling back to heuristic parser:', err);
      }
    }

    // 3. Robust Heuristic Rule-Based Semantic Parser (Development & Offline Fallback)
    return this.heuristicParse(text);
  }

  /**
   * Deterministic semantic parser for offline development & fallback.
   */
  private heuristicParse(text: string): RawAiParsedResponse {
    const lower = text.toLowerCase();

    // Infer meal type
    let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'lunch';
    if (lower.includes('breakfast') || lower.includes('morning')) mealType = 'breakfast';
    else if (lower.includes('dinner') || lower.includes('night')) mealType = 'dinner';
    else if (lower.includes('snack') || lower.includes('tea') || lower.includes('evening')) mealType = 'snack';
    else if (lower.includes('lunch') || lower.includes('afternoon')) mealType = 'lunch';

    const items: Array<{ rawText: string; foodName: string; quantity: number; unit: string }> = [];

    // Split common conjunctions ("and", ",", "+", "with")
    const segments = lower
      .replace(/for (breakfast|lunch|dinner|snack)/gi, '')
      .replace(/i (had|ate|consumed|drank)/gi, '')
      .split(/,|\band\b|\bwith\b|\+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);

    const patterns = [
      // Pattern 1: "200g chicken" or "250ml milk"
      /(\d+(?:\.\d+)?)\s*(g|grams|kg|ml|oz|lbs)\s+(?:of\s+)?([a-z\s]+)/i,
      // Pattern 2: "3 eggs" or "2 rotis" or "1 banana"
      /(\d+(?:\.\d+)?)\s+(?:pieces?\s+of\s+|slices?\s+of\s+|cups?\s+of\s+|bowls?\s+of\s+)?([a-z\s]+)/i,
      // Pattern 3: "a bowl of rice" or "one cup of milk"
      /(a|an|one|two|three|four|five)\s+(bowl|cup|scoop|slice|piece|medium)?\s*(?:of\s+)?([a-z\s]+)/i,
      // Pattern 4: "chicken 200g"
      /([a-z\s]+)\s+(\d+(?:\.\d+)?)\s*(g|grams|kg|ml)/i,
    ];

    const wordNumbers: Record<string, number> = {
      a: 1,
      an: 1,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
    };

    for (const segment of segments) {
      let matched = false;

      // Pattern 1: Number + Unit + Food Name
      const m1 = segment.match(/^(\d+(?:\.\d+)?)\s*(g|grams|kg|ml|tbsp|scoops?)\s+(?:of\s+)?(.+)$/i);
      if (m1) {
        items.push({
          rawText: segment,
          quantity: parseFloat(m1[1]),
          unit: m1[2].toLowerCase(),
          foodName: m1[3].trim(),
        });
        matched = true;
      }

      // Pattern 2: Number + Food Name (e.g. "3 eggs", "2 rotis", "1 bowl rice")
      if (!matched) {
        const m2 = segment.match(/^(\d+(?:\.\d+)?)\s+(?:(bowl|cup|scoop|slice|piece|medium|tablespoon|tbsp)s?\s+of\s+)?(.+)$/i);
        if (m2) {
          const qty = parseFloat(m2[1]);
          const unit = m2[2] ? m2[2].toLowerCase() : 'piece';
          items.push({
            rawText: segment,
            quantity: qty,
            unit,
            foodName: m2[3].trim(),
          });
          matched = true;
        }
      }

      // Pattern 3: Word Quantity (e.g. "a bowl of rice", "one banana")
      if (!matched) {
        const m3 = segment.match(/^(a|an|one|two|three|four|five)\s+(?:(bowl|cup|scoop|slice|piece|medium)\s+of\s+)?(.+)$/i);
        if (m3) {
          const qty = wordNumbers[m3[1].toLowerCase()] || 1;
          const unit = m3[2] ? m3[2].toLowerCase() : 'piece';
          items.push({
            rawText: segment,
            quantity: qty,
            unit,
            foodName: m3[3].trim(),
          });
          matched = true;
        }
      }

      // Fallback: entire segment as food with 100g standard
      if (!matched && segment.length > 2) {
        items.push({
          rawText: segment,
          quantity: 100,
          unit: 'g',
          foodName: segment.trim(),
        });
      }
    }

    return {
      mealType,
      items: items.length > 0 ? items : [{ rawText: text, foodName: text, quantity: 100, unit: 'g' }],
    };
  }

  /**
   * Main entry point: Parses user text, matches against catalog, and calculates nutrition.
   * Performs ZERO database mutations.
   */
  public async parseAndPreview(text: string): Promise<AiFoodParseResponse> {
    // 1. Parse text using LLM / Heuristic Engine
    const parsed = await this.parseWithLLM(text);

    // 2. Fetch entire food catalog for fuzzy/alias matching
    const catalogFoods = await prisma.food.findMany({
      orderBy: { name: 'asc' },
    });

    const candidates: AiFoodCandidateItem[] = [];
    let requiresClarification = false;

    // 3. Match each extracted food against the catalog
    for (const rawItem of parsed.items) {
      const matchResult = this.matchFoodInCatalog(rawItem.foodName, catalogFoods);

      if (matchResult.matchedFood) {
        const food = matchResult.matchedFood;

        // Resolve portion using controlled unit conversion
        const resolved = unitConverter.resolvePortion(
          food.name,
          food.servingUnit,
          rawItem.quantity,
          rawItem.unit
        );

        // Deterministically compute nutrition
        const calculatedNutrition = foodCalculator.calculateNutrition(
          food,
          resolved.quantityInServingUnit
        );

        if (resolved.needsConfirmation || matchResult.confidence === 'medium') {
          requiresClarification = true;
        }

        candidates.push({
          rawText: rawItem.rawText,
          foodId: food.id,
          foodName: rawItem.foodName,
          matchedFoodName: food.name,
          quantityInServingUnit: resolved.quantityInServingUnit,
          servingUnit: resolved.servingUnit,
          matchConfidence: matchResult.confidence,
          needsConfirmation: resolved.needsConfirmation || matchResult.confidence === 'medium',
          conversionNote: resolved.conversionNote,
          calculatedNutrition,
          alternateCandidates: matchResult.alternates,
        });
      } else {
        // Unknown food
        requiresClarification = true;
        candidates.push({
          rawText: rawItem.rawText,
          foodId: null,
          foodName: rawItem.foodName,
          matchedFoodName: null,
          quantityInServingUnit: rawItem.quantity,
          servingUnit: rawItem.unit,
          matchConfidence: 'none',
          needsConfirmation: true,
          conversionNote: `Could not find an exact match for "${rawItem.foodName}" in the food catalog.`,
          calculatedNutrition: null,
          alternateCandidates: matchResult.alternates,
        });
      }
    }

    // 4. Aggregate totals for all matched items
    const validNutritions = candidates
      .map((c) => c.calculatedNutrition)
      .filter((n): n is CalculatedFoodNutrition => n !== null);

    const totals = foodCalculator.aggregateTotals(validNutritions);

    return {
      mealType: parsed.mealType,
      originalText: text,
      items: candidates,
      totals,
      requiresUserClarification: requiresClarification || candidates.some((c) => !c.foodId),
    };
  }

  /**
   * Multi-stage matching algorithm against the food database.
   */
  private matchFoodInCatalog(
    queryFoodName: string,
    catalog: Array<{ id: string; name: string; servingUnit: string; caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number }>
  ): {
    matchedFood: (typeof catalog)[0] | null;
    confidence: 'high' | 'medium' | 'low' | 'none';
    alternates?: Array<{ id: string; name: string; servingUnit: string; caloriesPer100g: number }>;
  } {
    const q = queryFoodName.toLowerCase().trim();

    // 1. Alias Dictionary for standard foods
    const aliasMap: Record<string, string> = {
      egg: 'Whole Egg',
      eggs: 'Whole Egg',
      'whole egg': 'Whole Egg',
      'boiled egg': 'Whole Egg',
      chicken: 'Chicken Breast (Skinless)',
      'chicken breast': 'Chicken Breast (Skinless)',
      rice: 'White Rice (Cooked)',
      'white rice': 'White Rice (Cooked)',
      'cooked rice': 'White Rice (Cooked)',
      'steamed rice': 'White Rice (Cooked)',
      roti: 'Whole Wheat Roti',
      rotis: 'Whole Wheat Roti',
      chapati: 'Whole Wheat Roti',
      chapatis: 'Whole Wheat Roti',
      oat: 'Rolled Oats (Raw)',
      oats: 'Rolled Oats (Raw)',
      oatmeal: 'Rolled Oats (Raw)',
      milk: 'Whole Cow Milk',
      'cow milk': 'Whole Cow Milk',
      'whole milk': 'Whole Cow Milk',
      curd: 'Plain Curd / Dahi',
      dahi: 'Plain Curd / Dahi',
      yogurt: 'Plain Curd / Dahi',
      'greek yogurt': 'Greek Yogurt (Plain 0% Fat)',
      paneer: 'Paneer (Cottage Cheese)',
      'cottage cheese': 'Paneer (Cottage Cheese)',
      dal: 'Cooked Yellow Dal (Lentils)',
      'yellow dal': 'Cooked Yellow Dal (Lentils)',
      lentils: 'Cooked Yellow Dal (Lentils)',
      banana: 'Banana',
      bananas: 'Banana',
      apple: 'Apple',
      apples: 'Apple',
      potato: 'Boiled Potato',
      potatoes: 'Boiled Potato',
      'boiled potato': 'Boiled Potato',
      bread: 'Whole Wheat Bread',
      toast: 'Whole Wheat Bread',
      'peanut butter': 'Natural Peanut Butter',
      almond: 'Raw Almonds',
      almonds: 'Raw Almonds',
      soya: 'Soya Chunks (Dry)',
      'soya chunks': 'Soya Chunks (Dry)',
      broccoli: 'Fresh Broccoli',
      tomato: 'Fresh Tomato',
      tomatoes: 'Fresh Tomato',
      onion: 'Red Onion',
      onions: 'Red Onion',
      whey: 'Whey Protein Isolate Powder',
      'whey protein': 'Whey Protein Isolate Powder',
      'protein powder': 'Whey Protein Isolate Powder',
    };

    // Check alias dictionary
    if (aliasMap[q]) {
      const aliasTarget = aliasMap[q];
      const match = catalog.find((f) => f.name.toLowerCase() === aliasTarget.toLowerCase());
      if (match) {
        return { matchedFood: match, confidence: 'high' };
      }
    }

    // 2. Exact Case-Insensitive Match
    const exact = catalog.find((f) => f.name.toLowerCase() === q);
    if (exact) {
      return { matchedFood: exact, confidence: 'high' };
    }

    // 3. Substring / Keyword Search
    const substringMatches = catalog.filter((f) => {
      const fn = f.name.toLowerCase();
      return fn.includes(q) || q.includes(fn);
    });

    if (substringMatches.length === 1) {
      return { matchedFood: substringMatches[0], confidence: 'high' };
    }

    if (substringMatches.length > 1) {
      return {
        matchedFood: substringMatches[0],
        confidence: 'medium',
        alternates: substringMatches.map((f) => ({
          id: f.id,
          name: f.name,
          servingUnit: f.servingUnit,
          caloriesPer100g: f.caloriesPer100g,
        })),
      };
    }

    // 4. Partial Token Overlap
    const tokens = q.split(/\s+/).filter((t) => t.length > 2);
    const partialMatches = catalog.filter((f) => {
      const fn = f.name.toLowerCase();
      return tokens.some((t) => fn.includes(t));
    });

    if (partialMatches.length > 0) {
      return {
        matchedFood: partialMatches[0],
        confidence: 'low',
        alternates: partialMatches.slice(0, 4).map((f) => ({
          id: f.id,
          name: f.name,
          servingUnit: f.servingUnit,
          caloriesPer100g: f.caloriesPer100g,
        })),
      };
    }

    return { matchedFood: null, confidence: 'none', alternates: [] };
  }
}

export const aiFoodService = new AiFoodService();

export type GrocerySizeOption = { unit: string; price: number };

function normalizedQuantity(unit: string) {
  const match = /^(\d+(?:\.\d+)?)\s*(kg|g|litres?|l|ml)$/i.exec(unit.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const measure = match[2].toLowerCase();
  if (measure === "kg") return { kind: "weight" as const, amount: amount * 1000 };
  if (measure === "g") return { kind: "weight" as const, amount };
  if (measure === "l" || measure.startsWith("litre")) return { kind: "volume" as const, amount: amount * 1000 };
  return { kind: "volume" as const, amount };
}

function suitableSizes(name: string) {
  const normalizedName = name.toLowerCase();
  if (/baby|pet|puppy|kitten|dog|cat|fish food/.test(normalizedName)) return null;
  if (/rice/.test(normalizedName)) return ["1 kg", "5 kg"];
  if (/garri|beans|flour|semolina|wheat meal|oats|spaghetti|macaroni/.test(normalizedName)) return ["500 g", "1 kg", "5 kg"];
  if (/oil/.test(normalizedName)) return ["500 ml", "1 litre", "5 litre"];
  return null;
}

export function getGrocerySizeOptions(name: string, baseUnit: string, basePrice: number): GrocerySizeOption[] {
  const sizes = suitableSizes(name);
  const baseQuantity = normalizedQuantity(baseUnit);
  if (!sizes || !baseQuantity || basePrice < 0 || !Number.isFinite(basePrice)) {
    return [{ unit: baseUnit, price: basePrice }];
  }

  const units = [...new Set([baseUnit, ...sizes])];
  return units.flatMap((unit) => {
    const quantity = normalizedQuantity(unit);
    if (!quantity || quantity.kind !== baseQuantity.kind) return [];
    if (unit.trim().toLowerCase() === baseUnit.trim().toLowerCase()) return [{ unit, price: basePrice }];
    return [{ unit, price: Math.round((basePrice * quantity.amount / baseQuantity.amount) / 100) * 100 }];
  });
}

import { calculateDeliveryQuote, deliveryPricing } from "@/lib/delivery-pricing";
import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { createHmac, timingSafeEqual } from "node:crypto";

export class CheckoutError extends Error {
  status: number;
  details?: Record<string, unknown>;
  constructor(message: string, status = 400, details?: Record<string, unknown>) {
    super(message); this.name = "CheckoutError"; this.status = status; this.details = details;
  }
}

export type CheckoutInputItem = { id: string; name: string; quantity: number };
export type PricedCheckoutItem = CheckoutInputItem & { price: number; isMeal: boolean };
export type CheckoutQuote = {
  routeDistanceKm: number; vendorCount: number; isEvening: boolean;
  deliveryLatitude: number; deliveryLongitude: number; locationSource: "device" | "address"; resolvedDeliveryLocation?: string;
  pickupVendors: Array<{ id: number; name: string; address: string; latitude: number; longitude: number; itemIds: string[] }>;
  fees: ReturnType<typeof calculateDeliveryQuote>;
};

type SignedCheckoutQuote = { issuedAt: number; address: string; area: string; items: PricedCheckoutItem[]; quote: CheckoutQuote & { foodSubtotal: number; totalAmount: number } };
function checkoutQuoteSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new CheckoutError("Checkout is not configured correctly.", 503);
  return secret;
}
export function signCheckoutQuote(payload: SignedCheckoutQuote) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", checkoutQuoteSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}
export function verifyCheckoutQuote(token: unknown, address: unknown, area: unknown, items: PricedCheckoutItem[]) {
  if (typeof token !== "string" || token.length > 30000) throw new CheckoutError("Recalculate delivery charges before continuing.", 409);
  const [encoded, supplied, extra] = token.split(".");
  if (!encoded || !supplied || extra) throw new CheckoutError("Recalculate delivery charges before continuing.", 409);
  const expected = createHmac("sha256", checkoutQuoteSecret()).update(encoded).digest();
  let actual: Buffer;
  try { actual = Buffer.from(supplied, "base64url"); } catch { throw new CheckoutError("Your delivery quote expired. Recalculate the charges.", 409); }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new CheckoutError("Your delivery quote expired. Recalculate the charges.", 409);
  let payload: SignedCheckoutQuote;
  try { payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedCheckoutQuote; } catch { throw new CheckoutError("Your delivery quote expired. Recalculate the charges.", 409); }
  if (!Number.isFinite(payload.issuedAt) || Date.now() - payload.issuedAt > 15 * 60 * 1000 || Date.now() < payload.issuedAt - 60_000) throw new CheckoutError("Your delivery quote expired. Recalculate the charges.", 409);
  const sameItems = Array.isArray(payload.items) && payload.items.length === items.length && payload.items.every((item, index) => item.id === items[index].id && item.name === items[index].name && item.quantity === items[index].quantity && item.price === items[index].price);
  if (!sameItems || payload.address !== address || payload.area !== area) throw new CheckoutError("Your cart or delivery details changed. Recalculate the delivery charges.", 409);
  return payload.quote;
}

const swallowPrices: Record<string, number> = { Garri: 800, Semo: 800, Poundo: 800, Wheat: 800, "Plantain Flour": 800, Fufu: 500 };
const proteinPrices: Record<string, number> = { Chicken: 3500, "Goat Meat": 2500, Beef: 2500, Fish: 2000, "Fried Plantain": 500, Salad: 700 };
const drinkPrices: Record<string, number> = { Coke: 500, Water: 500, Malt: 1000, Hollandia: 3000, Sprite: 500, "Tiger Nuts": 1500, "Pineapple Juice": 2000, Heniken: 1500, Star: 1500, Stout: 1500, Desperado: 1500 };

export function lagosMinutesNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === "hour")?.value) * 60 + Number(parts.find((part) => part.type === "minute")?.value);
}

export function assertOrderingAvailable() {
  const now = lagosMinutesNow();
  const allowAfterHoursDevelopment = process.env.NODE_ENV === "development" && process.env.ALLOW_AFTER_HOURS_CHECKOUT === "true";
  if (now >= deliveryPricing.orderCutoffMinutesAfterMidnight && !allowAfterHoursDevelopment) throw new CheckoutError("Ordering is closed for today. Please come back tomorrow.", 409);
  const isEvening = now >= deliveryPricing.eveningStartsAtMinutesAfterMidnight;
  if (isEvening && process.env.EVENING_DELIVERY_ENABLED !== "true" && !allowAfterHoursDevelopment) throw new CheckoutError("Evening delivery is not available right now. Please try again tomorrow.", 409);
  return { isEvening };
}

function validCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function parseMealUnitPrice(meal: { id: number; name: string; price: number; category: string }, item: CheckoutInputItem) {
  const baseName = meal.name;
  if (item.name !== baseName && !item.name.startsWith(`${baseName} + `)) throw new CheckoutError(`The saved options for ${baseName} are invalid. Please refresh your cart.`);
  const extras = item.name === baseName ? [] : item.name.slice(baseName.length + 3).split(" + ");
  let price = Number(meal.price);
  let hasWater = false;
  let hasRequiredPairing = false;
  const category = meal.category.toLowerCase();
  for (const extra of extras) {
    if (Object.hasOwn(swallowPrices, extra)) {
      if (!category.includes("soup-swallow") || hasRequiredPairing) throw new CheckoutError(`Invalid meal option for ${baseName}.`);
      price += swallowPrices[extra]; hasRequiredPairing = true; continue;
    }
    if (extra === "Plantain" || extra === "Rice") {
      if (!category.includes("meat") || hasRequiredPairing) throw new CheckoutError(`Invalid meal option for ${baseName}.`);
      price += 1000; hasRequiredPairing = true; continue;
    }
    if (extra === "Water") {
      if (hasWater) throw new CheckoutError(`Invalid meal option for ${baseName}.`);
      price += 500; hasWater = true; continue;
    }
    const protein = /^(Chicken|Goat Meat|Beef|Fish|Fried Plantain|Salad) x([1-9]\d?)$/.exec(extra);
    if (protein) {
      if (!category.includes("rice")) throw new CheckoutError(`Invalid meal option for ${baseName}.`);
      price += proteinPrices[protein[1]] * Number(protein[2]); continue;
    }
    const drink = /^(.+?) x([1-9]\d?)$/.exec(extra);
    if (drink && Object.hasOwn(drinkPrices, drink[1])) { price += drinkPrices[drink[1]] * Number(drink[2]); continue; }
    throw new CheckoutError(`Invalid meal option for ${baseName}.`);
  }
  if (category.includes("soup-swallow") && !hasRequiredPairing) throw new CheckoutError(`Choose a swallow for ${baseName} again.`);
  if (category.includes("meat") && !hasRequiredPairing) throw new CheckoutError(`Choose Plantain or Rice with ${baseName} again.`);
  return price;
}

export async function priceCheckoutItems(input: unknown): Promise<{ items: PricedCheckoutItem[]; foodSubtotal: number }> {
  if (!Array.isArray(input) || input.length === 0 || input.length > 80) throw new CheckoutError("Your cart is empty or contains too many items.");
  const items = input.map((value) => {
    if (typeof value !== "object" || value === null) throw new CheckoutError("One of the cart items is invalid.");
    const item = value as Record<string, unknown>;
    if (typeof item.id !== "string" || !item.id || item.id.length > 160 || typeof item.name !== "string" || item.name.length > 300 || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 30) throw new CheckoutError("One of the cart items is invalid.");
    return { id: item.id, name: item.name, quantity: Number(item.quantity) };
  });
  const mealIds = [...new Set(items.map((item) => /^([0-9]+)(?:-|$)/.exec(item.id)?.[1]).filter((id): id is string => Boolean(id)))];
  const productIds = [...new Set(items.filter((item) => !/^([0-9]+)(?:-|$)/.test(item.id)).map((item) => item.id))];
  if (productIds.some((id) => !/^[a-zA-Z0-9_-]+$/.test(id))) throw new CheckoutError("A cart product id is invalid.");
  const [meals, products] = await Promise.all([
    mealIds.length ? supabaseAdminRequest<Array<{ id: number; name: string; price: number; category: string; available: boolean }>>(`meals?id=in.(${mealIds.join(",")})&select=id,name,price,category,available`) : Promise.resolve([]),
    productIds.length ? supabaseAdminRequest<Array<{ id: string; name: string; unit: string; price: number; stock_status: string }>>(`products?id=in.(${productIds.join(",")})&select=id,name,unit,price,stock_status`) : Promise.resolve([]),
  ]);
  const mealById = new Map(meals.map((meal) => [String(meal.id), meal]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const pricedItems = items.map((item) => {
    const mealId = /^([0-9]+)(?:-|$)/.exec(item.id)?.[1];
    if (mealId) {
      const meal = mealById.get(mealId);
      if (!meal || !meal.available) throw new CheckoutError(`${meal?.name || "A meal in your cart"} is no longer available.`, 409);
      return { ...item, price: parseMealUnitPrice(meal, item), name: item.name, isMeal: true };
    }
    const product = productById.get(item.id);
    if (!product || product.stock_status === "unavailable") throw new CheckoutError(`${product?.name || "A product in your cart"} is no longer available.`, 409);
    return { ...item, name: `${product.name} (${product.unit})`, price: Number(product.price), isMeal: false };
  });
  return { items: pricedItems, foodSubtotal: pricedItems.reduce((total, item) => total + item.price * item.quantity, 0) };
}

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(toLat - fromLat), longitudeDelta = radians(toLng - fromLng);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function itemAssignmentKey(id: string) {
  const mealId = /^([0-9]+)(?:-|$)/.exec(id)?.[1];
  return mealId ? `meal:${mealId}` : `product:${id}`;
}

async function resolveDeliveryLocation(input: { latitude: unknown; longitude: unknown; address?: unknown; area?: unknown }) {
  const hasLatitude = input.latitude !== null && input.latitude !== undefined;
  const hasLongitude = input.longitude !== null && input.longitude !== undefined;
  if (hasLatitude || hasLongitude) {
    if (!validCoordinate(input.latitude, -90, 90) || !validCoordinate(input.longitude, -180, 180)) throw new CheckoutError("We could not read the saved device location. Try saving it again or calculate from your address.");
    return { latitude: input.latitude, longitude: input.longitude, locationSource: "device" as const };
  }
  if (typeof input.address !== "string" || input.address.trim().length < 5 || typeof input.area !== "string" || !input.area.trim()) {
    throw new CheckoutError("Enter your delivery area and full street address, or use your device’s location.");
  }
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) throw new CheckoutError("Address lookup is not configured. Add the HeiGIT route API key to the server configuration.", 503);
  const area = input.area === "Outside listed areas" ? "Calabar" : input.area;
  const query = new URL("https://api.heigit.org/pelias/v1/search");
  query.searchParams.set("text", `${input.address.trim()}, ${area}, Calabar, Cross River State, Nigeria`);
  query.searchParams.set("boundary.country", "NGA");
  query.searchParams.set("size", "5");
  const response = await fetch(query, { headers: { Authorization: apiKey }, cache: "no-store" });
  if (!response.ok) { console.error("HeiGIT address lookup failed", response.status, await response.text()); throw new CheckoutError("We could not look up that address. Check the address and try again, or use your device’s location.", 502); }
  const result = await response.json() as { features?: Array<{ geometry?: { coordinates?: unknown }; properties?: { label?: unknown; confidence?: unknown; country_a?: unknown; country_code?: unknown; country?: unknown; locality?: unknown; county?: unknown; region?: unknown } }> };
  const match = result.features?.find((feature) => {
    const coords = feature.geometry?.coordinates;
    const label = feature.properties?.label;
    const properties = feature.properties;
    const placeText = [label, properties?.locality, properties?.county, properties?.region].filter((part): part is string => typeof part === "string").join(" ");
    const countryText = [properties?.country_a, properties?.country_code, properties?.country, label].filter((part): part is string => typeof part === "string").join(" ");
    const countryCode = typeof properties?.country_a === "string" ? properties.country_a.toUpperCase() : typeof properties?.country_code === "string" ? properties.country_code.toUpperCase() : "";
    return Array.isArray(coords) && validCoordinate(coords[0], -180, 180) && validCoordinate(coords[1], -90, 90)
      && typeof label === "string" && /calabar/i.test(placeText) && (countryCode === "NG" || countryCode === "NGA" || /nigeria/i.test(countryText))
      && (typeof feature.properties?.confidence !== "number" || feature.properties.confidence >= 0.3);
  });
  if (!match) {
    throw new CheckoutError("We couldn’t match that to a precise Calabar address. Add a nearby landmark, or use your device’s location.", 409);
  }
  const coordinates = match.geometry?.coordinates;
  const label = match.properties?.label;
  if (!Array.isArray(coordinates) || typeof label !== "string") {
    throw new CheckoutError("We couldn’t match that to a precise Calabar address. Add a nearby landmark, or use your device’s location.", 409);
  }
  return { longitude: coordinates[0] as number, latitude: coordinates[1] as number, locationSource: "address" as const, resolvedDeliveryLocation: label };
}

export async function getDeliveryQuote(input: { items: PricedCheckoutItem[]; latitude: unknown; longitude: unknown; address?: unknown; area?: unknown }): Promise<CheckoutQuote & { foodSubtotal: number; totalAmount: number }> {
  const { isEvening } = assertOrderingAvailable();
  const deliveryLocation = await resolveDeliveryLocation(input);
  const { latitude, longitude } = deliveryLocation;
  const uniqueItems = [...new Map(input.items.map((item) => [itemAssignmentKey(item.id), item])).values()];
  const mealIds = [...new Set(uniqueItems.map((item) => /^([0-9]+)(?:-|$)/.exec(item.id)?.[1]).filter((id): id is string => Boolean(id)))];
  const productIds = uniqueItems.filter((item) => !/^([0-9]+)(?:-|$)/.test(item.id)).map((item) => item.id);
  const [mealAssignments, productAssignments] = await Promise.all([
    mealIds.length ? supabaseAdminRequest<Array<{ vendor_id: number; meal_id: number }>>(`vendor_meals?meal_id=in.(${mealIds.join(",")})&select=vendor_id,meal_id`) : Promise.resolve([]),
    productIds.length ? supabaseAdminRequest<Array<{ vendor_id: number; product_id: string }>>(`vendor_products?product_id=in.(${productIds.join(",")})&select=vendor_id,product_id`) : Promise.resolve([]),
  ]);
  const assignmentsByItem = new Map<string, Set<number>>();
  for (const assignment of mealAssignments) { const key = `meal:${assignment.meal_id}`; assignmentsByItem.set(key, assignmentsByItem.get(key) ?? new Set()); assignmentsByItem.get(key)?.add(assignment.vendor_id); }
  for (const assignment of productAssignments) { const key = `product:${assignment.product_id}`; assignmentsByItem.set(key, assignmentsByItem.get(key) ?? new Set()); assignmentsByItem.get(key)?.add(assignment.vendor_id); }
  const vendorIds = [...new Set([...assignmentsByItem.values()].flatMap((ids) => [...ids]))];
  if (!vendorIds.length) throw new CheckoutError("We couldn’t prepare delivery pricing for this cart yet. Please try again shortly.", 409);
  const vendors = await supabaseAdminRequest<Array<{ id: number; name: string; address: string; latitude: number | null; longitude: number | null; active: boolean }>>(`vendors?id=in.(${vendorIds.join(",")})&active=eq.true&select=id,name,address,latitude,longitude,active`);
  const eligible = vendors.filter((vendor) => validCoordinate(vendor.latitude, -90, 90) && validCoordinate(vendor.longitude, -180, 180));
  const selectedByItem = new Map<string, number>();
  for (const item of uniqueItems) {
    const key = itemAssignmentKey(item.id);
    const candidates = eligible.filter((vendor) => assignmentsByItem.get(key)?.has(vendor.id));
    if (!candidates.length) throw new CheckoutError("We couldn’t prepare delivery pricing for this cart yet. Please try again shortly.", 409);
    candidates.sort((a, b) => distanceKm(latitude, longitude, a.latitude as number, a.longitude as number) - distanceKm(latitude, longitude, b.latitude as number, b.longitude as number) || a.id - b.id);
    selectedByItem.set(key, candidates[0].id);
  }
  const selectedIds = new Set(selectedByItem.values());
  const selectedVendors = eligible.filter((vendor) => selectedIds.has(vendor.id)).sort((a, b) => distanceKm(latitude, longitude, b.latitude as number, b.longitude as number) - distanceKm(latitude, longitude, a.latitude as number, a.longitude as number) || a.id - b.id);
  const openRouteServiceKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!openRouteServiceKey) throw new CheckoutError("Route pricing is not configured yet. Add the HeiGIT route API key to the server configuration.", 503);
  const routeCoordinates = [selectedVendors[0], ...selectedVendors.slice(1), { latitude, longitude }]
    .map((point) => [point.longitude, point.latitude]);
  const routeResponse = await fetch("https://api.heigit.org/openrouteservice/v2/directions/driving-car", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: openRouteServiceKey },
    body: JSON.stringify({ coordinates: routeCoordinates, instructions: false, geometry: false, elevation: false }),
    cache: "no-store",
  });
  if (!routeResponse.ok) { console.error("HeiGIT route quote failed", routeResponse.status, await routeResponse.text()); throw new CheckoutError("We could not calculate the delivery route. Please try again.", 502); }
  const routeData = await routeResponse.json() as { routes?: Array<{ summary?: { distance?: number } }> };
  const distanceMeters = routeData.routes?.[0]?.summary?.distance;
  if (typeof distanceMeters !== "number" || !Number.isFinite(distanceMeters)) throw new CheckoutError("We could not calculate the delivery route. Please try again.", 502);
  const routeDistanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
  const fees = calculateDeliveryQuote({ routeDistanceKm, vendorCount: selectedVendors.length, isEvening });
  const pickupVendors = selectedVendors.map((vendor) => ({
    id: vendor.id, name: vendor.name, address: vendor.address, latitude: vendor.latitude as number, longitude: vendor.longitude as number,
    itemIds: uniqueItems.filter((item) => selectedByItem.get(itemAssignmentKey(item.id)) === vendor.id).map((item) => item.id),
  }));
  const foodSubtotal = input.items.reduce((total, item) => total + item.price * item.quantity, 0);
  return { routeDistanceKm, vendorCount: pickupVendors.length, isEvening, pickupVendors, fees, deliveryLatitude: latitude, deliveryLongitude: longitude, locationSource: deliveryLocation.locationSource, ...("resolvedDeliveryLocation" in deliveryLocation ? { resolvedDeliveryLocation: deliveryLocation.resolvedDeliveryLocation } : {}), foodSubtotal, totalAmount: foodSubtotal + fees.totalDeliveryCharges };
}

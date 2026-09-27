/** Adjustable pilot prices for delivery quotes. */
export const deliveryPricing = {
  baseFeeNaira: 800,
  perRouteKilometerNaira: 200,
  minimumDeliveryFeeNaira: 1800,
  includedVendorPickups: 2,
  additionalVendorPickupFeeNaira: 400,
  eveningStartsAtMinutesAfterMidnight: 17 * 60 + 30,
  eveningDriverFeeNaira: 1000,
  orderCutoffMinutesAfterMidnight: 20 * 60,
} as const;

export function calculateDeliveryQuote(input: {
  routeDistanceKm: number;
  vendorCount: number;
  isEvening: boolean;
}) {
  const distanceFee = Math.ceil(
    deliveryPricing.baseFeeNaira +
      Math.max(0, input.routeDistanceKm) * deliveryPricing.perRouteKilometerNaira
  );
  const deliveryFee = Math.max(
    deliveryPricing.minimumDeliveryFeeNaira,
    distanceFee
  );
  const extraPickupFee =
    Math.max(0, Math.floor(input.vendorCount) - deliveryPricing.includedVendorPickups) *
    deliveryPricing.additionalVendorPickupFeeNaira;
  const eveningDriverFee = input.isEvening
    ? deliveryPricing.eveningDriverFeeNaira
    : 0;

  return {
    deliveryFee,
    extraPickupFee,
    eveningDriverFee,
    totalDeliveryCharges: deliveryFee + extraPickupFee + eveningDriverFee,
  };
}

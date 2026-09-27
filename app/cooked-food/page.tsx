"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DeliveryMapPicker = dynamic(() => import("@/components/DeliveryMapPicker"), { ssr: false });

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type CustomerProfile = {
  name: string;
  phone: string;
  email: string | null;
  delivery_address: string | null;
  delivery_area: string | null;
  delivery_latitude: number | string | null;
  delivery_longitude: number | string | null;
};

type CheckoutQuoteView = {
  quoteToken: string;
  foodSubtotal: number;
  totalAmount: number;
  routeDistanceKm: number;
  isEvening: boolean;
  deliveryLatitude: number;
  deliveryLongitude: number;
  locationSource: "device" | "address";
  resolvedDeliveryLocation?: string;
  fees: { deliveryFee: number; extraPickupFee: number; eveningDriverFee: number; totalDeliveryCharges: number };
};

type DatabaseMeal = {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available?: boolean;
};

type Dish = {
  id: number;
  name: string;
  price: number;
  desc: string;
  image: string;
  type: "soup" | "meat" | "fish" | "rice" | "special";
  available?: boolean;
  sectionTitle?: string;
};

const cartStorageKey = "chophub-cart";

const getStoredCart = (): CartItem[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const storedCart = window.localStorage.getItem(cartStorageKey);

  if (!storedCart) {
    return [];
  }

  try {
    const parsedCart: unknown = JSON.parse(storedCart);

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart.filter((item): item is CartItem => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const candidate = item as Record<string, unknown>;

      return (
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.price === "number" &&
        typeof candidate.quantity === "number" &&
        typeof candidate.image === "string"
      );
    });
  } catch {
    return [];
  }
};

export default function CookedFoodPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [checkoutQuote, setCheckoutQuote] = useState<CheckoutQuoteView | null>(null);
  const [deliveryLocationConfirmed, setDeliveryLocationConfirmed] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [deliverToSomeoneElse, setDeliverToSomeoneElse] = useState(false);
  const [saveAddressAsDefault, setSaveAddressAsDefault] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "bank_transfer">("paystack");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("");
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [latitudeDraft, setLatitudeDraft] = useState("");
  const [longitudeDraft, setLongitudeDraft] = useState("");
  const [isDeliveryMapOpen, setIsDeliveryMapOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactDetails, setContactDetails] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  // Temporary "Added!" feedback per dish
  const [addedFeedback, setAddedFeedback] = useState<Record<number, boolean>>({});

  const swallowOptions = [
    { name: "Garri", price: 800 },
    { name: "Semo", price: 800 },
    { name: "Poundo", price: 800 },
    { name: "Wheat", price: 800 },
    { name: "Plantain Flour", price: 800 },
    { name: "Fufu", price: 500 },
  ];

  const pairingOptions = ["Plantain", "Rice"];
  const proteinOptions = [
    { name: "Chicken", price: 3500 },
    { name: "Goat Meat", price: 2500 },
    { name: "Beef", price: 2500 },
    { name: "Fish", price: 2000 },
    { name: "Fried Plantain", price: 500 },
    { name: "Salad", price: 700 },
  ];
  const waterPrice = 500;
  const drinkOptions = [
    { name: "Coke", price: 500 },
    { name: "Water", price: 500 },
    { name: "Malt", price: 1000 },
    { name: "Hollandia", price: 3000 },
    { name: "Sprite", price: 500 },
    { name: "Tiger Nuts", price: 1500 },
    { name: "Pineapple Juice", price: 2000 },
  ];
  const beerOptions = [
    { name: "Heniken", price: 1500 },
    { name: "Star", price: 1500 },
    { name: "Stout", price: 1500 },
    { name: "Desperado", price: 1500 },
  ];

  const fallbackDishes: Dish[] = [
    {
      id: 1,
      name: "Afang Soup",
      price: 5000,
      desc: "Rich traditional Afang soup prepared with fresh ingredients and assorted proteins.",
      image: "/afang.jpeg",
      type: "soup",
      available: true,
    },
    {
      id: 2,
      name: "Edikang Ikong",
      price: 5000,
      desc: "Fresh and delicious traditional vegetable soup loaded with assorted ingredients.",
      image: "/edikanikong.jpeg",
      type: "soup",
      available: true,
    },
    {
      id: 3,
      name: "Indigenous 404",
      price: 4000,
      desc: "Well-seasoned, freshly prepared indigenous 404 meat.",
      image: "/404.JPG",
      type: "meat" as const,
    },
    {
      id: 4,
      name: "Indigenous Bush Meat",
      price: 4000,
      desc: "Freshly prepared traditional indigenous bush meat with rich local seasoning.",
      image: "/Bushmeat.jpg",
      type: "meat" as const,
    },
    {
      id: 5,
      name: "Fisherman Soup",
      price: 8000,
      desc: "A rich Calabar-style seafood soup packed with fresh fish and seafood.",
      image: "/fisherman_soup.JPG",
      type: "soup" as const,
    },
    {
      id: 6,
      name: "White Soup",
      price: 5500,
      desc: "Traditional white soup with a rich, aromatic and comforting taste.",
      image: "/white_soup.jpg",
      type: "soup" as const,
    },
    {
      id: 7,
      name: "Ogbono Soup",
      price: 5000,
      desc: "Rich, smooth ogbono soup prepared with traditional spices and fresh ingredients.",
      image: "/ogbono.jpg",
      type: "soup" as const,
    },
    {
      id: 8,
      name: "Okro Soup",
      price: 5000,
      desc: "Freshly prepared okro soup with a delicious traditional Calabar flavor.",
      image: "/okro_.JPG",
      type: "soup" as const,
    },
    {
      id: 9,
      name: "Egusi Soup",
      price: 5000,
      desc: "Rich and hearty egusi soup prepared with assorted ingredients.",
      image: "/egusi.JPG",
      type: "soup" as const,
    },
    {
      id: 10,
      name: "Oha Soup",
      price: 5000,
      desc: "Traditional Oha soup with a rich, comforting indigenous flavor.",
      image: "/oha.JPG",
      type: "soup" as const,
    },
    {
      id: 11,
      name: "Fresh Roasted Fish",
      price: 8000,
      desc: "Well-seasoned fresh roasted fish served with spicy pepper sauce.",
      image: "/grilled_fish.JPG",
      type: "fish" as const,
    },
    {
      id: 12,
      name: "Jollof Rice",
      price: 2000,
      desc: "Fragrant party-style jollof rice served plain or with your choice of protein.",
      image: "/jollof.jpg",
      type: "rice" as const,
    },
    {
      id: 13,
      name: "Rice & Stew",
      price: 2000,
      desc: "Steamed rice with rich, flavorful stew and your choice of protein.",
      image: "/rice_stew.jpg",
      type: "rice" as const,
    },
    {
      id: 14,
      name: "Shawarma",
      price: 6500,
      desc: "The King's Shawarma, generously filled and freshly prepared.",
      image: "/sharwama.jpeg",
      type: "special" as const,
      sectionTitle: "The King's Shawarma",
    },
    {
      id: 15,
      name: "Parfait",
      price: 5000,
      desc: "A creamy, layered parfait treat.",
      image: "/Parfait.webp",
      type: "special" as const,
    },
    {
      id: 16,
      name: "Abáchà",
      price: 4000,
      desc: "Traditional African salad prepared with delicious local ingredients.",
      image: "/abacha.JPG",
      type: "special" as const,
      sectionTitle: "Abáchà",
    },
  ];
  const [dishes, setDishes] = useState<Dish[]>(fallbackDishes);

  const featuredDishes = dishes.filter((dish) =>
    [1, 3, 12, 15].includes(dish.id)
  );

  const [selectedSwallow, setSelectedSwallow] = useState<Record<number, string>>({});
  const [selectedPairing, setSelectedPairing] = useState<Record<number, string>>({});
  const [selectedProtein, setSelectedProtein] = useState<
    Record<number, Record<string, number>>
  >({});
  const [selectedWater, setSelectedWater] = useState<Record<number, boolean>>({});
  const [selectedDrink, setSelectedDrink] = useState<
    Record<number, { name: string; quantity: number }>
  >({});
  const [customizingDish, setCustomizingDish] = useState<
    (typeof dishes)[number] | null
  >(null);
  const [customizationQuantity, setCustomizationQuantity] = useState(1);

  useEffect(() => {
    fetch("/api/meals")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load meals");
        return response.json() as Promise<DatabaseMeal[]>;
      })
      .then((meals) => {
        setDishes(
          meals.map((meal) => ({
            id: meal.id,
            name: meal.name,
            price: meal.price,
            desc: meal.description,
            image: meal.image,
            available: meal.available,
            type: (meal.category === "soup-swallow"
              ? "soup"
              : meal.category === "rice"
                ? "rice"
                : meal.name === "Fresh Roasted Fish"
                  ? "fish"
                  : meal.category === "meat"
                    ? "meat"
                    : "special") as Dish["type"],
          }))
        );
      })
      .catch(() => {
        // Keep the bundled menu available if the database is temporarily unavailable.
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/customers/profile")
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json() as { profile?: CustomerProfile };
        return result.profile ?? null;
      })
      .then((profile) => {
        if (cancelled || !profile) return;
        setCustomerProfile(profile);
        setCustomerName(profile.name || "");
        setCustomerPhone(profile.phone || "");
        setCustomerEmail(profile.email || "");
        setDeliveryAddress(profile.delivery_address || "");
        const savedArea = profile.delivery_area || "";
        setDeliveryArea(["Calabar Municipal", "Calabar South", "Outside listed areas"].includes(savedArea) ? savedArea : "");
        const latitude = profile.delivery_latitude === null ? null : Number(profile.delivery_latitude);
        const longitude = profile.delivery_longitude === null ? null : Number(profile.delivery_longitude);
        if (latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude)) {
          const point = { latitude, longitude };
          setDeliveryCoordinates(point);
          setLatitudeDraft(String(latitude));
          setLongitudeDraft(String(longitude));
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (window.location.hash === "#cart") {
      const timeoutId = window.setTimeout(() => setIsCartOpen(true), 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCart(getStoredCart());
      setIsCartLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isCartLoaded) {
      return;
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    window.dispatchEvent(new Event("chophub-cart-updated"));
  }, [cart, isCartLoaded]);

  const scrollToMenu = () => {
    setIsMobileNavOpen(false);
    const menuSection = document.getElementById("menu");
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToAbout = () => {
    setIsMobileNavOpen(false);
    const aboutSection = document.getElementById("about");
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToContact = () => {
    setIsMobileNavOpen(false);
    const contactSection = document.getElementById("contact");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const sendContactMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent(`ChopHub contact message from ${contactName}`);
    const body = encodeURIComponent(
      `Name: ${contactName}\nPhone or email: ${contactDetails}\n\n${contactMessage}`
    );
    window.location.href = `mailto:chophub@aol.com?subject=${subject}&body=${body}`;
  };

  const openCustomization = (dish: (typeof dishes)[0]) => {
    setCustomizingDish(dish);
    setCustomizationQuantity(1);
  };

  useEffect(() => {
    const dishId = Number(new URLSearchParams(window.location.search).get("dish"));
    const dish = dishes.find((item) => item.id === dishId);

    if (dish) {
      const timeoutId = window.setTimeout(() => openCustomization(dish), 0);
      return () => window.clearTimeout(timeoutId);
    }
    // The URL is only read when the page is opened from a menu card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeCustomization = () => {
    setCustomizingDish(null);
    setCustomizationQuantity(1);
  };

  const addToCart = (dish: (typeof dishes)[0], quantity = 1) => {
    if (dish.type === "soup" && !selectedSwallow[dish.id]) {
      alert("Please choose your swallow first.");
      return;
    }

    if (dish.type === "meat" && !selectedPairing[dish.id]) {
      alert("Please choose Plantain or Rice first.");
      return;
    }

    const swallow = selectedSwallow[dish.id];
    const pairing = selectedPairing[dish.id];
    const selectedProteins = selectedProtein[dish.id] || {};
    const includesWater = selectedWater[dish.id] || false;
    const drink = selectedDrink[dish.id];
    const drinkOption = [...drinkOptions, ...beerOptions].find(
      (option) => option.name === drink?.name
    );
    const drinkLabel = drinkOption
      ? ` + ${drinkOption.name} x${drink?.quantity}`
      : "";
    const drinkCost = drinkOption
      ? drinkOption.price * (drink?.quantity || 0)
      : 0;
    const proteinAddons = proteinOptions.filter(
      (option) => (selectedProteins[option.name] || 0) > 0
    );

    const itemName =
      dish.type === "soup"
        ? `${dish.name} + ${swallow}${includesWater ? " + Water" : ""}${drinkLabel}`
        : dish.type === "meat"
          ? `${dish.name} + ${pairing}${includesWater ? " + Water" : ""}${drinkLabel}`
          : dish.type === "rice" && proteinAddons.length > 0
          ? `${dish.name} + ${proteinAddons
              .map(
                (option) =>
                  `${option.name} x${selectedProteins[option.name]}`
              )
              .join(" + ")}${includesWater ? " + Water" : ""}${drinkLabel}`
          : `${dish.name}${includesWater ? " + Water" : ""}${drinkLabel}`;

    const itemPrice =
      dish.type === "soup"
        ? dish.price + (swallowOptions.find((option) => option.name === swallow)?.price ?? 0)
          + (includesWater ? waterPrice : 0) + drinkCost
        : dish.type === "meat"
          ? dish.price + 1000 + (includesWater ? waterPrice : 0) + drinkCost
          : dish.type === "rice"
            ? dish.price +
              proteinAddons.reduce(
                (sum, option) =>
                  sum + option.price * selectedProteins[option.name],
                0
            ) +
            (includesWater ? waterPrice : 0) + drinkCost
          : dish.price +
            (includesWater ? waterPrice : 0) +
            drinkCost;

    const cartId =
      dish.type === "soup"
        ? `${dish.id}-${swallow}${includesWater ? "-water" : ""}${drinkOption ? `-${drinkOption.name}-${drink?.quantity}` : ""}`
        : dish.type === "meat"
          ? `${dish.id}-${pairing}${includesWater ? "-water" : ""}${drinkOption ? `-${drinkOption.name}-${drink?.quantity}` : ""}`
          : dish.type === "rice"
            ? `${dish.id}-${proteinAddons
                .map((option) => `${option.name}-${selectedProteins[option.name]}`)
                .join("_") || "plain"}${includesWater ? "-water" : ""}${drinkOption ? `-${drinkOption.name}-${drink?.quantity}` : ""}`
          : `${dish.id}${includesWater ? "-water" : ""}${drinkOption ? `-${drinkOption.name}-${drink?.quantity}` : ""}`;

    const cartItem: CartItem = {
      id: cartId,
      name: itemName,
      price: itemPrice,
      quantity,
      image: dish.image,
    };

    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartId);

      if (existing) {
        return prev.map((item) =>
          item.id === cartId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prev, cartItem];
    });
    setOrderSubmitted(false);

    // Show "Added!" feedback
    setAddedFeedback((prev) => ({ ...prev, [dish.id]: true }));
    setTimeout(() => {
      setAddedFeedback((prev) => ({ ...prev, [dish.id]: false }));
    }, 1800);
    closeCustomization();

    const returnCategory = new URLSearchParams(window.location.search).get(
      "returnCategory"
    );
    if (returnCategory) {
      router.push(`/menu?category=${encodeURIComponent(returnCategory)}`);
    }
  };

  const updateQuantity = (id: string, change: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const useCurrentDeliveryLocation = () => {
    if (!navigator.geolocation) {
      alert("Location is not available in this browser. Please enter the delivery address instead.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setDeliveryCoordinates({ latitude: coords.latitude, longitude: coords.longitude }); setLatitudeDraft(String(coords.latitude)); setLongitudeDraft(String(coords.longitude)); setCheckoutQuote(null); },
      () => alert("We could not get your location. Please check location permission or enter the address manually."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const useMapCoordinates = () => {
    const latitude = Number(latitudeDraft);
    const longitude = Number(longitudeDraft);
    if (!latitudeDraft.trim() || !longitudeDraft.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setQuoteError("Enter a valid latitude and longitude from the map pin.");
      return;
    }
    setDeliveryCoordinates({ latitude, longitude });
    setQuoteError("");
  };

  const selectDeliveryMapPoint = (coordinates: { latitude: number; longitude: number }, address?: string) => {
    if (address) setDeliveryAddress(address);
    setDeliveryCoordinates(coordinates);
    setLatitudeDraft(String(coordinates.latitude));
    setLongitudeDraft(String(coordinates.longitude));
    setDeliveryLocationConfirmed(true);
    setCheckoutQuote(null);
    setQuoteError("");
  };

  const changeRecipientMode = (deliverToOther: boolean) => {
    setDeliverToSomeoneElse(deliverToOther);
    setCheckoutQuote(null);
    setQuoteError("");
    setDeliveryLocationConfirmed(false);
    setSaveAddressAsDefault(false);
    if (deliverToOther) {
      setCustomerName("");
      setCustomerPhone("");
      setDeliveryAddress("");
      setDeliveryArea("");
      setDeliveryCoordinates(null);
      setLatitudeDraft("");
      setLongitudeDraft("");
    } else if (customerProfile) {
      setCustomerName(customerProfile.name || "");
      setCustomerPhone(customerProfile.phone || "");
      setDeliveryAddress(customerProfile.delivery_address || "");
      const savedArea = customerProfile.delivery_area || "";
      setDeliveryArea(["Calabar Municipal", "Calabar South", "Outside listed areas"].includes(savedArea) ? savedArea : "");
      const latitude = customerProfile.delivery_latitude === null ? null : Number(customerProfile.delivery_latitude);
      const longitude = customerProfile.delivery_longitude === null ? null : Number(customerProfile.delivery_longitude);
      const point = latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
      setDeliveryCoordinates(point);
      setLatitudeDraft(point ? String(point.latitude) : "");
      setLongitudeDraft(point ? String(point.longitude) : "");
    }
  };

  const calculateCheckoutQuote = async () => {
    setQuoteError("");
    if (!deliveryCoordinates && (!deliveryAddress.trim() || !deliveryArea)) { setQuoteError("Enter your delivery area and full address, or use your device’s location."); return; }
    if (!cart.length) return;
    setIsQuoting(true);
    try {
      const response = await fetch("/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.map(({ id, name, quantity }) => ({ id, name, quantity })), latitude: deliveryCoordinates?.latitude, longitude: deliveryCoordinates?.longitude, deliveryAddress, deliveryArea }) });
      const result = await response.json() as CheckoutQuoteView & { error?: string };
      if (!response.ok) throw new Error(result.error || "We could not calculate delivery charges.");
      setCheckoutQuote(result);
      setDeliveryLocationConfirmed(result.locationSource === "device");
    } catch (error) { setCheckoutQuote(null); setQuoteError(error instanceof Error ? error.message : "We could not calculate delivery charges."); }
    finally { setIsQuoting(false); }
  };

  // Checkout with Paystack or transfer confirmation through WhatsApp
  const submitCheckout = async () => {
    if (cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim() || !deliveryArea) {
      setQuoteError("Please complete your name, phone number, delivery area and address.");
      return;
    }
    if (paymentMethod === "paystack" && !/^\S+@\S+\.\S+$/.test(customerEmail.trim())) { setQuoteError("Enter a valid email address for your Paystack receipt."); return; }
    if (!checkoutQuote) { setQuoteError("Calculate the delivery charges before continuing."); return; }
    if (checkoutQuote.locationSource === "address" && !deliveryLocationConfirmed) { setQuoteError("Confirm that the matched location is correct before continuing."); return; }
    const whatsappWindow = paymentMethod === "bank_transfer" ? window.open("about:blank", "_blank") : null;
    if (paymentMethod === "bank_transfer" && !whatsappWindow) {
      setQuoteError("Please allow pop-ups to continue to WhatsApp.");
      return;
    }
    setIsSubmittingOrder(true); setQuoteError("");
    try {
      if (customerProfile && saveAddressAsDefault) {
        const saveResponse = await fetch("/api/customers/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryAddress,
            deliveryArea,
            deliveryLatitude: deliveryCoordinates?.latitude ?? checkoutQuote.deliveryLatitude,
            deliveryLongitude: deliveryCoordinates?.longitude ?? checkoutQuote.deliveryLongitude,
          }),
        });
        const saved = await saveResponse.json().catch(() => ({})) as { error?: string; profile?: CustomerProfile };
        if (!saveResponse.ok) throw new Error(saved.error || "We could not save your default address.");
        if (saved.profile) setCustomerProfile(saved.profile as CustomerProfile);
      }
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail: customerEmail.trim(),
          customerPhone,
          deliveryAddress,
          deliveryArea,
          deliveryLatitude: checkoutQuote.locationSource === "device" ? checkoutQuote.deliveryLatitude : null,
          deliveryLongitude: checkoutQuote.locationSource === "device" ? checkoutQuote.deliveryLongitude : null,
          deliveryLocationConfirmed,
          expectedTotal: checkoutQuote.totalAmount,
          quoteToken: checkoutQuote.quoteToken,
          paymentMethod,
          items: cart.map(({ id, name, quantity }) => ({ id, name, quantity })),
        }),
      });
      const result = await response.json() as { error?: string; authorizationUrl?: string; orderId?: number; paymentReference?: string; foodSubtotal?: number; totalAmount?: number; quote?: CheckoutQuoteView };
      if (!response.ok) {
        throw new Error(result.error || "We could not save your order. Please try again.");
      }
      if (paymentMethod === "paystack" && result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      const q = result.quote;
      if (!q || result.orderId === undefined || !result.paymentReference || result.foodSubtotal === undefined || result.totalAmount === undefined) throw new Error("The saved order response was incomplete. Please contact ChopHub before submitting again.");
      const message = `*ChopHub bank transfer order ${result.orderId}*\nPayment reference: ${result.paymentReference}\nName: ${customerName}\nPhone: ${customerPhone}\nArea: ${deliveryArea}\nAddress: ${deliveryAddress}\n\nItems:\n${cart.map((item) => `• ${item.name} x${item.quantity}`).join("\n")}\n\nFood subtotal: ₦${Number(result.foodSubtotal).toLocaleString()}\nRoute (${q.routeDistanceKm} km): ₦${Number(q.fees.deliveryFee).toLocaleString()}\nAdditional pickup charge: ₦${Number(q.fees.extraPickupFee).toLocaleString()}\nEvening driver: ₦${Number(q.fees.eveningDriverFee).toLocaleString()}\n*Total: ₦${Number(result.totalAmount).toLocaleString()}*\n\nPlease send the bank transfer details. I understand preparation starts after ChopHub confirms payment.`;
      const phoneNumber = "2348081688937";
      whatsappWindow!.location.href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      setOrderSubmitted(true);
    } catch (error) {
      whatsappWindow?.close();
      setQuoteError(error instanceof Error ? error.message : "We could not save the order. Please check your connection and try again.");
    } finally { setIsSubmittingOrder(false); }
  };

  useEffect(() => { setCheckoutQuote(null); setDeliveryLocationConfirmed(false); }, [cart, deliveryCoordinates, deliveryAddress, deliveryArea]);

  return (
    <div className="min-h-screen bg-green-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-green-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/Chop_icon.png" alt="ChopHub" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-xl font-extrabold tracking-tight text-green-800">ChopHub</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="/menu" className="hover:text-green-700 transition">
              Menu
            </a>
            <button
              type="button"
              onClick={scrollToAbout}
              className="hover:text-green-700 transition"
            >
              About
            </button>
            <button
              type="button"
              onClick={scrollToContact}
              className="hover:text-green-700 transition"
            >
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-green-50 rounded-full transition text-2xl"
              aria-label={`Open cart with ${totalItems} items`}
            >
              🛒
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

          </div>
          <div className="relative md:hidden">
            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen((open) => !open)}
              className="p-2 rounded-lg hover:bg-green-50 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-800"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            {isMobileNavOpen && (
              <nav className="absolute right-0 top-12 z-10 w-36 rounded-xl border border-green-100 bg-white p-2 shadow-lg">
                <a
                  href="/menu"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-green-50 transition"
                >
                  Menu
                </a>
                <button
                  type="button"
                  onClick={scrollToAbout}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-green-50 transition"
                >
                  About
                </button>
                <button
                  type="button"
                  onClick={scrollToContact}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-green-50 transition"
                >
                  Contact
                </button>
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/chophub-background.jpg')" }}
      >
        <div className="absolute inset-0 bg-white/55" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-green-900">
            Authentic Calabar Food
            <br />
            <span className="text-green-600">Delivered Fresh</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Taste the real indigenous flavors of Calabar — Afang, Edikang Ikong,
            Ogbono Soup, and more.
          </p>
        </div>
      </section>

      {/* Featured Dishes */}
      <section id="menu" className="scroll-mt-24 py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center text-3xl font-bold text-green-900 md:mb-10">
            Featured Dishes
          </h2>
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Soup and Swallow", "soup-swallow"],
              ["Meat", "meat"],
              ["Rice", "rice"],
              ["Dessert", "dessert"],
            ].map(([label, category]) => (
              <Link key={category} href={`/menu?category=${category}`} className="rounded-xl border border-green-100 bg-white px-3 py-3 text-center text-sm font-semibold text-green-900 shadow-sm transition hover:bg-green-50">
                {label}
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {featuredDishes.map((dish) => (
              <div key={dish.id} className="contents">
                <div className={`overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm transition ${
                  dish.available === false ? "opacity-75" : "hover:shadow-md"
                }`}>
                <div className="h-40 overflow-hidden md:h-52">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div className="p-3 md:p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-sm md:text-lg text-green-900">
                        {dish.name}
                      </h3>
                      <span className="text-green-700 font-bold text-xs md:text-base">
                        {dish.type === "rice" ? "From " : ""}₦{dish.price.toLocaleString()}
                      </span>
                  </div>
                  {dish.available === false && (
                    <p className="mb-2 text-sm font-semibold text-red-600">Currently unavailable</p>
                  )}
                  <p className="text-gray-600 text-xs md:text-sm mb-3 md:mb-4">{dish.desc}</p>

                  <button
                   onClick={() => openCustomization(dish)}
                   disabled={dish.available === false || addedFeedback[dish.id]}
                   className={`w-full py-2.5 rounded-full font-medium transition ${
                     dish.available === false
                       ? "cursor-not-allowed bg-gray-200 text-gray-500"
                       : addedFeedback[dish.id]
                       ? "bg-green-500 text-white cursor-default"
                       : "bg-green-600 hover:bg-green-700 text-white"
                   }`}
                  >
                   {dish.available === false
                     ? "Unavailable"
                     : addedFeedback[dish.id]
                       ? "Added! ✓"
                       : "Customize & Add"}
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-white py-16 scroll-mt-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-600 mb-3">
            Our Story
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-green-900 mb-6">
            Good food should be easy to find, easy to order, and delivered right.
          </h2>
          <div className="space-y-4 text-gray-600 leading-7">
            <p>
              ChopHub was born from a simple idea:{" "}
              <strong className="text-green-800">
                good food should be easy to find, easy to order, and delivered
                right.
              </strong>
            </p>
            <p>
              We created ChopHub to connect people with the food they love from
              restaurants and local food businesses across Calabar, while making the
              entire experience more convenient, reliable, and enjoyable.
            </p>
            <p>
              From the moment you place your order to the moment it arrives at
              your door, we focus on the details that matter:{" "}
              <strong className="text-green-800">
                quality, convenience, presentation, and great service.
              </strong>
            </p>
            <p className="font-semibold text-green-800">
              ChopHub is more than food delivery. It&apos;s your hub for good
              food.
            </p>
          </div>
        </div>
      </section>

      {/* Meal customization modal */}
      {customizingDish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={closeCustomization}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customization-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-green-100 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-green-600">
                  Customize your meal
                </p>
                <h2 id="customization-title" className="mt-1 text-xl font-bold text-green-900">
                  {customizingDish.name}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Base price: ₦{customizingDish.price.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCustomization}
                className="rounded-full p-1 text-2xl leading-none text-gray-500 hover:bg-green-50 hover:text-gray-800"
                aria-label="Close meal customization"
              >
                ×
              </button>
            </div>

            <form
              className="overflow-y-auto p-5"
              onSubmit={(event) => {
                event.preventDefault();
                addToCart(customizingDish, customizationQuantity);
              }}
            >
              {customizingDish.type === "soup" && (
                <label className="mb-5 block">
                  <span className="mb-2 block text-sm font-semibold text-green-900">
                    Choose your swallow
                  </span>
                  <select
                    required
                    value={selectedSwallow[customizingDish.id] || ""}
                    onChange={(event) =>
                      setSelectedSwallow((prev) => ({
                        ...prev,
                        [customizingDish.id]: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-green-200 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select swallow</option>
                    {swallowOptions.map((swallow) => (
                      <option key={swallow.name} value={swallow.name}>
                        {swallow.name} — ₦{swallow.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {customizingDish.type === "rice" && (
                <fieldset className="mb-5">
                  <legend className="mb-2 text-sm font-semibold text-green-900">
                    Proteins &amp; sides <span className="font-normal text-gray-500">(optional)</span>
                  </legend>
                  <div className="space-y-2">
                    {proteinOptions.map((protein) => {
                      const quantity =
                        selectedProtein[customizingDish.id]?.[protein.name] || 0;

                      return (
                        <div
                          key={protein.name}
                          className="flex items-center justify-between rounded-lg border border-green-100 px-3 py-2.5"
                        >
                          <span className="text-sm">
                            {protein.name} — ₦{protein.price.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedProtein((prev) => ({
                                  ...prev,
                                  [customizingDish.id]: {
                                    ...prev[customizingDish.id],
                                    [protein.name]: Math.max(0, quantity - 1),
                                  },
                                }))
                              }
                              className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200"
                              aria-label={`Remove one portion of ${protein.name}`}
                            >
                              −
                            </button>
                            <span className="w-5 text-center font-medium">{quantity}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedProtein((prev) => ({
                                  ...prev,
                                  [customizingDish.id]: {
                                    ...prev[customizingDish.id],
                                    [protein.name]: quantity + 1,
                                  },
                                }))
                              }
                              className="h-8 w-8 rounded-full bg-green-100 text-green-900 hover:bg-green-200"
                              aria-label={`Add one portion of ${protein.name}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {customizingDish.type === "meat" && (
                <label className="mb-5 block">
                  <span className="mb-2 block text-sm font-semibold text-green-900">
                    Choose your side
                  </span>
                  <select
                    required
                    value={selectedPairing[customizingDish.id] || ""}
                    onChange={(event) =>
                      setSelectedPairing((prev) => ({
                        ...prev,
                        [customizingDish.id]: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-green-200 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select side — ₦1,000</option>
                    {pairingOptions.map((pairing) => (
                      <option key={pairing} value={pairing}>
                        {pairing} — ₦1,000
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {customizingDish.name !== "Parfait" && (
                <label className="mb-5 block">
                  <span className="mb-2 block text-sm font-semibold text-green-900">
                    Water
                  </span>
                  <select
                    value={selectedWater[customizingDish.id] ? "water" : ""}
                    onChange={(event) =>
                      setSelectedWater((prev) => ({
                        ...prev,
                        [customizingDish.id]: event.target.value === "water",
                      }))
                    }
                    className="w-full rounded-lg border border-green-200 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">No water</option>
                    <option value="water">Water — ₦{waterPrice.toLocaleString()}</option>
                  </select>
                </label>
              )}

              <div className="mb-5">
                <span className="mb-2 block text-sm font-semibold text-green-900">
                  Chilled drinks
                </span>
                <div className="flex gap-2">
                  <select
                    value={selectedDrink[customizingDish.id]?.name || ""}
                    onChange={(event) =>
                      setSelectedDrink((prev) => ({
                        ...prev,
                        [customizingDish.id]: {
                          name: event.target.value,
                          quantity: event.target.value
                            ? prev[customizingDish.id]?.quantity || 1
                            : 0,
                        },
                      }))
                    }
                    className="min-w-0 flex-1 rounded-lg border border-green-200 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">No drink</option>
                    {drinkOptions.map((drink) => (
                      <option key={drink.name} value={drink.name}>
                        {drink.name} — ₦{drink.price.toLocaleString()}
                      </option>
                    ))}
                    {customizingDish.type === "meat" && (
                      <optgroup label="Beer">
                        {beerOptions.map((drink) => (
                          <option key={drink.name} value={drink.name}>
                            {drink.name} — ₦{drink.price.toLocaleString()}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {selectedDrink[customizingDish.id]?.name && (
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={selectedDrink[customizingDish.id].quantity}
                      onChange={(event) =>
                        setSelectedDrink((prev) => ({
                          ...prev,
                          [customizingDish.id]: {
                            ...prev[customizingDish.id],
                            quantity: Math.min(20, Math.max(1, Number(event.target.value) || 1)),
                          },
                        }))
                      }
                      className="w-20 rounded-lg border border-green-200 px-2 py-2.5 text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                      aria-label="Chilled drink quantity"
                    />
                  )}
                </div>
              </div>

              <div className="mb-5">
                <span className="mb-2 block text-sm font-semibold text-green-900">
                  Meal quantity
                </span>
                <div className="flex w-fit items-center gap-4 rounded-lg border border-green-200 px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCustomizationQuantity((quantity) => Math.max(1, quantity - 1))
                    }
                    className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200"
                    aria-label="Remove one meal"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{customizationQuantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomizationQuantity((quantity) => Math.min(20, quantity + 1))
                    }
                    className="h-8 w-8 rounded-full bg-green-100 text-green-900 hover:bg-green-200"
                    aria-label="Add one meal"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                Add {customizationQuantity} {customizationQuantity === 1 ? "meal" : "meals"} to Cart
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsCartOpen(false)}
          ></div>

          <div className="relative bg-white w-full max-w-md h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-xl font-bold text-green-900">Your Cart</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {orderSubmitted && (
                <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                  <p className="font-semibold">Order details sent to WhatsApp.</p>
                  <p className="mt-1">
                    ChopHub will send transfer details and begin preparing your order after confirming payment.
                  </p>
                </div>
              )}
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center mt-10">
                  Your cart is empty
                </p>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4 border-b pb-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-green-900">
                            {item.name}
                          </h3>
                          <p className="text-green-700 font-medium">
                            ₦{item.price.toLocaleString()} / portion
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                              −
                            </button>
                            <span className="font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Details Form */}
                  <div className="space-y-4 border-t pt-5">
                    <h3 className="font-bold text-green-900">
                      Delivery Details
                    </h3>
                    {customerProfile && <label className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-900"><input type="checkbox" checked={deliverToSomeoneElse} onChange={(event) => changeRecipientMode(event.target.checked)} className="mt-1" /><span><strong>Deliver to someone else</strong><span className="block text-xs text-green-800">Enter their name, phone number and delivery location for this order.</span></span></label>}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {deliverToSomeoneElse ? "Recipient’s Name" : "Full Name"}
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Delivery Area
                      </label>
                      <select
                        value={deliveryArea}
                        onChange={(e) => { setDeliveryArea(e.target.value); setDeliveryCoordinates(null); }}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select your delivery area</option>
                        <option value="Calabar Municipal">Calabar Municipal</option>
                        <option value="Calabar South">Calabar South</option>
                        <option value="Outside listed areas">Outside listed areas</option>
                      </select>
                    </div>

                    <div className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
                      <p className="font-semibold">Delivery price is calculated from your address and the pickup route.</p>
                      <p className="mt-1 text-green-800">Use the device location or enter your full address and area. Orders close at 8:00 pm; evening orders after 5:30 pm require an available driver.</p>
                      <p className="mt-1 text-green-800">Some meals are made to order. ChopHub will confirm the estimated preparation wait after checking availability; preparation starts after payment is confirmed.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email address (for payment receipt)
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {deliverToSomeoneElse ? "Recipient’s Phone Number" : "Phone Number"}
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 08012345678"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Delivery Address
                      </label>
                      <textarea
                        value={deliveryAddress}
                        onChange={(e) => { setDeliveryAddress(e.target.value); setDeliveryCoordinates(null); }}
                        placeholder="Street, house or compound name, and a nearby landmark"
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={useCurrentDeliveryLocation}
                        className="mt-2 text-sm font-semibold text-green-700 hover:text-green-900"
                      >
                        {deliveryCoordinates ? "Delivery location saved ✓" : "Use this phone’s location for delivery"}
                      </button>
                      <p className="mt-1 text-xs text-gray-500">
                        Use this only if the device is at the delivery address. Otherwise, enter the full address above; we’ll look it up for you to confirm.
                      </p>
                      {customerProfile && <label className="mt-3 flex items-start gap-2 text-sm text-green-900"><input type="checkbox" checked={saveAddressAsDefault} onChange={(event) => setSaveAddressAsDefault(event.target.checked)} className="mt-1" /><span>Save this as my default delivery address for next time.</span></label>}
                      <details className="mt-3 rounded-lg border border-green-100 p-3 text-sm" onToggle={(event) => setIsDeliveryMapOpen(event.currentTarget.open)}>
                        <summary className="cursor-pointer font-semibold text-green-800">Choose delivery point on a map</summary>
                        <p className="mt-2 text-xs text-gray-600">Tap the exact delivery point or drag the pin. ChopHub will save the coordinates automatically for the delivery calculation.</p>
                        {isDeliveryMapOpen && <DeliveryMapPicker value={deliveryCoordinates} onSelect={selectDeliveryMapPoint} />}
                        <details className="mt-3 text-xs text-gray-600">
                          <summary className="cursor-pointer font-semibold text-green-800">Enter coordinates manually</summary>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${deliveryAddress}, ${deliveryArea}, Calabar, Nigeria`)}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-green-700 underline">Open address in Google Maps</a>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <input type="number" step="any" min="-90" max="90" value={latitudeDraft} onChange={(event) => setLatitudeDraft(event.target.value)} placeholder="Latitude" aria-label="Delivery latitude" className="min-w-0 rounded-lg border border-green-200 px-3 py-2" />
                            <input type="number" step="any" min="-180" max="180" value={longitudeDraft} onChange={(event) => setLongitudeDraft(event.target.value)} placeholder="Longitude" aria-label="Delivery longitude" className="min-w-0 rounded-lg border border-green-200 px-3 py-2" />
                          </div>
                          <button type="button" onClick={useMapCoordinates} className="mt-2 rounded-full border border-green-700 px-4 py-2 text-sm font-semibold text-green-800">Use these map coordinates</button>
                        </details>
                      </details>
                    </div>
                    <fieldset className="space-y-2 rounded-lg border border-green-200 p-3">
                      <legend className="px-1 text-sm font-semibold text-green-900">Payment method</legend>
                      <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name="paymentMethod" checked={paymentMethod === "paystack"} onChange={() => setPaymentMethod("paystack")} className="mt-1" /><span><strong>Pay online with Paystack</strong><span className="block text-gray-600">Secure card or supported payment options.</span><span className="mt-1 block text-amber-800">Paystack may add a processing fee depending on your payment method. The exact fee will be shown at Paystack checkout before you confirm payment.</span></span></label>
                      <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name="paymentMethod" checked={paymentMethod === "bank_transfer"} onChange={() => setPaymentMethod("bank_transfer")} className="mt-1" /><span><strong>Bank transfer through WhatsApp</strong><span className="block text-gray-600">ChopHub will send account details and confirm payment.</span></span></label>
                    </fieldset>
                  </div>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t p-5">
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span>Food subtotal</span>
                    <span className="font-semibold">₦{Number(checkoutQuote?.foodSubtotal ?? totalPrice).toLocaleString()}</span>
                  </div>
                  {checkoutQuote ? <>
                    <div className="flex justify-between text-gray-600"><span>Pickup route ({checkoutQuote.routeDistanceKm} km)</span><span>₦{Number(checkoutQuote.fees.deliveryFee).toLocaleString()}</span></div>
                    <div className="flex justify-between text-gray-600"><span>Additional pickup charge</span><span>₦{Number(checkoutQuote.fees.extraPickupFee).toLocaleString()}</span></div>
                    {checkoutQuote.isEvening && <div className="flex justify-between text-gray-600"><span>Evening driver</span><span>₦{Number(checkoutQuote.fees.eveningDriverFee).toLocaleString()}</span></div>}
                    {checkoutQuote.locationSource === "address" && <label className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" checked={deliveryLocationConfirmed} onChange={(event) => setDeliveryLocationConfirmed(event.target.checked)} className="mt-1" /><span>We matched your address to <strong>{checkoutQuote.resolvedDeliveryLocation}</strong>. This is an address match, not a map pin. Confirm it is the correct street or nearby landmark; if it only shows Calabar or the wrong place, add a clearer landmark and calculate again.</span></label>}
                  </> : <div className="text-gray-600">Delivery charge will appear after route calculation.</div>}
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Order total</span>
                    <span className="text-green-700">{checkoutQuote ? `₦${Number(checkoutQuote.totalAmount).toLocaleString()}` : "—"}</span>
                  </div>
                </div>
                {quoteError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{quoteError}</p>}
                <button
                  onClick={calculateCheckoutQuote}
                  disabled={isQuoting}
                  className="mb-2 w-full rounded-full border border-green-700 py-3 font-semibold text-green-800 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isQuoting ? "Calculating route…" : checkoutQuote ? "Recalculate delivery charges" : "Calculate delivery charges"}
                </button>
                <button onClick={submitCheckout} disabled={!checkoutQuote || isSubmittingOrder || (checkoutQuote.locationSource === "address" && !deliveryLocationConfirmed)} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50">
                  {isSubmittingOrder ? "Submitting order…" : paymentMethod === "paystack" ? "Continue to Paystack" : "Continue to WhatsApp transfer"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Section */}
      <section id="contact" className="bg-green-50 py-16 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-green-600 mb-3">
              Get in touch
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-green-900">
              Contact ChopHub
            </h2>
            <p className="text-gray-600 mt-3">
              We are available 24/7 to help with your order or question.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="bg-white rounded-2xl border border-green-100 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-green-900 mb-5">
                Contact information
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-green-100 pb-5 mb-5">
                <img
                  src="/whatsapp-qr.svg"
                  alt="Scan to chat with ChopHub on WhatsApp"
                  className="w-32 h-32 rounded-lg"
                />
                <div className="text-center sm:text-left">
                  <p className="font-semibold text-green-900">Scan to order on WhatsApp</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Point your phone camera at the QR code to start a chat.
                  </p>
                </div>
              </div>
              <div className="space-y-4 text-gray-700">
                <p>
                  <span className="block text-sm font-semibold text-green-800">WhatsApp / Orders</span>
                  <a href="https://wa.me/2348081688937" target="_blank" rel="noreferrer" className="hover:text-green-700">
                    +234 808 168 8937
                  </a>
                </p>
                <p>
                  <span className="block text-sm font-semibold text-green-800">Phone</span>
                  <a href="tel:+2348137963930" className="hover:text-green-700">
                    +234 813 796 3930
                  </a>
                </p>
                <p>
                  <span className="block text-sm font-semibold text-green-800">Email</span>
                  <a href="mailto:chophub@aol.com" className="hover:text-green-700">
                    chophub@aol.com
                  </a>
                </p>
                <p>
                  <span className="block text-sm font-semibold text-green-800">Service area</span>
                  Calabar Municipal and Calabar South
                </p>
                <p>
                  <span className="block text-sm font-semibold text-green-800">Opening hours</span>
                  24/7
                </p>
                <p>
                  <span className="block text-sm font-semibold text-green-800">Social media</span>
                  <a
                    href="https://x.com/chophubfood"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-green-700"
                  >
                    X/Twitter
                  </a>
                  {" · "}
                  <a
                    href="https://www.facebook.com/share/1BW844CEN9/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-green-700"
                  >
                    Facebook
                  </a>
                  {" · Instagram · TikTok: @chophub"}
                </p>
              </div>
            </div>

            <form
              onSubmit={sendContactMessage}
              className="bg-white rounded-2xl border border-green-100 p-6 shadow-sm space-y-4"
            >
              <h3 className="text-xl font-bold text-green-900">Send us a message</h3>
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium mb-1">Name</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="contact-details" className="block text-sm font-medium mb-1">Phone or email</label>
                <input
                  id="contact-details"
                  type="text"
                  required
                  value={contactDetails}
                  onChange={(event) => setContactDetails(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={contactMessage}
                  onChange={(event) => setContactMessage(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full font-semibold transition"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-900 text-green-100 py-12 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src="/Chop_icon_white.png"
              alt="ChopHub"
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-white font-bold text-lg">
              ChopHub Calabar
            </span>
          </div>
          <p className="text-sm mb-6">
            Authentic indigenous Calabar cuisine, delivered with love.
          </p>
          <p className="text-xs text-green-300">
            © 2026 ChopHub Calabar. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

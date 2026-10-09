"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Meal = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
};

type Order = {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address?: string;
  delivery_area: string;
  subtotal: number;
  food_subtotal?: number;
  total_amount?: number;
  delivery_distance_km?: number;
  delivery_fee?: number;
  extra_pickup_fee?: number;
  evening_driver_fee?: number;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_reference?: string | null;
  pickup_vendors?: Array<{ id: number; name: string; address?: string; itemIds?: string[] }>;
  status: OrderStatus;
  rider_id?: number;
  rider_name?: string;
  rider_phone?: string;
  attention_reason?: string;
  events?: OrderEvent[];
  created_at: string;
};

type OrderEvent = { id: number; event_type: string; note: string; created_at: string };

const orderStatuses = [
  ["new", "New"],
  ["vendor_confirmation", "Vendor confirmation"],
  ["vendors_confirmed", "Vendors confirmed"],
  ["rider_assigned", "Rider assigned"],
  ["pickup_in_progress", "Pickup in progress"],
  ["items_collected", "Items collected"],
  ["out_for_delivery", "Out for delivery"],
  ["delivered", "Delivered"],
  ["exception", "Needs attention"],
  ["cancelled", "Cancelled"],
] as const;

type OrderStatus = (typeof orderStatuses)[number][0];

type ProductVariant = { name: string; price: number };

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  section: "foodstuff" | "fresh-food";
  unit: string;
  price: number;
  image: string;
  stock_status: "in_stock" | "limited" | "unavailable";
  variant_options: ProductVariant[];
};

type Vendor = { id: number; name: string; phone: string; address: string; latitude: number | null; longitude: number | null; notes: string; active: boolean; productIds: string[]; mealIds: number[]; mealPrices: Record<number, number | null> };
type Rider = { id: number; name: string; phone: string; base_area: string; availability: "available" | "busy" | "offline"; account_status: "pending" | "approved" | "suspended"; last_location_at?: string | null };

export default function AdminDashboard({
  adminEmail,
}: {
  adminEmail: string;
}) {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<
    "menu" | "availability" | "products" | "vendors" | "riders" | "orders"
  >("menu");

  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [mealError, setMealError] = useState("");
  const [savingMealId, setSavingMealId] = useState<number | null>(null);
  const [isCreatingMeal, setIsCreatingMeal] = useState(false);
  const [newMeal, setNewMeal] = useState<Omit<Meal, "id">>({ name: "", description: "", price: 0, category: "", image: "", available: true });

  const [pendingAvailability, setPendingAvailability] = useState<
    Record<number, boolean>
  >({});

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderView, setOrderView] = useState<"active" | "history">("active");
  const visibleOrders = orders.filter((order) =>
    orderView === "history"
      ? order.status === "delivered"
      : order.status !== "delivered"
  );
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [riderDrafts, setRiderDrafts] = useState<Record<number, { name: string; phone: string }>>({});
  const [attentionDrafts, setAttentionDrafts] = useState<Record<number, string>>({});

  const [products, setProducts] = useState<Product[]>([]);
  const [productSectionView, setProductSectionView] = useState<Product["section"]>("foodstuff");
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");
  const [productSavedMessage, setProductSavedMessage] = useState("");
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [savingAllProducts, setSavingAllProducts] = useState(false);
  const [deletingProductCategory, setDeletingProductCategory] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorError, setVendorError] = useState("");
  const [vendorSavedMessage, setVendorSavedMessage] = useState("");
  const [savingVendorId, setSavingVendorId] = useState<number | "new" | null>(null);
  const [newVendor, setNewVendor] = useState<Omit<Vendor, "id">>({ name: "", phone: "", address: "", latitude: null, longitude: null, notes: "", active: true, productIds: [], mealIds: [], mealPrices: {} });
  const [riders, setRiders] = useState<Rider[]>([]);
  const [riderError, setRiderError] = useState("");
  const [savingRiderId, setSavingRiderId] = useState<number | "new" | null>(null);
  const [newRider, setNewRider] = useState<Omit<Rider, "id" | "last_location_at">>({ name: "", phone: "", base_area: "", availability: "offline", account_status: "pending" });

  const [newProduct, setNewProduct] = useState<Product>({
    id: "",
    name: "",
    description: "",
    category: "",
    subcategory: "",
    section: "foodstuff",
    unit: "",
    price: 0,
    image: "",
    stock_status: "in_stock",
    variant_options: [],
  });
  const visibleProducts = products.filter((product) => product.section === productSectionView);
  const visibleProductCategories = [...new Set(visibleProducts.map((product) => product.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  /* =========================
     LOAD MEALS
  ========================= */

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetch("/api/admin/meals")
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Could not load meals");
          }

          return response.json() as Promise<Meal[]>;
        })
        .then(setMeals)
        .catch(() =>
          setMealError(
            "Meals could not be loaded. Check that Supabase has been seeded."
          )
        )
        .finally(() => setIsLoadingMeals(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    fetch("/api/admin/riders").then(async (response) => {
      if (!response.ok) throw new Error("Could not load riders");
      return response.json() as Promise<Rider[]>;
    }).then(setRiders).catch(() => setRiderError("Riders could not be loaded. Run the delivery SQL in Supabase first."));
  }, []);

  /* =========================
     LOAD PRODUCTS
  ========================= */

  useEffect(() => {
    fetch("/api/admin/products")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load products");
        }

        return response.json() as Promise<Product[]>;
      })
      .then((loadedProducts) => setProducts(loadedProducts.map((product) => ({
        ...product,
        subcategory: product.subcategory || "",
        variant_options: Array.isArray(product.variant_options) ? product.variant_options : [],
      }))))
      .catch(() =>
        setProductError(
          "Products could not be loaded. Run the catalog SQL in Supabase first."
        )
      )
      .finally(() => setIsLoadingProducts(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/vendors")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load vendors");
        return response.json() as Promise<Vendor[]>;
      })
      .then(setVendors)
      .catch(() => setVendorError("Vendors could not be loaded. Run the catalog SQL in Supabase first."));
  }, []);

  /* =========================
     LOAD ORDERS
  ========================= */

  useEffect(() => {
    fetch("/api/orders")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load orders");
        }

        return response.json() as Promise<Order[]>;
      })
      .then(setOrders)
      .catch(() => undefined);
  }, []);

  /* =========================
     MEAL AVAILABILITY
  ========================= */

  const saveAvailability = async (meal: Meal) => {
    const available =
      pendingAvailability[meal.id] ?? meal.available;

    setSavingMealId(meal.id);
    setMealError("");

    const response = await fetch("/api/admin/meals", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: meal.id,
        available,
      }),
    });

    if (!response.ok) {
      setMealError(
        "That availability change could not be saved."
      );
    } else {
      setMeals((current) =>
        current.map((item) =>
          item.id === meal.id
            ? {
                ...item,
                available,
              }
            : item
        )
      );

      setPendingAvailability((current) => {
        const next = {
          ...current,
        };

        delete next[meal.id];

        return next;
      });
    }

    setSavingMealId(null);
  };

  /* =========================
     UPDATE MEAL
  ========================= */

  const updateMeal = async (meal: Meal) => {
    setSavingMealId(meal.id);
    setMealError("");

    const response = await fetch("/api/admin/meals", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(meal),
    });

    if (!response.ok) {
      setMealError("That meal update could not be saved.");
    }

    setSavingMealId(null);
  };

  const addMeal = async () => {
    setMealError("");
    setIsCreatingMeal(true);
    try {
      const response = await fetch("/api/admin/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMeal),
      });
      const result = await response.json() as Meal | { error?: string };
      if (!response.ok) throw new Error("error" in result ? result.error : "That meal could not be added.");
      setMeals((current) => [...current, result as Meal].sort((left, right) => left.id - right.id));
      setNewMeal({ name: "", description: "", price: 0, category: "", image: "", available: true });
    } catch (error) {
      setMealError(error instanceof Error ? error.message : "That meal could not be added.");
    } finally {
      setIsCreatingMeal(false);
    }
  };

  /* =========================
     IMAGE UPLOAD
  ========================= */

  const uploadImage = async (
    file: File,
    onError: (message: string) => void = setProductError
  ): Promise<string | null> => {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
        let errorMessage = "Image upload failed. Please try again.";

        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) errorMessage = data.error;
        } catch {
          // Keep the generic message when the server does not return JSON.
        }

        onError(errorMessage);

      return null;
    }

    const data = await response.json();

    return data.url as string;
  };

  const uploadProductImage = async (product: Product, file: File) => {
    setProductError("");
    const url = await uploadImage(file);
    if (!url) return;

    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, image: url }),
      });
      if (!response.ok) throw new Error("The image uploaded, but could not be saved to this product. Please try Save changes.");
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, image: url } : item));
      setProductSavedMessage(`${product.name} image saved.`);
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "The uploaded image could not be saved to this product.");
    }
  };

  /* =========================
     SAVE PRODUCT
  ========================= */

  const saveProduct = async (product: Product) => {
    setSavingProductId(product.id);
    setProductError("");

    const response = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      setProductError(
        "That product could not be saved."
      );
    } else {
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? product
            : item
        )
      );
    }

    setSavingProductId(null);
  };

  const saveAllProducts = async () => {
    setSavingAllProducts(true);
    setProductError("");
    setProductSavedMessage("");

    const results = await Promise.all(
      products.map(async (product) => {
        try {
          const response = await fetch("/api/admin/products", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product),
          });
          return { id: product.id, ok: response.ok };
        } catch {
          return { id: product.id, ok: false };
        }
      })
    );

    const failedIds = results.filter((result) => !result.ok).map((result) => result.id);
    if (failedIds.length > 0) {
      setProductError(`Could not save ${failedIds.length} product${failedIds.length === 1 ? "" : "s"}: ${failedIds.join(", ")}. Try again.`);
    } else {
      setProductSavedMessage(`All ${products.length} products saved.`);
    }
    setSavingAllProducts(false);
  };

  /* =========================
     ADD PRODUCT
  ========================= */

  const addProduct = async () => {
    if (!newProduct.id.trim()) {
      setProductError(
        "Give the new product a unique ID before saving."
      );

      return;
    }

    setSavingProductId("new");
    setProductError("");

    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...newProduct,
        id: newProduct.id.trim(),
      }),
    });

    if (!response.ok) {
      setProductError(
        "That product could not be added. Check that its ID is unique."
      );
    } else {
      const created = (await response.json()) as Product[];

      setProducts((current) => [
        ...current,
        created[0] || {
          ...newProduct,
          id: newProduct.id.trim(),
        },
      ]);

      setNewProduct({
        id: "",
        name: "",
        description: "",
        category: "",
        subcategory: "",
        section: "foodstuff",
        unit: "",
        price: 0,
        image: "",
        stock_status: "in_stock",
        variant_options: [],
      });
    }

    setSavingProductId(null);
  };

  /* =========================
     DELETE PRODUCT
  ========================= */

  const deleteProduct = async (id: string) => {
    if (
      !window.confirm(
        "Remove this product from the catalog?"
      )
    ) {
      return;
    }

    const response = await fetch(
      `/api/admin/products?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      setProductError(
        "That product could not be removed."
      );
    } else {
      setProducts((current) =>
        current.filter(
          (product) => product.id !== id
        )
      );
    }
  };

  const deleteProductCategory = async (category: string) => {
    const affectedCount = visibleProducts.filter((product) => product.category.trim() === category).length;
    const sectionLabel = productSectionView === "foodstuff" ? "Groceries" : "Fresh Food";
    if (!affectedCount || category.toLowerCase() === "uncategorized") return;
    if (!window.confirm(`Delete “${category}” from ${sectionLabel}? Its ${affectedCount} product${affectedCount === 1 ? "" : "s"} will be moved to Uncategorized.`)) return;

    setDeletingProductCategory(category);
    setProductError("");
    setProductSavedMessage("");
    try {
      const params = new URLSearchParams({ section: productSectionView, category });
      const response = await fetch(`/api/admin/product-categories?${params}`, { method: "DELETE" });
      const result = await response.json() as { error?: string; productIds?: string[] };
      if (!response.ok) throw new Error(result.error || "That category could not be removed.");

      const movedIds = new Set(result.productIds || []);
      setProducts((current) => current.map((product) => movedIds.has(product.id) ? { ...product, category: "Uncategorized" } : product));
      setProductSavedMessage(`“${category}” was removed. Its ${movedIds.size} product${movedIds.size === 1 ? "" : "s"} moved to Uncategorized.`);
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "That category could not be removed.");
    } finally {
      setDeletingProductCategory(null);
    }
  };

  const saveVendor = async (vendor: Vendor | Omit<Vendor, "id">) => {
    const isNew = !("id" in vendor);
    setSavingVendorId(isNew ? "new" : vendor.id);
    setVendorError("");
    setVendorSavedMessage("");
    try {
      const response = await fetch("/api/admin/vendors", { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vendor) });
      const result = await response.json().catch(() => ({})) as Vendor & { error?: string };
      if (!response.ok) {
        setVendorError(result.error || "Vendor details could not be saved. Check that the vendor database tables are installed.");
      } else {
        const saved = result as Vendor;
        if (isNew) {
          setVendors((current) => [...current, saved]);
          setNewVendor({ name: "", phone: "", address: "", latitude: null, longitude: null, notes: "", active: true, productIds: [], mealIds: [], mealPrices: {} });
        } else {
          setVendors((current) => current.map((item) => item.id === saved.id ? { ...item, ...saved, productIds: saved.productIds || item.productIds, mealIds: saved.mealIds || item.mealIds } : item));
        }
        setVendorSavedMessage(`${saved.name || vendor.name} saved with ${saved.productIds?.length ?? vendor.productIds.length} grocery/fresh food items and ${saved.mealIds?.length ?? vendor.mealIds.length} cooked meals assigned.`);
      }
    } catch {
      setVendorError("ChopHub could not reach the server. Check that the local app is running, then try again.");
    } finally {
      setSavingVendorId(null);
    }
  };

  const saveRider = async (rider: Rider | Omit<Rider, "id" | "last_location_at">) => {
    const isNew = !("id" in rider);
    setSavingRiderId(isNew ? "new" : rider.id);
    const response = await fetch("/api/admin/riders", { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...rider, baseArea: rider.base_area, accountStatus: rider.account_status }) });
    if (!response.ok) {
      setRiderError("Rider details could not be saved.");
    } else {
      const saved = (await response.json()) as Rider[];
      const savedRider = saved[0];
      if (isNew) {
        setRiders((current) => [...current, savedRider]);
        setNewRider({ name: "", phone: "", base_area: "", availability: "offline", account_status: "pending" });
      } else {
        setRiders((current) => current.map((item) => item.id === savedRider.id ? savedRider : item));
      }
    }
    setSavingRiderId(null);
  };

  /* =========================
     UPDATE ORDER STATUS
  ========================= */

  const updateOrderStatus = async (
    order: Order,
    status: OrderStatus,
    eventType = "status_updated",
    note = ""
  ) => {
    setSavingOrderId(order.id);
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: order.id,
        status,
        eventType,
        note,
      }),
    });

    if (!response.ok) {
      setSavingOrderId(null);
      return;
    }

    const result = (await response.json()) as { event?: OrderEvent };

    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status,
              events: result.event ? [result.event, ...(item.events || [])] : item.events,
            }
          : item
      )
    );
    setSavingOrderId(null);
  };

const saveOrderOperation = async (
  order: Order,
  fields: Record<string, string | number | null>,
  eventType: string,
  note: string
) => {
    setSavingOrderId(order.id);
    const response = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, ...fields, eventType, note }) });
    if (response.ok) {
      const result = (await response.json()) as { order?: Order; event?: OrderEvent };
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...(result.order || fields), events: result.event ? [result.event, ...(item.events || [])] : item.events } : item));
    }
    setSavingOrderId(null);
  };

  /* =========================
     SIGN OUT
  ========================= */

  const signOut = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    router.refresh();
  };

  return (
    <main className="admin-dashboard min-h-screen bg-[#f5f8f2] text-slate-900">
      {/* HEADER */}

      <header className="border-b border-emerald-100/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white shadow-lg shadow-emerald-900/15" aria-hidden="true">✳</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">ChopHub</p>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">Admin workspace</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-7 md:px-8 md:py-10">
        {/* ADMIN INFO */}

        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-600 p-6 text-white shadow-xl shadow-emerald-950/10 md:p-8">
          <div className="pointer-events-none absolute -right-8 -top-16 h-64 w-64 rounded-full border-[28px] border-white/10" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <p className="text-sm font-medium text-emerald-100">Good to see you · {adminEmail}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Your ChopHub, at a glance</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50 md:text-base">
              Keep meals, fresh food, groceries, and deliveries running smoothly from one place.
            </p>
          </div>
        </div>

        {/* STATISTICS */}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [String(meals.length), "Menu items"],
            [String(products.filter((product) => product.section === "foodstuff").length), "Grocery products"],
            [String(products.filter((product) => product.section === "fresh-food").length), "Fresh food products"],
            ["1", "Owner account"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="admin-stat-card rounded-2xl border border-emerald-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-3xl font-bold tracking-tight text-emerald-800">
                {value}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* DASHBOARD */}

        <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-emerald-100/80 bg-white p-4 shadow-sm md:p-6">
          {/* NAVIGATION */}

          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-emerald-100 bg-[#f8faf6] p-2 pb-2">
            {[
              ["menu", "Meals & prices"],
              ["availability", "Availability"],
              ["products", "Product Catalog"],
              ["vendors", "Vendors"],
              ["riders", "Riders"],
              ["orders", "Operations"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setActiveSection(
                    value as typeof activeSection
                  )
                }
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  activeSection === value
                    ? "bg-emerald-700 text-white shadow-md shadow-emerald-900/15"
                    : "text-slate-600 hover:bg-white hover:text-emerald-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* =========================
              MEALS
          ========================= */}

          {activeSection === "menu" && (
            <div className="pt-5">
              <h2 className="text-xl font-bold text-green-900">
                Meals & prices
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Edit the customer-facing meal details here.
                Changes are saved in Supabase.
              </p>

              <div className="mt-4 rounded-xl border border-green-100 bg-green-50/50 p-4">
                <h3 className="font-semibold text-green-900">Add a meal</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input value={newMeal.name} onChange={(event) => setNewMeal((current) => ({ ...current, name: event.target.value }))} placeholder="Meal name" className="rounded-lg border border-green-200 px-3 py-2" />
                  <input value={newMeal.category} onChange={(event) => setNewMeal((current) => ({ ...current, category: event.target.value }))} placeholder="Category (e.g. rice, meat, soup-swallow)" className="rounded-lg border border-green-200 px-3 py-2" />
                  <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Price (₦)<input type="number" min="0" step="0.01" value={newMeal.price} onChange={(event) => setNewMeal((current) => ({ ...current, price: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-green-200 px-3 py-2 text-sm" /></label>
                  <textarea value={newMeal.description} onChange={(event) => setNewMeal((current) => ({ ...current, description: event.target.value }))} placeholder="Description" className="rounded-lg border border-green-200 px-3 py-2 sm:col-span-2" />
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600">Meal image</label>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                      <input value={newMeal.image} onChange={(event) => setNewMeal((current) => ({ ...current, image: event.target.value }))} placeholder="Public image URL or emoji" className="flex-1 rounded-lg border border-green-200 px-3 py-2" />
                      <label className="cursor-pointer rounded-lg bg-green-100 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-200">Upload image<input type="file" accept="image/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const url = await uploadImage(file, setMealError); if (url) setNewMeal((current) => ({ ...current, image: url })); event.target.value = ""; }} /></label>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={addMeal} disabled={isCreatingMeal || !newMeal.name.trim() || !newMeal.category.trim()} className="mt-3 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isCreatingMeal ? "Adding meal..." : "Add meal"}</button>
              </div>

              {isLoadingMeals && (
                <p className="mt-4 text-sm text-gray-500">
                  Loading meals...
                </p>
              )}

              {mealError && (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {mealError}
                </p>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="rounded-xl border border-green-100 p-4"
                  >
                    <div className="grid gap-2">
                      <input
                        className="rounded-lg border border-green-200 px-3 py-2 font-medium"
                        value={meal.name}
                        onChange={(event) =>
                          setMeals((current) =>
                            current.map((item) =>
                              item.id === meal.id
                                ? {
                                    ...item,
                                    name: event.target.value,
                                  }
                                : item
                            )
                          )
                        }
                      />

                      <textarea
                        className="rounded-lg border border-green-200 px-3 py-2 text-sm"
                        value={meal.description}
                        onChange={(event) =>
                          setMeals((current) =>
                            current.map((item) =>
                              item.id === meal.id
                                ? {
                                    ...item,
                                    description:
                                      event.target.value,
                                  }
                                : item
                            )
                          )
                        }
                      />

                      <div>
                        <label className="text-xs font-semibold text-gray-600">Meal image</label>
                        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                          <input
                            className="flex-1 rounded-lg border border-green-200 px-3 py-2"
                            value={meal.image}
                            placeholder="Public image URL or emoji"
                            onChange={(event) => setMeals((current) => current.map((item) => item.id === meal.id ? { ...item, image: event.target.value } : item))}
                          />
                          <label className="cursor-pointer rounded-lg bg-green-100 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-200">
                            Upload Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                setMealError("");
                                const url = await uploadImage(file, setMealError);
                                if (url) setMeals((current) => current.map((item) => item.id === meal.id ? { ...item, image: url } : item));
                                event.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        {meal.image && (
                          <div className="mt-2">
                            {/^(https?:\/\/|\/)/i.test(meal.image)
                              ? <img src={meal.image} alt={`${meal.name} preview`} className="h-20 w-20 rounded-lg object-cover" />
                              : <span className="text-3xl">{meal.image}</span>}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs font-semibold text-gray-600">
                          Price (₦)

                          <input
                            type="number"
                            min="0"
                            className="mt-1 w-full rounded-lg border border-green-200 px-3 py-2"
                            value={meal.price}
                            onChange={(event) =>
                              setMeals((current) =>
                                current.map((item) =>
                                  item.id === meal.id
                                    ? {
                                        ...item,
                                        price: Number(
                                          event.target.value
                                        ),
                                      }
                                    : item
                                )
                              )
                            }
                          />
                        </label>

                        <input
                          aria-label="Meal category"
                          placeholder="Meal category"
                          className="rounded-lg border border-green-200 px-3 py-2"
                          value={meal.category}
                          onChange={(event) =>
                            setMeals((current) =>
                              current.map((item) =>
                                item.id === meal.id
                                  ? {
                                      ...item,
                                      category:
                                        event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => updateMeal(meal)}
                        disabled={
                          savingMealId === meal.id
                        }
                        className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {savingMealId === meal.id
                          ? "Saving..."
                          : "Save changes"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================
              PRODUCTS
          ========================= */}

          {activeSection === "products" && (
            <div className="pt-5">
              <h2 className="text-xl font-bold text-green-900">
                Product Catalog
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Manage grocery and fresh food products separately. Changes are saved in Supabase.
              </p>

              <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Product section">
                {(["foodstuff", "fresh-food"] as const).map((section) => {
                  const label = section === "foodstuff" ? "Groceries" : "Fresh Food";
                  const count = products.filter((product) => product.section === section).length;
                  return (
                    <button
                      key={section}
                      type="button"
                      role="tab"
                      aria-selected={productSectionView === section}
                      onClick={() => {
                        setProductSectionView(section);
                        setNewProduct((current) => ({ ...current, section }));
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${productSectionView === section ? "bg-green-600 text-white" : "bg-green-50 text-green-800 hover:bg-green-100"}`}
                    >
                      {label} <span className="ml-1 opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>

              <section className="mt-4 rounded-xl border border-green-100 p-4" aria-label={`Manage ${productSectionView === "foodstuff" ? "grocery" : "fresh food"} categories`}>
                <h3 className="font-semibold text-green-900">Manage categories</h3>
                <p className="mt-1 text-sm text-gray-600">Deleting a category moves its products to Uncategorized; it never deletes the products.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {visibleProductCategories.map((category) => (
                    <div key={category} className="flex items-center gap-2 rounded-full border border-green-100 bg-white py-1 pl-3 pr-1">
                      <span className="text-sm text-green-950">{category}</span>
                      <button
                        type="button"
                        onClick={() => deleteProductCategory(category)}
                        disabled={category.toLowerCase() === "uncategorized" || deletingProductCategory !== null || savingAllProducts || savingProductId !== null}
                        aria-label={`Delete ${category} category`}
                        className="rounded-full px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingProductCategory === category ? "Moving..." : "Delete"}
                      </button>
                    </div>
                  ))}
                  {visibleProductCategories.length === 0 && <p className="text-sm text-gray-500">No categories yet.</p>}
                </div>
              </section>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={saveAllProducts}
                  disabled={savingAllProducts || deletingProductCategory !== null || savingProductId !== null || products.length === 0}
                  className="rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingAllProducts ? "Saving all products..." : `Save all products (${products.length})`}
                </button>
                <span className="text-sm text-gray-600">Saves edits across Groceries and Fresh Food.</span>
              </div>

              {productError && (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {productError}
                </p>
              )}
              {productSavedMessage && (
                <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                  {productSavedMessage}
                </p>
              )}

              {/* ADD PRODUCT */}

              <div className="mt-4 rounded-xl border border-green-100 bg-green-50/50 p-4">
                <h3 className="font-semibold text-green-900">
                  Add a product
                </h3>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(
                    ["id", "name", "category", "subcategory", "unit"] as const
                  ).map((field) => (
                    <input
                      key={field}
                      placeholder={
                        field === "id"
                          ? "Unique ID (e.g. fresh-mango)"
                          : field === "subcategory"
                            ? "Subcategory (optional)"
                          : field[0].toUpperCase() +
                            field.slice(1)
                      }
                      className="rounded-lg border border-green-200 px-3 py-2"
                      value={newProduct[field]}
                      onChange={(event) =>
                        setNewProduct({
                          ...newProduct,
                          [field]: event.target.value,
                        })
                      }
                    />
                  ))}

                  {/* NEW PRODUCT IMAGE */}

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600">
                      Product Image
                    </label>

                    <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                      <input
                        className="flex-1 rounded-lg border border-green-200 px-3 py-2"
                        value={newProduct.image}
                        placeholder="Public image URL or emoji"
                        onChange={(event) =>
                          setNewProduct((prev) => ({
                            ...prev,
                            image: event.target.value,
                          }))
                        }
                      />

                      <label className="cursor-pointer rounded-lg bg-green-100 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-200">
                        Upload Image

                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (event) => {
                            const file =
                              event.target.files?.[0];

                            if (!file) return;

                            const url =
                              await uploadImage(file);

                            if (url) {
                              setNewProduct((prev) => ({
                                ...prev,
                                image: url,
                              }));
                            }
                          }}
                        />
                      </label>
                    </div>

                    {newProduct.image && (
                      <div className="mt-2">
                        {newProduct.image.startsWith(
                          "http"
                        ) ? (
                          <img
                            src={newProduct.image}
                            alt="Product preview"
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-3xl">
                            {newProduct.image}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* PRICE */}

                  <input
                    placeholder="Price (₦)"
                    type="number"
                    min="0"
                    className="rounded-lg border border-green-200 px-3 py-2"
                    value={newProduct.price}
                    onChange={(event) =>
                      setNewProduct({
                        ...newProduct,
                        price: Number(
                          event.target.value
                        ),
                      })
                    }
                  />

                  {/* SECTION */}

                  <select
                    className="rounded-lg border border-green-200 px-3 py-2"
                    value={newProduct.section}
                    onChange={(event) => {
                      const section = event.target.value as Product["section"];
                      setNewProduct((current) => ({ ...current, section }));
                      setProductSectionView(section);
                    }}
                  >
                    <option value="foodstuff">Groceries</option>

                    <option value="fresh-food">
                      Fresh Food
                    </option>
                  </select>

                  {/* STOCK */}

                  <select
                    className="rounded-lg border border-green-200 px-3 py-2"
                    value={newProduct.stock_status}
                    onChange={(event) =>
                      setNewProduct({
                        ...newProduct,
                        stock_status:
                          event.target.value as Product["stock_status"],
                      })
                    }
                  >
                    <option value="in_stock">
                      In stock
                    </option>

                    <option value="limited">
                      Limited
                    </option>

                    <option value="unavailable">
                      Unavailable
                    </option>
                  </select>

                  {/* DESCRIPTION */}

                  <textarea
                    placeholder="Description"
                    className="rounded-lg border border-green-200 px-3 py-2 sm:col-span-2"
                    value={newProduct.description}
                    onChange={(event) =>
                      setNewProduct({
                        ...newProduct,
                        description:
                          event.target.value,
                      })
                    }
                  />

                </div>
                <ProductVariantEditor
                  variants={newProduct.variant_options}
                  onChange={(variant_options) => setNewProduct((current) => ({ ...current, variant_options }))}
                />

                <button
                  type="button"
                  onClick={addProduct}
                  disabled={
                    savingProductId === "new"
                  }
                  className="mt-3 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingProductId === "new"
                    ? "Adding..."
                    : "Add product"}
                </button>
              </div>

              {/* EXISTING PRODUCTS */}

              {isLoadingProducts ? (
                <p className="mt-4 text-sm text-gray-500">
                  Loading products...
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {visibleProducts.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-xl border border-green-100 p-4"
                    >
                      <div className="grid gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {product.id}
                        </p>

                        {/* NAME */}

                        <input
                          className="rounded-lg border border-green-200 px-3 py-2 font-medium"
                          value={product.name}
                          onChange={(event) =>
                            setProducts((current) =>
                              current.map((item) =>
                                item.id === product.id
                                  ? {
                                      ...item,
                                      name: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                        />

                        {/* DESCRIPTION */}

                        <textarea
                          className="rounded-lg border border-green-200 px-3 py-2 text-sm"
                          value={product.description}
                          onChange={(event) =>
                            setProducts((current) =>
                              current.map((item) =>
                                item.id === product.id
                                  ? {
                                      ...item,
                                      description:
                                        event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                        />

                        <div className="grid grid-cols-2 gap-2">
                          {/* CATEGORY */}

                          <input
                            className="rounded-lg border border-green-200 px-3 py-2"
                            value={product.category}
                            placeholder="Category"
                            onChange={(event) =>
                              setProducts((current) =>
                                current.map((item) =>
                                  item.id === product.id
                                    ? {
                                        ...item,
                                        category:
                                          event.target.value,
                                      }
                                    : item
                                )
                              )
                            }
                          />

                          <input
                            className="rounded-lg border border-green-200 px-3 py-2"
                            value={product.subcategory}
                            placeholder="Subcategory (optional)"
                            onChange={(event) =>
                              setProducts((current) =>
                                current.map((item) => item.id === product.id
                                  ? { ...item, subcategory: event.target.value }
                                  : item)
                              )
                            }
                          />

                          {/* UNIT */}

                          <input
                            className="rounded-lg border border-green-200 px-3 py-2"
                            value={product.unit}
                            placeholder="Unit / pack size"
                            onChange={(event) =>
                              setProducts((current) =>
                                current.map((item) =>
                                  item.id === product.id
                                    ? {
                                        ...item,
                                        unit:
                                          event.target.value,
                                      }
                                    : item
                                )
                              )
                            }
                          />

                          {/* PRICE */}

                          <input
                            type="number"
                            min="0"
                            className="rounded-lg border border-green-200 px-3 py-2"
                            value={product.price}
                            onChange={(event) =>
                              setProducts((current) =>
                                current.map((item) =>
                                  item.id === product.id
                                    ? {
                                        ...item,
                                        price: Number(
                                          event.target.value
                                        ),
                                      }
                                    : item
                                )
                              )
                            }
                          />

                          {/* STOCK STATUS */}

                          <select
                            className="rounded-lg border border-green-200 px-3 py-2"
                            value={
                              product.stock_status
                            }
                            onChange={(event) =>
                              setProducts((current) =>
                                current.map((item) =>
                                  item.id === product.id
                                    ? {
                                        ...item,
                                        stock_status:
                                          event.target
                                            .value as Product["stock_status"],
                                      }
                                    : item
                                )
                              )
                            }
                          >
                            <option value="in_stock">
                              In stock
                            </option>

                            <option value="limited">
                              Limited
                            </option>

                            <option value="unavailable">
                              Unavailable
                            </option>
                          </select>
                        </div>

                        <ProductVariantEditor
                          variants={product.variant_options}
                          onChange={(variant_options) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, variant_options } : item))}
                        />

                        {/* EXISTING PRODUCT IMAGE */}

                        <div>
                          <label className="text-xs font-semibold text-gray-600">
                            Product Image
                          </label>

                          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                            <input
                              className="flex-1 rounded-lg border border-green-200 px-3 py-2"
                              value={product.image}
                              placeholder="Public image URL or emoji"
                              onChange={(event) =>
                                setProducts((current) =>
                                  current.map((item) =>
                                    item.id ===
                                    product.id
                                      ? {
                                          ...item,
                                          image:
                                            event.target
                                              .value,
                                        }
                                      : item
                                  )
                                )
                              }
                            />

                            <label className="cursor-pointer rounded-lg bg-green-100 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-200">
                              Upload Image

                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (
                                  event
                                ) => {
                                  const file =
                                    event.target.files?.[0];

                                  if (!file) return;

                                  await uploadProductImage(product, file);
                                }}
                              />
                            </label>
                          </div>

                          {product.image && (
                            <div className="mt-2">
                              {product.image.startsWith(
                                "http"
                              ) ? (
                                <img
                                  src={product.image}
                                  alt={`${product.name} preview`}
                                  className="h-20 w-20 rounded-lg object-cover"
                                />
                              ) : (
                                <span className="text-3xl">
                                  {product.image}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* SAVE / REMOVE */}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              saveProduct(product)
                            }
                            disabled={savingAllProducts || deletingProductCategory !== null || savingProductId === product.id}
                            className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {savingProductId ===
                            product.id
                              ? "Saving..."
                              : "Save changes"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteProduct(
                                product.id
                              )
                            }
                            disabled={deletingProductCategory !== null || savingAllProducts}
                            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {visibleProducts.length === 0 && (
                    <p className="rounded-xl border border-dashed border-green-200 p-6 text-sm text-gray-600 sm:col-span-2">
                      No {productSectionView === "foodstuff" ? "grocery" : "fresh food"} products yet. Add the first one above.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === "vendors" && (
            <div className="pt-5">
              <h2 className="text-xl font-bold text-green-900">Vendor Directory</h2>
              <p className="mt-1 text-sm text-gray-600">Add vendor contact information and select every Cooked Food, Grocery, and Fresh Food item that the vendor supplies.</p>
              {vendorError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{vendorError}</p>}
              {vendorSavedMessage && <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{vendorSavedMessage}</p>}
              <div className="mt-4 rounded-xl border border-green-100 bg-green-50/50 p-4">
                <h3 className="font-semibold text-green-900">Add vendor</h3>
                <VendorFields vendor={newVendor} products={products} meals={meals} onChange={setNewVendor} />
                <button type="button" onClick={() => saveVendor(newVendor)} disabled={savingVendorId === "new"} className="mt-3 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingVendorId === "new" ? "Adding..." : "Add vendor"}</button>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {vendors.map((vendor) => <div key={vendor.id} className="rounded-xl border border-green-100 p-4"><VendorFields vendor={vendor} products={products} meals={meals} onChange={(next) => setVendors((current) => current.map((item) => item.id === vendor.id ? { ...next, id: vendor.id } : item))} /><button type="button" onClick={() => saveVendor(vendor)} disabled={savingVendorId === vendor.id} className="mt-3 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingVendorId === vendor.id ? "Saving..." : "Save vendor"}</button></div>)}
              </div>
            </div>
          )}

          {activeSection === "riders" && (
            <div className="pt-5">
              <h2 className="text-xl font-bold text-green-900">Rider Directory</h2>
              <p className="mt-1 text-sm text-gray-600">Manage delivery riders, their base area, and whether they are ready for a new delivery.</p>
              {riders.some((rider) => rider.account_status === "pending") && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">{riders.filter((rider) => rider.account_status === "pending").length} rider account(s) are waiting for approval. Review the account access setting below each rider before approving.</p>}
              {riderError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{riderError}</p>}
              <div className="mt-4 rounded-xl border border-green-100 bg-green-50/50 p-4"><h3 className="font-semibold text-green-900">Add rider</h3><RiderFields rider={newRider} onChange={setNewRider} /><button type="button" onClick={() => saveRider(newRider)} disabled={savingRiderId === "new"} className="mt-3 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingRiderId === "new" ? "Adding..." : "Add rider"}</button></div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">{riders.map((rider) => <div key={rider.id} className="rounded-xl border border-green-100 p-4"><RiderFields rider={rider} onChange={(next) => setRiders((current) => current.map((item) => item.id === rider.id ? { ...next, id: rider.id } : item))} /><p className="mt-2 text-xs text-gray-500">{rider.last_location_at ? `Last location: ${new Date(rider.last_location_at).toLocaleString()}` : "No live location reported yet"}</p><button type="button" onClick={() => saveRider(rider)} disabled={savingRiderId === rider.id} className="mt-3 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingRiderId === rider.id ? "Saving..." : "Save rider"}</button></div>)}</div>
            </div>
          )}

          {/* =========================
              AVAILABILITY
          ========================= */}

          {activeSection === "availability" && (
            <div className="pt-5">
              <h2 className="text-xl font-bold text-green-900">
                Availability
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Toggle an item off when it is temporarily
                unavailable. This setting is saved in
                Supabase and applies across devices.
              </p>

              {isLoadingMeals && (
                <p className="mt-4 text-sm text-gray-600">
                  Loading meals...
                </p>
              )}

              {mealError && (
                <p className="mt-4 text-sm text-red-600">
                  {mealError}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between rounded-xl border border-green-100 p-3"
                  >
                    <span className="font-medium text-green-900">
                      {meal.name}
                    </span>

                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Availability for ${meal.name}`}
                        value={String(
                          pendingAvailability[
                            meal.id
                          ] ?? meal.available
                        )}
                        onChange={(event) =>
                          setPendingAvailability(
                            (current) => ({
                              ...current,
                              [meal.id]:
                                event.target.value ===
                                "true",
                            })
                          )
                        }
                        className="rounded-lg border border-green-200 px-2 py-1.5 text-xs font-semibold"
                      >
                        <option value="true">
                          Available
                        </option>

                        <option value="false">
                          Unavailable
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          saveAvailability(meal)
                        }
                        disabled={
                          savingMealId === meal.id ||
                          pendingAvailability[
                            meal.id
                          ] === undefined
                        }
                        className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {savingMealId === meal.id
                          ? "Saving..."
                          : "Save"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================
              ORDERS
          ========================= */}

          {activeSection === "orders" && (
            <div className="pt-5">
              <h2 className="text-xl font-bold text-green-900">ChopHub Operations</h2>
              <p className="mt-1 text-gray-600">Track what must happen next for every customer order. Vendor and rider coordination stays with the ChopHub team by phone.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["new", "New orders"], ["vendor_confirmation", "Awaiting vendor calls"], ["pickup_in_progress", "Preparing pickup"], ["out_for_delivery", "Out for delivery"], ["delivered", "Delivered"]].map(([status, label]) => <div key={status} className="rounded-xl border border-green-100 bg-green-50/50 p-4"><p className="text-2xl font-bold text-green-800">{orders.filter((order) => order.status === status).length}</p><p className="mt-1 text-sm text-gray-600">{label}</p></div>)}</div>

              <div className="mt-5 flex gap-2 border-b border-green-100">
                <button type="button" onClick={() => setOrderView("active")} aria-pressed={orderView === "active"} className={`border-b-2 px-3 py-2 text-sm font-semibold ${orderView === "active" ? "border-green-600 text-green-800" : "border-transparent text-gray-500 hover:text-green-700"}`}>Active Orders</button>
                <button type="button" onClick={() => setOrderView("history")} aria-pressed={orderView === "history"} className={`border-b-2 px-3 py-2 text-sm font-semibold ${orderView === "history" ? "border-green-600 text-green-800" : "border-transparent text-gray-500 hover:text-green-700"}`}>History ({orders.filter((order) => order.status === "delivered").length})</button>
              </div>

              {visibleOrders.some((order) => order.status === "exception" || order.attention_reason) && <section className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4"><h3 className="font-bold text-red-800">Needs attention</h3><div className="mt-3 space-y-2">{visibleOrders.filter((order) => order.status === "exception" || order.attention_reason).map((order) => <p key={order.id} className="text-sm text-red-800">Order #{order.id}: {order.attention_reason || "Operations issue needs follow-up"}</p>)}</div></section>}

              <div className="mt-5 space-y-4">
                {visibleOrders.length === 0 && (
                  <p className="text-sm text-gray-500">
                    {orderView === "history"
                      ? "No delivered orders yet."
                      : orders.length === 0
                        ? "No stored orders yet."
                        : "No active orders."}
                  </p>
                )}

                {visibleOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-green-100 p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-semibold text-green-900">
                        Order #{order.id}
                      </p>

                      <select
                        value={order.status}
                        disabled={Boolean(order.payment_status && order.payment_status !== "paid")}
                        onChange={(event) =>
                          updateOrderStatus(
                            order,
                            event.target
                              .value as OrderStatus
                          )
                        }
                        className="rounded-lg border border-green-200 px-2 py-1 text-sm font-semibold text-green-800 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {orderStatuses.map(
                          ([value, label]) => (
                            <option
                              key={value}
                              value={value}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="mt-3 rounded-lg border border-green-100 bg-green-50/60 p-3 text-sm">
                      <p className="font-semibold text-green-900">
                        Payment: {order.payment_status === "paid" ? "Paid" : order.payment_status === "pending" ? "Awaiting confirmation" : order.payment_status === "failed" ? "Failed" : "Legacy order"}
                        {order.payment_method ? ` · ${order.payment_method === "paystack" ? "Paystack" : "Bank transfer"}` : ""}
                      </p>
                      {order.payment_status === "pending" && order.payment_method === "bank_transfer" && <button type="button" disabled={savingOrderId === order.id} onClick={() => saveOrderOperation(order, { paymentStatus: "paid", status: "new" }, "payment_confirmed", "ChopHub manually confirmed the bank transfer.")} className="mt-2 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Confirm transfer received</button>}
                      {order.payment_status && order.payment_status !== "paid" && <p className="mt-1 text-xs text-amber-800">Do not contact vendors or assign a rider until payment is confirmed.</p>}
                    </div>
                    {typeof order.total_amount === "number" && <div className="mt-3 grid gap-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-700 sm:grid-cols-2">
                      <span>Food: ₦{Number(order.food_subtotal ?? order.subtotal).toLocaleString()}</span>
                      <span>Route ({Number(order.delivery_distance_km || 0).toLocaleString()} km): ₦{Number(order.delivery_fee || 0).toLocaleString()}</span>
                      {Number(order.extra_pickup_fee) > 0 && <span>Extra vendor pickups: ₦{Number(order.extra_pickup_fee).toLocaleString()}</span>}
                      {Number(order.evening_driver_fee) > 0 && <span>Evening driver: ₦{Number(order.evening_driver_fee).toLocaleString()}</span>}
                      <span className="font-bold text-green-900">Order total: ₦{Number(order.total_amount).toLocaleString()}</span>
                      {order.pickup_vendors?.length ? <span>Selected nearest vendors: {order.pickup_vendors.map((vendor) => vendor.name).join(", ")}</span> : null}
                    </div>}

                    <p className="mt-1 text-sm text-gray-600">
                      {order.customer_name} ·{" "}
                      {order.customer_phone} ·{" "}
                      {order.delivery_area}
                    </p>

                    {order.delivery_address && <p className="mt-1 text-sm text-gray-600">Delivery: {order.delivery_address}</p>}

                    <p className="mt-1 font-semibold text-green-700">
                      ₦
                      {Number(
                        order.subtotal
                      ).toLocaleString()}
                    </p>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2"><a href={`tel:${order.customer_phone}`} className="rounded-lg border border-green-200 px-3 py-2 text-center text-sm font-semibold text-green-800 hover:bg-green-50">Call customer</a><button type="button" disabled={savingOrderId === order.id || Boolean(order.payment_status && order.payment_status !== "paid")} onClick={() => updateOrderStatus(order, "vendor_confirmation", "vendor_call_needed", "Vendor confirmation required")} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Call vendors</button><button type="button" disabled={savingOrderId === order.id || Boolean(order.payment_status && order.payment_status !== "paid")} onClick={() => updateOrderStatus(order, "vendors_confirmed", "vendors_confirmed", "All required items confirmed by vendors")} className="rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-50">Confirm vendors</button><button type="button" disabled={savingOrderId === order.id || Boolean(order.payment_status && order.payment_status !== "paid")} onClick={() => updateOrderStatus(order, "pickup_in_progress", "pickup_started", "Rider started vendor pickups")} className="rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-50">Start pickup</button><button type="button" disabled={savingOrderId === order.id || Boolean(order.payment_status && order.payment_status !== "paid")} onClick={() => updateOrderStatus(order, "items_collected", "items_collected", "All items collected from vendors")} className="rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-50">Items collected</button><button type="button" disabled={savingOrderId === order.id || Boolean(order.payment_status && order.payment_status !== "paid")} onClick={() => updateOrderStatus(order, "out_for_delivery", "out_for_delivery", "Rider is heading to the customer")} className="rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-50">Out for delivery</button><button type="button" disabled={savingOrderId === order.id || Boolean(order.payment_status && order.payment_status !== "paid")} onClick={() => updateOrderStatus(order, "delivered", "delivered", "Order delivered to customer")} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Mark delivered</button></div>
                    <div className="mt-4 grid gap-2 rounded-xl bg-green-50/60 p-3 sm:grid-cols-3"><input disabled={Boolean(order.payment_status && order.payment_status !== "paid")} placeholder="Rider name" value={riderDrafts[order.id]?.name ?? order.rider_name ?? ""} onChange={(event) => setRiderDrafts((current) => ({ ...current, [order.id]: { name: event.target.value, phone: current[order.id]?.phone ?? order.rider_phone ?? "" } }))} className="rounded-lg border border-green-200 bg-white px-3 py-2 text-sm" /><input disabled={Boolean(order.payment_status && order.payment_status !== "paid")} placeholder="Rider phone" value={riderDrafts[order.id]?.phone ?? order.rider_phone ?? ""} onChange={(event) => setRiderDrafts((current) => ({ ...current, [order.id]: { name: current[order.id]?.name ?? order.rider_name ?? "", phone: event.target.value } }))} className="rounded-lg border border-green-200 bg-white px-3 py-2 text-sm" /><button type="button" disabled={savingOrderId === order.id || Boolean(order.payment_status && order.payment_status !== "paid")} onClick={() => { const rider = riderDrafts[order.id] || { name: order.rider_name || "", phone: order.rider_phone || "" }; saveOrderOperation(order, { riderName: rider.name, riderPhone: rider.phone, status: "rider_assigned" }, "rider_assigned", `Rider assigned: ${rider.name || "Unspecified"}`); }} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Assign rider</button></div>
                    <label className="mt-3 block text-sm font-semibold text-green-900">Assign from rider directory<select value={order.rider_id ?? ""} disabled={Boolean(order.payment_status && order.payment_status !== "paid")} onChange={(event) => { const rider = riders.find((item) => item.id === Number(event.target.value)); if (rider) saveOrderOperation(order, { riderId: rider.id, riderName: rider.name, riderPhone: rider.phone, status: "rider_assigned" }, "rider_assigned", `Rider assigned: ${rider.name}`); }} className="mt-1 w-full rounded-lg border border-green-200 px-3 py-2 text-sm font-normal text-gray-800"><option value="">Select available rider</option>{riders.filter((rider) => rider.availability === "available" || rider.id === order.rider_id).map((rider) => <option key={rider.id} value={rider.id}>{rider.name} · {rider.base_area || "No base area"}</option>)}</select></label>
                    <div className="mt-3 flex gap-2"><input placeholder="Issue or callback note" value={attentionDrafts[order.id] ?? order.attention_reason ?? ""} onChange={(event) => setAttentionDrafts((current) => ({ ...current, [order.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-red-100 px-3 py-2 text-sm" /><button type="button" disabled={savingOrderId === order.id} onClick={() => { const note = attentionDrafts[order.id] ?? order.attention_reason ?? "Operations issue needs follow-up"; saveOrderOperation(order, { attentionReason: note, status: "exception" }, "attention_needed", note); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Flag issue</button></div>
                    {(order.events || []).length > 0 && <div className="mt-4 border-t border-green-100 pt-3"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Activity</p><div className="mt-2 space-y-1">{order.events?.slice(0, 4).map((event) => <p key={event.id} className="text-xs text-gray-600">{new Date(event.created_at).toLocaleString()} · {event.note || event.event_type}</p>)}</div></div>}
                  </div>
                ))}
              </div>

              <a
                href="https://wa.me/2348081688937"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Open ChopHub WhatsApp
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function VendorFields({ vendor, products, meals, onChange }: { vendor: Omit<Vendor, "id">; products: Product[]; meals: Meal[]; onChange: (vendor: Omit<Vendor, "id">) => void }) {
  const toggleMeal = (mealId: number) => {
    const mealIds = vendor.mealIds.includes(mealId) ? vendor.mealIds.filter((id) => id !== mealId) : [...vendor.mealIds, mealId];
    onChange({ ...vendor, mealIds });
  };
  const toggleProduct = (productId: string) => {
    const productIds = vendor.productIds.includes(productId) ? vendor.productIds.filter((id) => id !== productId) : [...vendor.productIds, productId];
    onChange({ ...vendor, productIds });
  };

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <input placeholder="Vendor name" value={vendor.name} onChange={(event) => onChange({ ...vendor, name: event.target.value })} className="rounded-lg border border-green-200 px-3 py-2" />
      <input placeholder="Phone number" value={vendor.phone} onChange={(event) => onChange({ ...vendor, phone: event.target.value })} className="rounded-lg border border-green-200 px-3 py-2" />
      <input placeholder="Pickup address" value={vendor.address} onChange={(event) => onChange({ ...vendor, address: event.target.value })} className="rounded-lg border border-green-200 px-3 py-2 sm:col-span-2" />
      <p className="text-xs text-gray-600 sm:col-span-2">Required for delivery-charge calculation. Enter the pickup pin coordinates (latitude and longitude) from the vendor’s map location.</p>
      <input type="number" step="any" min="-90" max="90" placeholder="Pickup latitude" value={vendor.latitude ?? ""} onChange={(event) => onChange({ ...vendor, latitude: event.target.value === "" ? null : Number(event.target.value) })} className="rounded-lg border border-green-200 px-3 py-2" />
      <input type="number" step="any" min="-180" max="180" placeholder="Pickup longitude" value={vendor.longitude ?? ""} onChange={(event) => onChange({ ...vendor, longitude: event.target.value === "" ? null : Number(event.target.value) })} className="rounded-lg border border-green-200 px-3 py-2" />
      <textarea placeholder="Internal notes" value={vendor.notes} onChange={(event) => onChange({ ...vendor, notes: event.target.value })} className="rounded-lg border border-green-200 px-3 py-2 text-sm sm:col-span-2" />
      <fieldset className="rounded-lg border border-green-200 p-3 sm:col-span-2">
        <legend className="px-1 text-sm font-semibold text-green-900">Cooked Food this vendor offers ({vendor.mealIds.length} selected)</legend>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {meals.length ? meals.map((meal) => (
            <div key={meal.id} className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-2 rounded px-2 py-1 hover:bg-green-50">
              <label className="flex cursor-pointer items-start gap-2 text-sm font-normal text-gray-800">
                <input type="checkbox" checked={vendor.mealIds.includes(meal.id)} onChange={() => toggleMeal(meal.id)} className="mt-0.5" />
                <span>{meal.category} · {meal.name}</span>
              </label>
              {vendor.mealIds.includes(meal.id) && (
                <label className="text-xs text-gray-600">
                  Vendor price (₦)
                  <input type="number" min="0" step="0.01" aria-label={`${meal.name} vendor price`} placeholder={`Base ₦${meal.price.toLocaleString()}`} value={vendor.mealPrices[meal.id] ?? ""} onChange={(event) => onChange({ ...vendor, mealPrices: { ...vendor.mealPrices, [meal.id]: event.target.value === "" ? null : Number(event.target.value) } })} className="mt-1 w-full rounded border border-green-200 px-2 py-1.5 text-sm text-gray-900" />
                </label>
              )}
            </div>
          )) : <p className="text-sm text-gray-500">No cooked meals are available to assign.</p>}
        </div>
        <p className="mt-2 text-xs text-gray-500">Leave a vendor price blank to use the standard menu price.</p>
      </fieldset>
      <fieldset className="rounded-lg border border-green-200 p-3 sm:col-span-2">
        <legend className="px-1 text-sm font-semibold text-green-900">Groceries & Fresh Food this vendor offers ({vendor.productIds.length} selected)</legend>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {products.length ? products.map((product) => (
            <label key={product.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-sm font-normal text-gray-800 hover:bg-green-50">
              <input type="checkbox" checked={vendor.productIds.includes(product.id)} onChange={() => toggleProduct(product.id)} className="mt-0.5" />
              <span>{product.section === "foodstuff" ? "Groceries" : "Fresh Food"} · {product.name}</span>
            </label>
          )) : <p className="text-sm text-gray-500">No grocery or fresh food products are available to assign.</p>}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-semibold text-green-900 sm:col-span-2"><input type="checkbox" checked={vendor.active} onChange={(event) => onChange({ ...vendor, active: event.target.checked })} /> Available for assignments</label>
    </div>
  );
}

function RiderFields({ rider, onChange }: { rider: Omit<Rider, "id" | "last_location_at">; onChange: (rider: Omit<Rider, "id" | "last_location_at">) => void }) {
  return <div className="mt-3 grid gap-2 sm:grid-cols-2"><input placeholder="Rider name" value={rider.name} onChange={(event) => onChange({ ...rider, name: event.target.value })} className="rounded-lg border border-green-200 px-3 py-2" /><input placeholder="Phone number" value={rider.phone} onChange={(event) => onChange({ ...rider, phone: event.target.value })} className="rounded-lg border border-green-200 px-3 py-2" /><input placeholder="Base area" value={rider.base_area} onChange={(event) => onChange({ ...rider, base_area: event.target.value })} className="rounded-lg border border-green-200 px-3 py-2" /><select aria-label="Rider availability" value={rider.availability} onChange={(event) => onChange({ ...rider, availability: event.target.value as Rider["availability"] })} className="rounded-lg border border-green-200 px-3 py-2"><option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option></select><label className="text-sm font-semibold text-slate-700 sm:col-span-2">Account access<select aria-label="Rider account access" value={rider.account_status} onChange={(event) => onChange({ ...rider, account_status: event.target.value as Rider["account_status"] })} className="mt-1 w-full rounded-lg border border-green-200 px-3 py-2"><option value="pending">Pending approval</option><option value="approved">Approved — can sign in</option><option value="suspended">Suspended</option></select></label></div>;
}

function ProductVariantEditor({ variants, onChange }: { variants: ProductVariant[]; onChange: (variants: ProductVariant[]) => void }) {
  const updateVariant = (index: number, patch: Partial<ProductVariant>) => onChange(variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...patch } : variant));
  return (
    <fieldset className="rounded-lg border border-green-100 p-3 sm:col-span-2">
      <legend className="px-1 text-sm font-semibold text-green-900">Sizes or varieties</legend>
      <p className="mb-2 text-xs text-gray-600">Optional. Add labels such as 500 g, Large, or Red with the price for that option. Custom options replace automatic size suggestions.</p>
      <div className="space-y-2">
        {variants.map((variant, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] gap-2">
            <input aria-label={`Option ${index + 1} name`} placeholder="Size or variety" value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} />
            <input aria-label={`Option ${index + 1} price in naira`} type="number" min="0" step="0.01" placeholder="Price (₦)" value={variant.price} onChange={(event) => updateVariant(index, { price: Number(event.target.value) })} />
            <button type="button" onClick={() => onChange(variants.filter((_, variantIndex) => variantIndex !== index))} aria-label={`Remove option ${index + 1}`} className="border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50">Remove</button>
          </div>
        ))}
      </div>
      <button type="button" disabled={variants.length >= 20} onClick={() => onChange([...variants, { name: "", price: 0 }])} className="mt-2 border border-green-200 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-50 disabled:opacity-50">Add size or variety</button>
    </fieldset>
  );
}

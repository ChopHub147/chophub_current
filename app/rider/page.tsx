"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type RiderOrder = {
  id: number | string;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  delivery_area?: string | null;
  food_subtotal?: number | null;
  subtotal?: number | null;
  delivery_fee?: number | null;
  total?: number | null;
  status?: string | null;
  delivery_status?: string | null;
  rider_id?: number | string | null;
  rider_name?: string | null;
  rider_phone?: string | null;
  created_at?: string | null;
  items?: unknown;
  order_items?: unknown;
};

type RiderStatus =
  | "rider_assigned"
  | "pickup_in_progress"
  | "items_collected"
  | "out_for_delivery"
  | "delivered"
  | "exception";

const GREEN = "#07833F";
type RiderIdentity = { id: number; name: string; phone: string; availability?: "available" | "busy" | "offline" };

function naira(value: number | null | undefined) {
  return `₦${Number(value || 0).toLocaleString("en-NG")}`;
}

function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "rider_assigned":
      return "New delivery";
    case "pickup_in_progress":
      return "Picking up";
    case "items_collected":
      return "Ready to deliver";
    case "out_for_delivery":
      return "On the way";
    case "delivered":
      return "Delivered";
    case "exception":
      return "Attention needed";
    default:
      return "Delivery";
  }
}

function getNextAction(status: string | null | undefined) {
  switch (status) {
    case "rider_assigned":
      return {
        label: "Accept Delivery",
        nextStatus: "pickup_in_progress" as RiderStatus,
      };

    case "pickup_in_progress":
      return {
        label: "I've Collected the Order",
        nextStatus: "items_collected" as RiderStatus,
      };

    case "items_collected":
      return {
        label: "Start Delivery",
        nextStatus: "out_for_delivery" as RiderStatus,
      };

    case "out_for_delivery":
      return {
        label: "I've Delivered the Order",
        nextStatus: "delivered" as RiderStatus,
      };

    default:
      return null;
  }
}

export default function RiderPage() {
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [selectedOrder, setSelectedOrder] =
    useState<RiderOrder | null>(null);

  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [rider, setRider] = useState<RiderIdentity | null>(null);
  const [updating, setUpdating] = useState(false);
  const [online, setOnline] = useState(false);
  const [screen, setScreen] = useState<
    "home" | "delivery" | "navigation" | "earnings"
  >("home");

  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(
        "/api/rider/orders",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Could not load rider orders"
        );
      }

      const riderOrders: RiderOrder[] = Array.isArray(
        data?.orders
      )
        ? data.orders
        : [];

      setOrders(riderOrders);

    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load deliveries"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/rider/session", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not check rider sign-in status");
        return result as { rider: RiderIdentity | null };
      })
      .then((result) => {
        setRider(result.rider);
        if (result.rider) void loadOrders();
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not check rider sign-in status"))
      .finally(() => setAuthChecked(true));
  }, [loadOrders]);

  const activeOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.status !== "delivered" &&
        order.status !== "cancelled"
    );
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === "delivered"
    );
  }, [orders]);

  const currentOrder =
    selectedOrder ||
    activeOrders[0] ||
    null;

  async function updateOrderStatus(
    order: RiderOrder,
    nextStatus: RiderStatus
  ) {
    try {
      setUpdating(true);
      setError("");

      const response = await fetch(
        `/api/rider/orders/${order.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not update delivery"
        );
      }

      const updatedOrder: RiderOrder =
        data?.order || data;

      setOrders((previous) =>
        previous.map((item) =>
          String(item.id) ===
          String(updatedOrder.id)
            ? updatedOrder
            : item
        )
      );

      setSelectedOrder(updatedOrder);

      if (nextStatus === "delivered") {
        setScreen("home");
        await loadOrders();
      } else if (
        nextStatus === "out_for_delivery"
      ) {
        setScreen("navigation");
      } else {
        setScreen("delivery");
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not update delivery"
      );
    } finally {
      setUpdating(false);
    }
  }

  function openOrder(order: RiderOrder) {
    setSelectedOrder(order);
    setScreen("delivery");
  }

  function callCustomer(order: RiderOrder) {
    if (!order.customer_phone) return;

    window.location.href = `tel:${order.customer_phone}`;
  }

  function openMaps(order: RiderOrder) {
    const address = [
      order.delivery_address,
      order.delivery_area,
    ]
      .filter(Boolean)
      .join(", ");

    if (!address) return;

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address
      )}`,
      "_blank"
    );
  }

  const nextAction =
    currentOrder
      ? getNextAction(currentOrder.status)
      : null;

  const totalEarnings = completedOrders.reduce(
    (sum, order) =>
      sum +
      Number(
        order.delivery_fee ||
          0
      ),
    0
  );

  if (!authChecked) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f3f8f3] px-5 text-sm font-medium text-slate-600">Checking rider sign-in…</main>;
  }

  if (!rider) return <RiderAccess onSignedIn={(identity) => { setRider(identity); setError(""); void loadOrders(); }} />;

  const signOut = async () => {
    await fetch("/api/rider/login", { method: "DELETE" });
    setRider(null);
    setOrders([]);
    setSelectedOrder(null);
  };

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-gray-900">
      <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm">
        {/* HEADER */}
        <header className="sticky top-0 z-20 border-b bg-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
                  style={{
                    backgroundColor: GREEN,
                  }}
                >
                  C
                </div>

                <div>
                  <p
                    className="text-lg font-bold"
                    style={{ color: GREEN }}
                  >
                    ChopHub
                  </p>

                  <p className="text-xs text-gray-500">
                    {rider.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
            <button
              onClick={() => setOnline(!online)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                online
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span className="mr-1">
                {online ? "●" : "○"}
              </span>

              {online
                ? "Online"
                : "Offline"}
            </button>
            <button type="button" onClick={signOut} className="rounded-full px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100">Sign out</button>
            </div>
          </div>
        </header>

        {/* ERROR */}
        {error && (
          <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CONTENT */}
        <section className="px-5 pb-28 pt-5">
          {screen === "home" && (
            <>
              <div className="mb-5">
                <p className="text-sm text-gray-500">
                  Good day, {rider.name.split(" ")[0]}
                </p>

                <h1 className="text-2xl font-bold">
                  {online
                    ? "You're ready to ride"
                    : "You're offline"}
                </h1>
              </div>

              {/* ONLINE CARD */}
              <div
                className="mb-5 rounded-3xl p-5 text-white shadow-sm"
                style={{
                  backgroundColor: GREEN,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">
                      Rider status
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      {online
                        ? "Online"
                        : "Offline"}
                    </h2>
                  </div>

                  <div className="text-5xl">
                    🛵
                  </div>
                </div>

                <button
                  onClick={() =>
                    setOnline(!online)
                  }
                  className="mt-6 w-full rounded-2xl bg-white py-3 font-bold"
                  style={{
                    color: GREEN,
                  }}
                >
                  {online
                    ? "Go Offline"
                    : "Go Online"}
                </button>
              </div>

              {/* ACTIVE DELIVERY */}
              {loading ? (
                <div className="rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-500">
                  Loading deliveries...
                </div>
              ) : currentOrder ? (
                <button
                  onClick={() =>
                    openOrder(currentOrder)
                  }
                  className="w-full text-left"
                >
                  <div className="rounded-3xl border bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Active delivery
                        </p>

                        <h2 className="mt-1 text-lg font-bold">
                          Order #
                          {currentOrder.id}
                        </h2>
                      </div>

                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold"
                        style={{
                          backgroundColor:
                            "#E8F5EE",
                          color: GREEN,
                        }}
                      >
                        {getStatusLabel(
                          currentOrder.status
                        )}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400">
                          Customer
                        </p>

                        <p className="font-semibold">
                          {currentOrder.customer_name ||
                            "Customer"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">
                          Delivery address
                        </p>

                        <p className="font-medium">
                          {currentOrder.delivery_address ||
                            currentOrder.delivery_area ||
                            "Address unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t pt-4">
                      <span className="text-sm text-gray-500">
                        Delivery fee
                      </span>

                      <span className="font-bold">
                        {naira(
                          currentOrder.delivery_fee
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="rounded-3xl bg-gray-50 p-7 text-center">
                  <div className="mb-3 text-5xl">
                    🛵
                  </div>

                  <h2 className="font-bold">
                    No active deliveries
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    New ChopHub deliveries assigned
                    to you will appear here.
                  </p>
                </div>
              )}
            </>
          )}

          {/* DELIVERY SCREEN */}
          {screen === "delivery" &&
            currentOrder && (
              <>
                <button
                  onClick={() =>
                    setScreen("home")
                  }
                  className="mb-5 text-sm font-semibold"
                  style={{
                    color: GREEN,
                  }}
                >
                  ← Back
                </button>

                <div className="mb-5">
                  <p className="text-sm text-gray-500">
                    Delivery
                  </p>

                  <h1 className="text-2xl font-bold">
                    Order #{currentOrder.id}
                  </h1>
                </div>

                {/* STATUS */}
                <div className="mb-5 rounded-3xl bg-gray-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Current status
                  </p>

                  <p
                    className="mt-1 text-xl font-bold"
                    style={{ color: GREEN }}
                  >
                    {getStatusLabel(
                      currentOrder.status
                    )}
                  </p>
                </div>

                {/* CUSTOMER */}
                <div className="mb-4 rounded-3xl border p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Customer
                  </p>

                  <h2 className="text-xl font-bold">
                    {currentOrder.customer_name ||
                      "Customer"}
                  </h2>

                  {currentOrder.customer_phone && (
                    <button
                      onClick={() =>
                        callCustomer(
                          currentOrder
                        )
                      }
                      className="mt-3 font-semibold"
                      style={{
                        color: GREEN,
                      }}
                    >
                      📞{" "}
                      {currentOrder.customer_phone}
                    </button>
                  )}
                </div>

                {/* ADDRESS */}
                <div className="mb-4 rounded-3xl border p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Delivery address
                  </p>

                  <p className="font-semibold">
                    {currentOrder.delivery_address ||
                      "Address unavailable"}
                  </p>

                  {currentOrder.delivery_area && (
                    <p className="mt-1 text-sm text-gray-500">
                      {currentOrder.delivery_area}
                    </p>
                  )}

                  <button
                    onClick={() =>
                      openMaps(currentOrder)
                    }
                    className="mt-4 w-full rounded-2xl border py-3 font-semibold"
                    style={{
                      borderColor: GREEN,
                      color: GREEN,
                    }}
                  >
                    📍 Open in Maps
                  </button>
                </div>

                {/* ORDER VALUE */}
                <div className="mb-5 rounded-3xl border p-5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Order subtotal
                    </span>

                    <span className="font-semibold">
                      {naira(
                        currentOrder.food_subtotal ||
                          currentOrder.subtotal
                      )}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between border-t pt-3">
                    <span className="text-gray-500">
                      Delivery fee
                    </span>

                    <span
                      className="font-bold"
                      style={{
                        color: GREEN,
                      }}
                    >
                      {naira(
                        currentOrder.delivery_fee
                      )}
                    </span>
                  </div>
                </div>

                {/* ACTION */}
                {nextAction && (
                  <button
                    disabled={updating}
                    onClick={() =>
                      updateOrderStatus(
                        currentOrder,
                        nextAction.nextStatus
                      )
                    }
                    className="w-full rounded-2xl py-4 font-bold text-white shadow-sm disabled:opacity-50"
                    style={{
                      backgroundColor: GREEN,
                    }}
                  >
                    {updating
                      ? "Updating..."
                      : nextAction.label}
                  </button>
                )}

                {currentOrder.status ===
                  "delivered" && (
                  <div className="rounded-2xl bg-green-50 p-4 text-center font-semibold text-green-700">
                    ✓ Delivery completed
                  </div>
                )}
              </>
            )}

          {/* NAVIGATION */}
          {screen === "navigation" &&
            currentOrder && (
              <>
                <button
                  onClick={() =>
                    setScreen("delivery")
                  }
                  className="mb-5 text-sm font-semibold"
                  style={{
                    color: GREEN,
                  }}
                >
                  ← Back to Delivery
                </button>

                <div className="mb-5">
                  <p className="text-sm text-gray-500">
                    Navigation
                  </p>

                  <h1 className="text-2xl font-bold">
                    Deliver to customer
                  </h1>
                </div>

                {/* MAP PLACEHOLDER */}
                <div className="relative mb-5 h-80 overflow-hidden rounded-3xl bg-[#dfe9e3]">
                  <div className="absolute inset-0 opacity-30">
                    <div className="h-full w-full bg-[linear-gradient(30deg,transparent_45%,white_46%,white_48%,transparent_49%),linear-gradient(120deg,transparent_45%,white_46%,white_48%,transparent_49%)] bg-[length:80px_80px]" />
                  </div>

                  <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white text-3xl shadow-lg"
                      style={{
                        backgroundColor: GREEN,
                      }}
                    >
                      🛵
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white p-4 shadow-lg">
                    <p className="text-xs text-gray-400">
                      Destination
                    </p>

                    <p className="font-bold">
                      {currentOrder.delivery_address ||
                        currentOrder.delivery_area ||
                        "Customer address"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    openMaps(currentOrder)
                  }
                  className="mb-3 w-full rounded-2xl border py-3 font-bold"
                  style={{
                    borderColor: GREEN,
                    color: GREEN,
                  }}
                >
                  📍 Open in Google Maps
                </button>

                {getNextAction(
                  currentOrder.status
                ) && (
                  <button
                    disabled={updating}
                    onClick={() =>
                      updateOrderStatus(
                        currentOrder,
                        "delivered"
                      )
                    }
                    className="w-full rounded-2xl py-4 font-bold text-white disabled:opacity-50"
                    style={{
                      backgroundColor: GREEN,
                    }}
                  >
                    {updating
                      ? "Completing..."
                      : "I've Delivered the Order"}
                  </button>
                )}
              </>
            )}

          {/* EARNINGS */}
          {screen === "earnings" && (
            <>
              <div className="mb-5">
                <p className="text-sm text-gray-500">
                  ChopHub Rider
                </p>

                <h1 className="text-2xl font-bold">
                  Earnings
                </h1>
              </div>

              <div
                className="mb-5 rounded-3xl p-6 text-white"
                style={{
                  backgroundColor: GREEN,
                }}
              >
                <p className="text-sm opacity-80">
                  Total delivery earnings
                </p>

                <p className="mt-2 text-4xl font-bold">
                  {naira(totalEarnings)}
                </p>

                <p className="mt-2 text-sm opacity-80">
                  {completedOrders.length} completed
                  deliveries
                </p>
              </div>

              <div className="rounded-3xl border p-5">
                <h2 className="font-bold">
                  Delivery history
                </h2>

                {completedOrders.length ===
                0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    No completed deliveries yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {completedOrders.map(
                      (order) => (
                        <div
                          key={String(
                            order.id
                          )}
                          className="flex items-center justify-between border-b pb-3 last:border-0"
                        >
                          <div>
                            <p className="font-semibold">
                              Order #
                              {order.id}
                            </p>

                            <p className="text-xs text-gray-500">
                              {
                                order.customer_name
                              }
                            </p>
                          </div>

                          <p
                            className="font-bold"
                            style={{
                              color: GREEN,
                            }}
                          >
                            {naira(
                              order.delivery_fee
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* BOTTOM NAV */}
        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 border-t bg-white px-4 py-3">
          <button
            onClick={() =>
              setScreen("home")
            }
            className="flex flex-1 flex-col items-center gap-1 text-xs font-semibold"
            style={{
              color:
                screen === "home"
                  ? GREEN
                  : "#9ca3af",
            }}
          >
            <span className="text-xl">
              🏠
            </span>
            Home
          </button>

          <button
            onClick={() => {
              if (currentOrder) {
                setScreen("delivery");
              }
            }}
            className="flex flex-1 flex-col items-center gap-1 text-xs font-semibold"
            style={{
              color:
                screen === "delivery" ||
                screen === "navigation"
                  ? GREEN
                  : "#9ca3af",
            }}
          >
            <span className="text-xl">
              🛵
            </span>
            Delivery
          </button>

          <button
            onClick={() =>
              setScreen("earnings")
            }
            className="flex flex-1 flex-col items-center gap-1 text-xs font-semibold"
            style={{
              color:
                screen === "earnings"
                  ? GREEN
                  : "#9ca3af",
            }}
          >
            <span className="text-xl">
              ₦
            </span>
            Earnings
          </button>
        </nav>
      </div>
    </main>
  );
}

function RiderAccess({ onSignedIn }: { onSignedIn: (rider: RiderIdentity) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [baseArea, setBaseArea] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(mode === "signup" ? "/api/rider/signup" : "/api/rider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { name, phone, baseArea, password } : { phone, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not complete that request.");
      if (mode === "signup") {
        setPending(true);
      } else {
        onSignedIn(result.rider as RiderIdentity);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not complete that request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#dcf4e3,transparent_55%),#f5f8f2] px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-950/10 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-xl font-black text-white">C</div>
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">ChopHub</p><p className="text-sm font-medium text-slate-500">Rider portal</p></div>
        </div>
        {pending ? (
          <div role="status" className="rounded-2xl bg-emerald-50 p-5 text-emerald-950">
            <p className="text-lg font-bold">Application received</p>
            <p className="mt-2 text-sm leading-6 text-emerald-900">Your rider account is pending ChopHub approval. You can sign in after an admin approves your account.</p>
            <button type="button" onClick={() => { setPending(false); setMode("signin"); setPassword(""); }} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Back to sign in</button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{mode === "signup" ? "Join the rider team" : "Welcome back"}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{mode === "signup" ? "Create a rider account. ChopHub will review your details before you can access deliveries." : "Sign in to view and manage the deliveries assigned to you."}</p>
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <form onSubmit={submit} className="mt-5 space-y-3">
              {mode === "signup" && <>
                <label className="block text-sm font-semibold text-slate-700">Full name<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
                <label className="block text-sm font-semibold text-slate-700">Base area<input autoComplete="address-level2" value={baseArea} onChange={(event) => setBaseArea(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" placeholder="e.g. Calabar South" /></label>
              </>}
              <label className="block text-sm font-semibold text-slate-700">Phone number<input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
              <label className="block text-sm font-semibold text-slate-700">Password<input required type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 10 : 1} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" />{mode === "signup" && <span className="mt-1 block text-xs font-normal text-slate-500">Use at least 10 characters.</span>}</label>
              <button type="submit" disabled={busy} className="mt-2 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:opacity-60">{busy ? "Please wait…" : mode === "signup" ? "Create rider account" : "Sign in"}</button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-600">{mode === "signup" ? "Already have an account?" : "New to the rider team?"}{" "}<button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }} className="font-bold text-emerald-800 hover:underline">{mode === "signup" ? "Sign in" : "Sign up"}</button></p>
          </>
        )}
      </section>
    </main>
  );
}

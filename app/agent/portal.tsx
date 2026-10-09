"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type OrderStatus = "new" | "vendor_confirmation" | "vendors_confirmed" | "rider_assigned" | "pickup_in_progress" | "items_collected" | "out_for_delivery" | "delivered" | "exception" | "cancelled";
type OrderEvent = { id: number; event_type: string; note: string; created_at: string };
type OrderItem = { id: number; product_name?: string; meal_name?: string; quantity: number };
type PickupVendor = { id: number; name: string; address?: string; itemIds?: string[] };
type DispatchOrder = {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address?: string;
  delivery_area: string;
  pickup_vendors?: PickupVendor[];
  status: OrderStatus;
  rider_id?: number;
  rider_name?: string;
  rider_phone?: string;
  payment_status?: string | null;
  attention_reason?: string;
  created_at: string;
  items?: OrderItem[];
  events?: OrderEvent[];
};
type Rider = { id: number; name: string; phone: string; base_area: string; availability: "available" | "busy" | "offline" };
type Vendor = { id: number; name: string; phone: string; address: string };
type BoardView = "active" | "completed";

async function fetchDispatchBoard() {
  const [ordersResponse, ridersResponse, vendorsResponse] = await Promise.all([
    fetch("/api/orders", { cache: "no-store" }),
    fetch("/api/agent/riders", { cache: "no-store" }),
    fetch("/api/agent/vendors", { cache: "no-store" }),
  ]);
  if ([ordersResponse, ridersResponse, vendorsResponse].some((response) => response.status === 401)) {
    throw new Error("Your staff session has expired. Sign in again.");
  }
  if (!ordersResponse.ok || !ridersResponse.ok || !vendorsResponse.ok) throw new Error("Operations data could not be loaded. Refresh to try again.");
  const [orders, riders, vendors] = await Promise.all([
    ordersResponse.json() as Promise<DispatchOrder[]>,
    ridersResponse.json() as Promise<Rider[]>,
    vendorsResponse.json() as Promise<Vendor[]>,
  ]);
  return { orders, riders, vendors };
}

const statusNames: Record<OrderStatus, string> = {
  new: "New", vendor_confirmation: "Vendor calls", vendors_confirmed: "Vendors confirmed",
  rider_assigned: "Rider assigned", pickup_in_progress: "Pickup in progress", items_collected: "Items collected",
  out_for_delivery: "Out for delivery", delivered: "Delivered", exception: "Needs attention", cancelled: "Cancelled",
};

export default function AgentPortal() {
  const router = useRouter();
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [view, setView] = useState<BoardView>("active");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadBoard = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const board = await fetchDispatchBoard();
      setError("");
      setOrders(board.orders);
      setRiders(board.riders);
      setVendors(board.vendors);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Operations data could not be loaded.";
      if (message === "Your staff session has expired. Sign in again.") router.refresh();
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isCurrent = true;
    fetchDispatchBoard().then((board) => {
      if (!isCurrent) return;
      setOrders(board.orders);
      setRiders(board.riders);
      setVendors(board.vendors);
    }).catch((loadError: unknown) => {
      if (!isCurrent) return;
      const message = loadError instanceof Error ? loadError.message : "Operations data could not be loaded.";
      if (message === "Your staff session has expired. Sign in again.") window.location.reload();
      setError(message);
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });
    return () => { isCurrent = false; };
  }, []);

  const dispatchOrders = orders.filter((order) => view === "completed" ? order.status === "delivered" : order.status !== "delivered" && order.status !== "cancelled");
  const visibleOrders = dispatchOrders.filter((order) => {
    const text = `${order.id} ${order.customer_name} ${order.customer_phone} ${order.delivery_area} ${order.pickup_vendors?.map((vendor) => vendor.name).join(" ") || ""}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });
  const unpaidCount = orders.filter((order) => order.payment_status && order.payment_status !== "paid" && order.status !== "delivered").length;

  const updateOrder = async (order: DispatchOrder, fields: { status?: OrderStatus; riderId?: number }, eventType: string, note: string) => {
    setSavingOrderId(order.id);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, ...fields, eventType, note }),
      });
      const result = await response.json() as { error?: string; order?: Partial<DispatchOrder>; event?: OrderEvent; assignmentEvent?: OrderEvent };
      if (!response.ok) throw new Error(result.error || "That dispatch update could not be saved.");
      setOrders((current) => current.map((item) => item.id === order.id ? {
        ...item,
        ...(result.order || {}),
        status: fields.status || (fields.riderId ? "rider_assigned" : item.status),
        events: [result.event, result.assignmentEvent, ...(item.events || [])].filter((event): event is OrderEvent => Boolean(event)),
      } : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "That dispatch update could not be saved.");
    } finally {
      setSavingOrderId(null);
    }
  };

  const signOut = async () => {
    await fetch("/api/agent/logout", { method: "POST" });
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#f4f7f2] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">ChopHub · Staff</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Dispatch desk</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void loadBoard(true)} disabled={isRefreshing} aria-label="Refresh orders" title="Refresh orders" className="min-h-10 border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" onClick={signOut} className="min-h-10 border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50">Sign out</button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-2 border-y border-slate-200 bg-white sm:grid-cols-4">
          <Metric label="Active orders" value={orders.filter((order) => order.status !== "delivered" && order.status !== "cancelled").length} />
          <Metric label="Awaiting vendor calls" value={orders.filter((order) => order.status === "new" || order.status === "vendor_confirmation").length} />
          <Metric label="Need a rider" value={orders.filter((order) => !order.rider_id && order.status !== "delivered" && order.status !== "cancelled").length} />
          <Metric label="Payment hold" value={unpaidCount} alert={unpaidCount > 0} />
        </div>

        <div className="mt-6 flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold">Order coordination</h2>
            <p className="mt-1 text-sm text-slate-600">Vendor and rider handoffs, in one queue.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex border border-slate-300 bg-white p-1" role="group" aria-label="Order view">
              <button type="button" onClick={() => setView("active")} aria-pressed={view === "active"} className={`px-3 py-2 text-sm font-semibold ${view === "active" ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Active</button>
              <button type="button" onClick={() => setView("completed")} aria-pressed={view === "completed"} className={`px-3 py-2 text-sm font-semibold ${view === "completed" ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Delivered</button>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer, area" aria-label="Search orders" className="min-h-10 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 sm:w-64" />
          </div>
        </div>

        {error && <p role="alert" className="mt-4 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>}
        {isLoading ? <p className="py-12 text-center text-sm text-slate-500">Loading dispatch board...</p> : visibleOrders.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">{query ? "No orders match that search." : view === "completed" ? "No delivered orders yet." : "No active orders."}</p> : (
          <div className="mt-4 space-y-3">
            {visibleOrders.map((order) => <OrderCard key={order.id} order={order} riders={riders} vendors={vendors} isSaving={savingOrderId === order.id} onUpdate={updateOrder} />)}
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return <div className="border-r border-slate-200 px-4 py-4 last:border-r-0 sm:px-5"><p className={`text-2xl font-bold tabular-nums ${alert ? "text-amber-700" : "text-slate-900"}`}>{value}</p><p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{label}</p></div>;
}

function OrderCard({ order, riders, vendors, isSaving, onUpdate }: { order: DispatchOrder; riders: Rider[]; vendors: Vendor[]; isSaving: boolean; onUpdate: (order: DispatchOrder, fields: { status?: OrderStatus; riderId?: number }, eventType: string, note: string) => void }) {
  const paymentHold = Boolean(order.payment_status && order.payment_status !== "paid");
  const availableRiders = riders.filter((rider) => rider.availability === "available" || rider.id === order.rider_id);
  const runStatus = (status: OrderStatus, eventType: string, note: string) => onUpdate(order, { status }, eventType, note);

  return (
    <article className="border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Order #{order.id}</p>
          <h3 className="mt-1 text-lg font-bold">{order.customer_name || "Customer"}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{order.delivery_area} · {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <span className="border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">{statusNames[order.status] || order.status}</span>
      </div>

      {paymentHold && <p className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 sm:px-5">Fulfilment paused until payment is confirmed by an administrator.</p>}

      <div className="grid gap-5 px-4 py-4 sm:px-5 lg:grid-cols-[1fr_1fr_0.9fr]">
        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer & drop-off</h4>
          <p className="mt-2 text-sm font-semibold">{order.customer_phone || "No phone provided"}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{order.delivery_address || order.delivery_area}</p>
          {order.customer_phone && <a href={`tel:${order.customer_phone}`} className="mt-3 inline-flex min-h-9 items-center border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Call customer</a>}
          {order.items?.length ? <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-700">{order.items.map((item) => <li key={item.id}>{item.product_name || item.meal_name || "Order item"} <span className="text-slate-500">× {item.quantity}</span></li>)}</ul> : null}
        </section>

        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Vendor pickups</h4>
          {order.pickup_vendors?.length ? <ul className="mt-2 divide-y divide-slate-100">{order.pickup_vendors.map((pickup) => {
            const vendor = vendors.find((item) => item.id === pickup.id);
            const phone = vendor?.phone;
            return <li key={pickup.id} className="py-2 first:pt-0"><p className="text-sm font-semibold">{pickup.name || vendor?.name || `Vendor #${pickup.id}`}</p><p className="mt-0.5 text-xs text-slate-500">{pickup.address || vendor?.address || "Address not listed"}</p>{phone && <a href={`tel:${phone}`} className="mt-1 inline-block text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2">Call {phone}</a>}</li>;
          })}</ul> : <p className="mt-2 text-sm text-slate-500">No vendor pickup details on this order.</p>}
        </section>

        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Rider handoff</h4>
          {order.rider_name && <p className="mt-2 text-sm font-semibold">{order.rider_name}{order.rider_phone ? ` · ${order.rider_phone}` : ""}</p>}
          <label className="mt-2 block text-xs font-semibold text-slate-600">Assign approved, available rider
            <select value={order.rider_id ?? ""} disabled={paymentHold || isSaving || availableRiders.length === 0} onChange={(event) => {
              const rider = availableRiders.find((item) => item.id === Number(event.target.value));
              if (rider) onUpdate(order, { riderId: rider.id }, "rider_assigned", `${rider.name} (${rider.phone}) was assigned to this order.`);
            }} className="mt-1 block min-h-10 w-full border border-slate-300 bg-white px-2 text-sm text-slate-900 disabled:bg-slate-100">
              <option value="">{availableRiders.length ? "Select rider" : "No available riders"}</option>
              {availableRiders.map((rider) => <option key={rider.id} value={rider.id}>{rider.name} · {rider.base_area || "No area"}</option>)}
            </select>
          </label>
          {order.rider_phone && <a href={`tel:${order.rider_phone}`} className="mt-2 inline-block text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2">Call rider</a>}
        </section>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
        {order.status === "new" && <ActionButton disabled={paymentHold || isSaving} onClick={() => runStatus("vendor_confirmation", "vendor_call_needed", "Vendor confirmation required")}>Start vendor calls</ActionButton>}
        {(order.status === "vendor_confirmation" || order.status === "new") && <ActionButton tone="secondary" disabled={paymentHold || isSaving} onClick={() => runStatus("vendors_confirmed", "vendors_confirmed", "All required items confirmed by vendors")}>Confirm vendors</ActionButton>}
        {(order.status === "vendors_confirmed" || order.status === "rider_assigned") && <ActionButton tone="secondary" disabled={paymentHold || isSaving || !order.rider_id} onClick={() => runStatus("pickup_in_progress", "pickup_started", "Rider started vendor pickups")}>Start pickup</ActionButton>}
        {order.status === "pickup_in_progress" && <ActionButton tone="secondary" disabled={paymentHold || isSaving} onClick={() => runStatus("items_collected", "items_collected", "All items collected from vendors")}>Items collected</ActionButton>}
        {order.status === "items_collected" && <ActionButton disabled={paymentHold || isSaving} onClick={() => runStatus("out_for_delivery", "out_for_delivery", "Rider is heading to the customer")}>Start delivery</ActionButton>}
        {order.status === "out_for_delivery" && <ActionButton disabled={isSaving} onClick={() => runStatus("delivered", "delivered", "Order delivered to the customer")}>Mark delivered</ActionButton>}
        {isSaving && <span className="self-center text-xs text-slate-500">Saving update...</span>}
      </div>

      {order.events?.length ? <details className="border-t border-slate-100 px-4 py-3 sm:px-5"><summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-500">Recent activity ({order.events.length})</summary><ul className="mt-2 space-y-1">{order.events.slice(0, 5).map((event) => <li key={event.id} className="text-xs text-slate-600">{new Date(event.created_at).toLocaleString()} · {event.note || event.event_type}</li>)}</ul></details> : null}
    </article>
  );
}

function ActionButton({ children, disabled, onClick, tone = "primary" }: { children: React.ReactNode; disabled: boolean; onClick: () => void; tone?: "primary" | "secondary" }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`min-h-9 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${tone === "primary" ? "bg-emerald-700 text-white hover:bg-emerald-800" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>;
}
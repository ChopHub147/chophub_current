"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Order = {
  id: number;
  customer_name?: string;
  customer_phone?: string;
  delivery_area?: string;
  delivery_address?: string;
  food_subtotal?: number;
  subtotal?: number;
  status?: string;
  delivery_status?: string;
  rider_id?: number | null;
  rider_name?: string | null;
};

export default function RiderOrderPage() {
  const params = useParams();
  const id = params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      try {
        const response = await fetch(`/api/rider/orders/${id}`);

        if (!response.ok) {
          throw new Error("Could not load order");
        }

        const data = (await response.json()) as Order;
        setOrder(data);
      } catch (error) {
        console.error(error);
        setError("Could not load this delivery.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadOrder();
    }
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6">
          Loading delivery...
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 text-red-700">
          {error || "Order not found."}
        </div>
      </main>
    );
  }

  const total = order.food_subtotal ?? order.subtotal ?? 0;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <a
          href="/rider"
          className="text-sm font-semibold text-green-700"
        >
          ← Back to deliveries
        </a>

        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">
                Order #{order.id}
              </p>

              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                {order.customer_name}
              </h1>
            </div>

            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
              {order.status || "new"}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500">Customer phone</p>
              <p className="font-semibold text-gray-900">
                {order.customer_phone}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Delivery area</p>
              <p className="font-semibold text-gray-900">
                {order.delivery_area}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Delivery address</p>
              <p className="font-semibold text-gray-900">
                {order.delivery_address}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500">Order total</p>
              <p className="text-2xl font-bold text-gray-900">
                ₦{total.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white">
              Confirm pickup
            </button>

            <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white">
              Start delivery
            </button>

            <button className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white">
              Mark as delivered
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
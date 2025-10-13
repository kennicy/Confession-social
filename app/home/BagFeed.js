"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";
import { ShoppingBag, Loader2, Trash2 } from "lucide-react";

export default function BagFeed() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Lấy user ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  // --- Lấy danh sách item ---
  useEffect(() => {
    if (!user) return;

    const fetchItems = async () => {
      const { data, error } = await supabase
        .from("bag_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setItems(data);
      setLoading(false);
    };

    fetchItems();

    // Realtime cập nhật
    const channel = supabase
      .channel("realtime:bag_items")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bag_items" },
        (payload) => {
          if (payload.new.user_id === user.id) {
            setItems((prev) => [payload.new, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "bag_items" },
        (payload) => {
          setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  // --- Xoá item ---
  const handleRemove = async (id) => {
    if (!confirm("Remove this item from your bag?")) return;
    await supabase.from("bag_items").delete().eq("id", id);
  };

  // --- Loading ---
  if (!user)
    return (
      <div className="text-center text-gray-400 mt-20 text-lg">
        Please log in to view your bag.
      </div>
    );

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center mt-24 text-gray-400">
        <Loader2 className="animate-spin mb-3" size={28} />
        <p>Loading your bag...</p>
      </div>
    );

  // --- Giao diện chính ---
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShoppingBag className="text-cyan-400" size={30} />
          Your Bag
        </h1>
        <p className="text-gray-400 text-sm">
          {items.length} item{items.length !== 1 && "s"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center text-gray-500 mt-16">
          <ShoppingBag size={60} className="mx-auto mb-4 text-gray-600" />
          <p className="text-lg">Your bag is empty.</p>
          <p className="text-sm text-gray-600 mt-1">
            Buy something from the market to see it here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-[#111] border border-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-[#1b1b1b] flex items-center justify-center text-gray-600">
                    No Image
                  </div>
                )}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-2 rounded-full text-gray-300 hover:text-red-400 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-100 truncate">
                  {item.name}
                </h2>
                <p className="text-cyan-400 font-medium mt-1">
                  ${item.price?.toFixed(2) ?? "0.00"}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Added {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

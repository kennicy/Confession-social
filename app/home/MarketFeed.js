"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, Search } from "lucide-react";

/**
 * MarketFeed - Dark / "forbidden" marketplace UI
 * - Expanded category list (mysterious / exotic / forbidden-themed)
 * - Sidebar category filter (single-select)
 * - Add product modal with category dropdown
 * - Realtime Supabase updates, image upload, delete for owner
 *
 * Note: keep Supabase table `products` fields: id, user_id, name, price, category, image_url, created_at
 */

export default function MarketFeed() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    imageFile: null,
    imagePreview: null,
  });

  // --- VERY large category list: mysterious / forbidden / bizarre ---
  const CATEGORIES = [
    "Forbidden Alchemy",
    "Phantom Narcotics",
    "Spectral Weapons",
    "Bloodbound Relics",
    "Cursed Tomes",
    "Void Artifacts",
    "Eldritch Statues",
    "Black Market Tech",
    "Neon Contraband",
    "Shadow Familiars",
    "Miniature Leviathans",
    "Witching Potions",
    "Time-lost Trinkets",
    "Quantum Parasites",
    "Dream Inhalers",
    "Ghost Codes",
    "Illegal Charms",
    "Rogue A.I. Cores",
    "Dark Matter Samples",
    "Forbidden Tattoos (stencils)",
    "Banned Sigils",
    "Underground Currency",
    "Bloodstone Jewels",
    "Sealed Phials",
    "Oneiric Seeds",
    "Starborne Shards",
    "Smuggled Memories",
    "Eclipse Fabrics",
    "Mirrorborne Mirrors",
    "Hidden Door Keys",
    "Nocturne Instruments",
    "Wraith Components",
    "Hush Devices",
    "Forbidden Flavors",
    "Cloak Modules",
    "Black-ops Gadgets",
    "Illegal Augment Kits",
    "Ritual Kits (prop)",
    "Meme Contraband",
  ];

  // Price formatting / parsing (EN)
  const formatPrice = (value) => {
    if (value === null || value === undefined || value === "") return "";
    return new Intl.NumberFormat("en-US").format(value);
  };
  const parsePrice = (value) => value.replace(/,/g, "");

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
    });
  }, []);

  // Fetch products + realtime subscribe
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error("Fetch products error:", error);
      else setProducts(data || []);
    };
    fetchProducts();

    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products" },
        (payload) => setProducts((prev) => [payload.new, ...prev])
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "products" },
        (payload) =>
          setProducts((prev) => prev.filter((p) => p.id !== payload.old.id))
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Upload image to Supabase storage (same bucket "product-images")
  const uploadImage = async (file) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);

    if (error) {
      console.error("Image upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  // Add new product
  const handleAddProduct = async () => {
    if (!user) return console.error("Not logged in");
    if (!formData.name) return console.error("Product name required");
    if (!formData.category) return console.error("Category required");

    const priceNumber = parseFloat(parsePrice(formData.price));
    if (isNaN(priceNumber)) return console.error("Invalid price");

    let imageUrl = null;
    if (formData.imageFile) {
      imageUrl = await uploadImage(formData.imageFile);
      if (!imageUrl) return console.error("Image upload failed");
    }

    try {
      const { data, error } = await supabase.from("products").insert({
        user_id: user.id,
        name: formData.name,
        price: priceNumber,
        category: formData.category,
        image_url: imageUrl,
      });

      if (error) {
        console.error("Add product error:", error);
        return;
      }

      setShowForm(false);
      setFormData({
        name: "",
        price: "",
        category: "",
        imageFile: null,
        imagePreview: null,
      });
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  // Delete product
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete.id);
      if (error) console.error("Delete product error:", error);
    } catch (err) {
      console.error("Unexpected error on delete:", err);
    }
    setShowDeletePopup(false);
    setProductToDelete(null);
  };

  // Filter + search logic
  const visibleProducts = products
    .filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
      );
    });

  return (
    <div className="p-6 max-w-8xl mx-auto bg-gradient-to-b from-black via-[#060606] to-[#07050b] text-gray-100 min-h-screen">
      {/* Top header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">🕯️ The Forbidden Bazaar</h1>
          <p className="text-sm text-gray-400 mt-1">For entertainment only — this market sells imaginary & forbidden curiosities.</p>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative">
            <input
              placeholder="Search items or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2 rounded-xl bg-[#0b0b0d] border border-gray-800 text-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-700"
            />
          </div>

          {user ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 text-white px-4 py-2 rounded-xl shadow-lg transform hover:scale-105 transition"
            >
              <Plus size={16} /> Add Item
            </button>
          ) : (
            <div className="text-sm text-gray-500 italic">Log in to add items</div>
          )}
        </div>
      </div>

      {/* Layout: Sidebar + Main */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-50 bg-gradient-to-b from-[#070608] to-[#0b0b0f] border border-gray-800 p-4 rounded-2xl shadow-inner">
          <h2 className="text-lg font-semibold mb-2">Categories</h2>
          <div className="text-xs text-gray-500 mb-3">Click a tag to filter items.</div>

          <div className="flex flex-col gap-1">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(active ? null : cat)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition text-left ${
                    active
                      ? "bg-gradient-to-r from-[#2b076e] via-[#5b21b6] to-[#0ea5e9] text-white shadow-md"
                      : "bg-[#0a0a0c] text-gray-300 hover:bg-[#0f0f12]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery("");
              }}
              className="w-full text-xs px-3 py-1 rounded-lg bg-[#0c0c0e] text-gray-400 hover:bg-[#111113]"
            >
              Reset filters
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-600 italic">
            Fictional & forbidden items only.
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {visibleProducts.length === 0 ? (
            <div className="bg-[#070709] border border-gray-800 rounded-2xl p-8 text-center">
              <p className="text-gray-400">No items found.</p>
              <p className="text-sm text-gray-500 mt-2">Try another category or adjust the search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {visibleProducts.map((p) => (
                  <motion.article
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-[#0b0b0d] border border-gray-800 rounded-xl p-4 relative group shadow-lg"
                  >
                    {user?.id === p.user_id && (
                      <button
                        onClick={() => {
                          setProductToDelete(p);
                          setShowDeletePopup(true);
                        }}
                        className="absolute top-3 right-3 text-red-400 bg-[#080707] p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    {p.image_url ? (
                      <div className="w-full h-44 rounded-md overflow-hidden mb-3 bg-black">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-44 rounded-md mb-3 bg-gradient-to-br from-[#07070a] to-[#0f0f12] flex items-center justify-center text-gray-600">
                        No image
                      </div>
                    )}

                    <h3 className="font-semibold text-lg">{p.name}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm text-gray-400">💰 {formatPrice(p.price)} coins</div>
                      <div className="text-xs px-2 py-1 rounded-full bg-[#08101a] text-gray-300">{p.category}</div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">Posted: {new Date(p.created_at).toLocaleString()}</div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="add-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-gradient-to-b from-[#0b0b0d] to-[#08080a] border border-gray-800 rounded-2xl p-6 shadow-2xl relative"
            >
              <button className="absolute top-4 right-4 text-gray-400" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>

              <h2 className="text-xl font-bold mb-2">Add New Item</h2>
              <p className="text-xs text-gray-500 mb-4">Pick a mysterious category — the darker, the better.</p>

              <input
                type="text"
                placeholder="Item name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full mb-3 p-2 rounded-lg bg-[#070708] border border-gray-800 text-gray-200 outline-none"
              />

              <input
                type="text"
                placeholder="Price (coins)"
                value={formData.price}
                onChange={(e) => {
                  const raw = parsePrice(e.target.value);
                  if (raw === "" || !isNaN(raw)) {
                    setFormData({ ...formData, price: formatPrice(raw) });
                  }
                }}
                className="w-full mb-3 p-2 rounded-lg bg-[#070708] border border-gray-800 text-gray-200 outline-none"
              />

              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full mb-3 p-2 rounded-lg bg-[#070708] border border-gray-800 text-gray-200 outline-none"
              >
                <option value="">-- Select category --</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* image */}
              {!formData.imagePreview ? (
                <label className="block border-2 border-dashed border-gray-700 rounded-lg p-4 text-center mb-3 cursor-pointer hover:bg-[#0b0b0f] text-gray-400">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setFormData({
                          ...formData,
                          imageFile: file,
                          imagePreview: URL.createObjectURL(file),
                        });
                      }
                    }}
                  />
                  📷 Click to attach an image (optional)
                </label>
              ) : (
                <div className="relative mb-3">
                  <img src={formData.imagePreview} alt="preview" className="w-full h-40 object-cover rounded-lg" />
                  <button
                    onClick={() => setFormData({ ...formData, imageFile: null, imagePreview: null })}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <button
                onClick={handleAddProduct}
                className="w-full mt-2 py-2 rounded-lg bg-gradient-to-r from-[#4c1d95] to-[#0ea5e9] text-white font-semibold hover:scale-[1.01] transition"
              >
                ✦ Publish Item
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeletePopup && productToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="w-full max-w-sm bg-[#0b0b0d] border border-gray-800 rounded-2xl p-6 text-center"
            >
              <h3 className="text-lg font-bold mb-2">Confirm deletion</h3>
              <p className="text-sm text-gray-400 mb-4">
                Are you sure you want to permanently delete <span className="font-semibold">{productToDelete.name}</span>?
              </p>

              <div className="flex justify-center gap-3">
                <button onClick={() => setShowDeletePopup(false)} className="px-4 py-2 rounded-lg border border-gray-700">
                  Cancel
                </button>
                <button onClick={confirmDeleteProduct} className="px-4 py-2 rounded-lg bg-red-600 text-white">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

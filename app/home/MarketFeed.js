"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, Search, ShoppingCart } from "lucide-react";

export default function MarketFeed() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [productToBuy, setProductToBuy] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    imageFile: null,
    imagePreview: null,
  });

  // get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  // fetch + realtime products
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setProducts(data);
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

  // upload image
  const uploadImage = async (file) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);
    if (error) {
      console.error("Image upload error:", error);
      return null;
    }
    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);
    return data?.publicUrl ?? null;
  };

  // add product
  const handleAddProduct = async () => {
    if (!user) return alert("Please log in first");
    if (!formData.name) return alert("Name required");
    if (!formData.price) return alert("Price required");

    let imageUrl = null;
    if (formData.imageFile) {
      imageUrl = await uploadImage(formData.imageFile);
      if (!imageUrl) return alert("Image upload failed");
    }

    const priceNumber = parseFloat(formData.price.replace(/,/g, ""));
    if (isNaN(priceNumber)) return alert("Invalid price");

    const { error } = await supabase.from("products").insert([
      {
        name: formData.name,
        price: priceNumber,
        image_url: imageUrl,
        user_id: user.id,
      },
    ]);
    if (error) {
      console.error("Insert error:", error);
      alert("Failed to add item");
    } else {
      setFormData({ name: "", price: "", imageFile: null, imagePreview: null });
      setShowForm(false);
    }
  };

  // delete product
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productToDelete.id);
    if (error) console.error(error);
    setShowDeletePopup(false);
    setProductToDelete(null);
  };

  // buy product
  const handleBuyProduct = (product) => {
    setProductToBuy(product);
  };

  const confirmBuyProduct = async () => {
    if (!productToBuy || !user) return;

    // thêm vào túi đồ user (bag_items)
    const { error: addError } = await supabase.from("bag_items").insert([
      {
        name: productToBuy.name,
        price: productToBuy.price,
        image_url: productToBuy.image_url,
        user_id: user.id,
      },
    ]);

    if (addError) {
      console.error(addError);
      alert("❌ Failed to add to your bag!");
      return;
    }

    // xoá khỏi market
    const { error: delError } = await supabase
      .from("products")
      .delete()
      .eq("id", productToBuy.id);

    if (delError) {
      console.error(delError);
      alert("⚠️ Added to bag but failed to remove from market!");
    } else {
      alert(`✅ You bought "${productToBuy.name}" successfully!`);
    }

    setProductToBuy(null);
  };

  return (
    <div className="p-6 max-w-8xl mx-auto bg-gradient-to-b from-black via-[#060606] to-[#07050b] text-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            ⚖️ The Forbidden Market
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Trade, buy, and sell your mysterious items.
          </p>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative">
            <input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2 rounded-xl bg-[#0b0b0d] border border-gray-800 text-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-700"
            />
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
          </div>

          {user ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 text-white px-4 py-2 rounded-xl shadow-lg hover:scale-105 transition"
            >
              <Plus size={16} /> Add Item
            </button>
          ) : (
            <div className="text-sm text-gray-500 italic">
              Log in to add items
            </div>
          )}
        </div>
      </div>

      {/* Product list */}
      {products.length === 0 ? (
        <div className="bg-[#070709] border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-400">No items found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products
            .filter((p) =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((p) => (
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
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-44 rounded-md mb-3 bg-gradient-to-br from-[#07070a] to-[#0f0f12] flex items-center justify-center text-gray-600">
                    No image
                  </div>
                )}

                <h3 className="font-semibold text-lg">{p.name}</h3>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    💰 {p.price.toLocaleString()} coins
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>

                {user && user.id !== p.user_id && (
                  <button
                    onClick={() => handleBuyProduct(p)}
                    className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition"
                  >
                    <ShoppingCart size={16} /> Buy
                  </button>
                )}
              </motion.article>
            ))}
        </div>
      )}

      {/* Add Modal */}
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
              <button
                className="absolute top-4 right-4 text-gray-400"
                onClick={() => setShowForm(false)}
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-bold mb-2">Add New Item</h2>
              <p className="text-xs text-gray-500 mb-4">
                Upload your creation to the market.
              </p>

              <input
                type="text"
                placeholder="Item name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full mb-3 p-2 rounded-lg bg-[#070708] border border-gray-800 text-gray-200 outline-none"
              />

              <input
                type="text"
                placeholder="Price (coins)"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className="w-full mb-3 p-2 rounded-lg bg-[#070708] border border-gray-800 text-gray-200 outline-none"
              />

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
                  📷 Click to attach an image
                </label>
              ) : (
                <div className="relative mb-3">
                  <img
                    src={formData.imagePreview}
                    alt="preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        imageFile: null,
                        imagePreview: null,
                      })
                    }
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

      {/* Delete confirm */}
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
                Are you sure you want to delete{" "}
                <span className="font-semibold">{productToDelete.name}</span>?
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowDeletePopup(false)}
                  className="px-4 py-2 rounded-lg border border-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProduct}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy confirm */}
      <AnimatePresence>
        {productToBuy && (
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
              <h3 className="text-lg font-bold mb-2">Confirm Purchase</h3>
              <p className="text-sm text-gray-400 mb-4">
                Buy{" "}
                <span className="font-semibold text-white">
                  {productToBuy.name}
                </span>{" "}
                for{" "}
                <span className="font-semibold text-green-400">
                  {productToBuy.price.toLocaleString()} coins
                </span>
                ?
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setProductToBuy(null)}
                  className="px-4 py-2 rounded-lg border border-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBuyProduct}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

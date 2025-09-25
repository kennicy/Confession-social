"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";

export default function MarketFeed() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    imageFile: null,
    imagePreview: null,
  });

  // Format number với dấu chấm
  const formatPrice = (value) => {
    if (!value) return "";
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  // Parse giá từ string về number
  const parsePrice = (value) => value.replace(/\./g, "");

  // Lấy user hiện tại
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
    });
  }, []);

  // Lấy sản phẩm + realtime
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error("Lỗi fetch products:", error);
      else setProducts(data);
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

  // Upload ảnh
  const uploadImage = async (file) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);

    if (error) {
      console.error("Lỗi upload ảnh:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  // Thêm sản phẩm
  const handleAddProduct = async () => {
    if (!user) return console.error("Chưa đăng nhập");

    if (!formData.name) return console.error("Chưa nhập tên sản phẩm");
    const priceNumber = parseFloat(parsePrice(formData.price));
    if (isNaN(priceNumber)) return console.error("Giá sản phẩm không hợp lệ");

    let imageUrl = null;
    if (formData.imageFile) {
      imageUrl = await uploadImage(formData.imageFile);
      if (!imageUrl) return console.error("Upload ảnh thất bại");
    }

    try {
      const { data, error } = await supabase.from("products").insert({
        user_id: user.id,
        name: formData.name,
        price: priceNumber,
        image_url: imageUrl,
      });

      if (error) {
        console.error("Lỗi khi thêm sản phẩm:", error);
        return;
      }

      console.log("Thêm sản phẩm thành công:", data);
      setShowForm(false);
      setFormData({ name: "", price: "", imageFile: null, imagePreview: null });
    } catch (err) {
      console.error("Lỗi bất ngờ:", err);
    }
  };

  // Xóa sản phẩm
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete.id);
      if (error) console.error("Lỗi xóa sản phẩm:", error);
    } catch (err) {
      console.error("Lỗi bất ngờ khi xóa sản phẩm:", err);
    }
    setShowDeletePopup(false);
    setProductToDelete(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🛒 Marketplace</h1>
        {user && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl shadow hover:scale-105 transition"
          >
            <Plus size={18} /> Đăng sản phẩm
          </button>
        )}
      </div>

      {/* List sản phẩm */}
      {products.length === 0 ? (
        <p className="text-gray-500">Chưa có sản phẩm nào.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <AnimatePresence>
            {products.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-xl shadow-md p-4 relative group hover:shadow-xl transition"
              >
                {user?.id === p.user_id && (
                  <button
                    onClick={() => {
                      setProductToDelete(p);
                      setShowDeletePopup(true);
                    }}
                    className="absolute top-2 right-2 text-red-500 bg-white rounded-full p-2 shadow hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-48 object-cover rounded-md mb-3"
                  />
                )}
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="text-gray-600">💰 {formatPrice(p.price)} coin</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Popup thêm sản phẩm */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-2xl w-96 relative"
            >
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-black"
                onClick={() => setShowForm(false)}
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-semibold mb-4">Thêm sản phẩm</h2>

              <input
                type="text"
                placeholder="Tên sản phẩm"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border rounded-lg p-2 mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="Giá (VND)"
                value={formData.price}
                onChange={(e) => {
                  const raw = parsePrice(e.target.value);
                  if (!isNaN(raw)) {
                    setFormData({ ...formData, price: formatPrice(raw) });
                  }
                }}
                className="w-full border rounded-lg p-2 mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />

              {!formData.imagePreview ? (
                <label className="block border-2 border-dashed rounded-lg p-4 text-center text-gray-500 cursor-pointer hover:bg-gray-50 mb-3">
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
                  📷 Bấm để chọn ảnh sản phẩm
                </label>
              ) : (
                <div className="relative mb-3">
                  <img
                    src={formData.imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        imageFile: null,
                        imagePreview: null,
                      })
                    }
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <button
                onClick={handleAddProduct}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg shadow hover:scale-[1.02] transition"
              >
                🚀 Đăng sản phẩm
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup xác nhận xóa */}
      <AnimatePresence>
        {showDeletePopup && productToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-2xl w-96 text-center relative"
            >
              <h2 className="text-lg font-semibold mb-4">⚠️ Xác nhận xóa</h2>
              <p className="mb-6 text-gray-600">
                Bạn có chắc muốn xóa sản phẩm{" "}
                <span className="font-bold">{productToDelete.name}</span>?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowDeletePopup(false)}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDeleteProduct}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  Xóa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}

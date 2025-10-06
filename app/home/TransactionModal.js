"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function TransactionModal({ transaction, onClose, onUpdate }) {
  const [mealName, setMealName] = useState(transaction.meal_name);
  const [items, setItems] = useState(
    transaction.items.map((i) => ({ ...i, paid: i.paid || false }))
  );
  const [loading, setLoading] = useState(false);

  // ===== Cập nhật giá realtime =====
  const updateItemPrice = async (index, value) => {
    const newItems = [...items];
    newItems[index].price = value ? parseInt(value) * 1000 : "";
    setItems(newItems);

    const { error } = await supabase
      .from("transactions")
      .update({ items: newItems })
      .eq("id", transaction.id);

    if (error) console.error(error);
    else onUpdate && onUpdate(transaction.id, newItems); // gọi callback để render ngay
  };

  // ===== Cập nhật checkbox "Đã trả" realtime =====
  const toggleItemPaid = async (index) => {
    const newItems = [...items];
    newItems[index].paid = !newItems[index].paid;
    setItems(newItems);

    const { error } = await supabase
      .from("transactions")
      .update({ items: newItems })
      .eq("id", transaction.id);

    if (error) console.error(error);
    else onUpdate && onUpdate(transaction.id, newItems); // render ngay
  };

  // ===== Lưu toàn bộ bữa ăn =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("transactions")
      .update({ meal_name: mealName, items })
      .eq("id", transaction.id);

    if (error) console.error(error);
    else onUpdate && onUpdate(transaction.id, items);

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg max-w-lg w-full space-y-4 shadow-lg"
      >
        <h2 className="text-xl font-semibold mb-2">✏️ Chỉnh sửa bữa ăn</h2>

        <label className="flex flex-col text-sm">
          Tên bữa ăn
          <input
            type="text"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            className="border p-2 rounded mt-1"
          />
        </label>

        <table className="w-full border-collapse border rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border px-3 py-2 text-left">Người ăn</th>
              <th className="border px-3 py-2">Giá (nghìn ₫)</th>
              <th className="border px-3 py-2">Đã trả</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.eater}>
                <td className="border px-3 py-2">{item.eater}</td>
                <td className="border px-3 py-2 text-center">
                  <input
                    type="number"
                    placeholder="Chưa biết"
                    value={item.price ? item.price / 1000 : ""}
                    onChange={(e) => updateItemPrice(idx, e.target.value)}
                    className="w-24 border p-1 rounded text-center"
                  />
                </td>
                <td className="border px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={item.paid}
                    onChange={() => toggleItemPaid(idx)}
                    className="form-checkbox"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
}

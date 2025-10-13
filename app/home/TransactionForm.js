"use client";
import { useState } from "react";

export default function TransactionForm({ members, onAdd }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [mealName, setMealName] = useState("");
  const [items, setItems] = useState(
    members.map((m) => ({ eater: m, price: "", ate: false }))
  );

  const updateItemPrice = (index, value) => {
    const newItems = [...items];
    newItems[index].price = value ? parseInt(value) * 1000 : "";
    // Nếu nhập giá thì tự động đánh dấu đã ăn
    if (value) newItems[index].ate = true;
    setItems(newItems);
  };

  const toggleAte = (index) => {
    const newItems = [...items];
    newItems[index].ate = !newItems[index].ate;
    // Nếu bỏ tick, xóa luôn giá
    if (!newItems[index].ate) newItems[index].price = "";
    setItems(newItems);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.ate); // chỉ gửi người đã ăn
    if (!validItems.length || !mealName) return;
    onAdd(date, mealName, validItems);
    setMealName("");
    setItems(members.map((m) => ({ eater: m, price: "", ate: false })));
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-white shadow-md space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col text-sm">
          Ngày
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded mt-1"
          />
        </label>
        <label className="flex flex-col text-sm flex-1">
          Tên bữa ăn
          <input
            type="text"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="VD: Ăn phở, lẩu bò..."
            className="border p-2 rounded mt-1"
          />
        </label>
      </div>

      <table className="w-full border-collapse border rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="border px-3 py-2 text-left">Người ăn</th>
            <th className="border px-3 py-2">Đã ăn?</th>
            <th className="border px-3 py-2">Giá (nghìn ₫)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.eater}>
              <td className="border px-3 py-2">{item.eater}</td>
              <td className="border px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={item.ate}
                  onChange={() => toggleAte(idx)}
                />
              </td>
              <td className="border px-3 py-2 text-center">
                <input
                  type="number"
                  placeholder="Chưa biết"
                  value={item.price ? item.price / 1000 : ""}
                  onChange={(e) => updateItemPrice(idx, e.target.value)}
                  className="w-24 border p-1 rounded text-center"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
        >
          ➕ Thêm bữa
        </button>
      </div>
    </form>
  );
}

// TransactionList.jsx
"use client";
export default function TransactionList({ transactions, showPaid, setShowPaid, togglePaidOff, onEdit, toggleAte }) {
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">📅 Danh sách bữa ăn</h2>
        <button
          onClick={() => setShowPaid(!showPaid)}
          className="text-sm px-3 py-1 border rounded hover:bg-gray-100"
        >
          {showPaid ? "Ẩn bữa đã thanh toán" : "Hiện tất cả"}
        </button>
      </div>

      {sortedTransactions.length === 0 ? (
        <p className="text-gray-500">Chưa có bữa ăn nào</p>
      ) : (
        <div className="space-y-3">
          {sortedTransactions
            .filter((t) => showPaid || !t.paid_off)
            .map((t) => (
              <div
                key={t.id}
                className={`border rounded-lg p-4 shadow-sm cursor-pointer ${t.paid_off ? "bg-gray-100" : "bg-white"}`}
                onClick={() => onEdit(t)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {t.date} — <span className="text-blue-600 font-semibold">{t.meal_name}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Người trả: <span className="font-medium text-purple-600">{t.payer}</span>
                    </div>

                    {/* Hiển thị trạng thái từng người ăn */}
                    <div className="mt-2 space-y-1">
                      {t.items.map((i, idx) => (
                        <div key={i.eater} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!i.ate}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleAte(t.id, idx)}
                            className={`w-4 h-4 rounded ${i.ate ? "bg-green-500 checked:bg-green-500" : "bg-red-300"}`}
                          />
                          <span className="flex-1">
                            {i.eater}: {i.price ? `${i.price.toLocaleString("vi-VN")}₫` : i.ate ? "Chưa điền giá" : "Không ăn"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePaidOff(t.id, t.paid_off);
                    }}
                    className={`px-3 py-1 rounded text-sm font-medium ${t.paid_off ? "bg-green-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                  >
                    {t.paid_off ? "Đã thanh toán" : "Đánh dấu xong"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

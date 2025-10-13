"use client";
export default function Summary({ transactions, members }) {
  const debtMap = {};
  members.forEach((m) => (debtMap[m] = { ate: 0, paid: 0 }));

  transactions.forEach((t) => {
    const totalPaid = t.items.reduce((a, b) => a + (b.price || 0), 0);
    debtMap[t.payer].paid += totalPaid;
    t.items.forEach((item) => {
      if (!item.paid) debtMap[item.eater].ate += item.price || 0;
    });
  });

  const summary = members.map((m) => ({
    name: m,
    ate: debtMap[m].ate,
    paid: debtMap[m].paid,
    balance: debtMap[m].paid - debtMap[m].ate,
  }));

  // Tính ai trả ai
  const settlements = [];
  const creditors = summary.filter((s) => s.balance > 0).map((s) => ({ ...s }));
  const debtors = summary.filter((s) => s.balance < 0).map((s) => ({ ...s, balance: -s.balance }));

  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.balance, creditor.balance);
    settlements.push({ from: debtor.name, to: creditor.name, amount });
    debtor.balance -= amount;
    creditor.balance -= amount;
    if (debtor.balance === 0) i++;
    if (creditor.balance === 0) j++;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">📊 Tổng kết</h2>
      <table className="w-full border-collapse border rounded-lg overflow-hidden shadow-sm bg-white mb-4">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="border px-3 py-2 text-left">Tên</th>
            <th className="border px-3 py-2">Ăn</th>
            <th className="border px-3 py-2">Trả</th>
            <th className="border px-3 py-2">Cân bằng</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((s) => (
            <tr key={s.name} className="text-center">
              <td className="border px-3 py-2 font-medium">{s.name}</td>
              <td className="border px-3 py-2 text-gray-700">{s.ate.toLocaleString("vi-VN")}₫</td>
              <td className="border px-3 py-2 text-gray-700">{s.paid.toLocaleString("vi-VN")}₫</td>
              <td className={`border px-3 py-2 font-semibold ${s.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {s.balance.toLocaleString("vi-VN")}₫
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mb-2">💸 Thanh toán</h2>
      {settlements.length === 0 ? (
        <p className="text-gray-500">Không có khoản nợ nào</p>
      ) : (
        <ul className="space-y-1">
          {settlements.map((s, idx) => (
            <li key={idx} className="text-gray-800">
              <span className="font-medium text-red-600">{s.from}</span> cần trả{" "}
              <span className="font-medium">{s.amount.toLocaleString("vi-VN")}₫</span> cho{" "}
              <span className="font-medium text-green-600">{s.to}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

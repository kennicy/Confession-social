"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Home, User, MessageCircle, Calendar, Bell, Settings, LogOut } from "lucide-react";

// =================== MeetingVoteComponent ===================
export default function MeetingVoteComponent({ user }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form tạo meeting
  const [newTitle, setNewTitle] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDays, setSelectedDays] = useState([]);

  // Vote
  const [selectedDayPopup, setSelectedDayPopup] = useState(null);
  const [selectedDaySlots, setSelectedDaySlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);

  // -------------------- Helpers --------------------
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

  const toggleDay = (day) => {
    const dateStr = `${selectedYear}-${(selectedMonth + 1)
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    if (selectedDays.includes(dateStr)) {
      setSelectedDays(selectedDays.filter((d) => d !== dateStr));
    } else {
      setSelectedDays([...selectedDays, dateStr]);
    }
  };

  // -------------------- Fetch meetings --------------------
  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from("meetings")
      .select(`*, meeting_slots(*), votes(*)`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch meetings error:", error);
      setLoading(false);
      return;
    }

    const meetingsWithVotes = data.map((meeting) => {
      const slots = meeting.meeting_slots.map((slot) => ({
        ...slot,
        votes: meeting.votes?.filter((v) => v.meeting_time_id === slot.id) || [],
      }));
      return { ...meeting, meeting_slots: slots };
    });

    setMeetings(meetingsWithVotes);
    setLoading(false);
  };

  useEffect(() => {
    fetchMeetings();

    const sub = supabase
      .channel("public:votes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => fetchMeetings()
      )
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  // -------------------- Tạo meeting --------------------
  const createMeeting = async () => {
    if (!newTitle) return alert("Nhập title!");
    if (selectedDays.length === 0) return alert("Chọn ít nhất 1 ngày!");

    const { data: meeting, error: errMeeting } = await supabase
      .from("meetings")
      .insert({ title: newTitle, created_by: user.id })
      .select("*")
      .single();

    if (errMeeting || !meeting) return console.error("Create meeting error:", errMeeting);

    const slotsToInsert = selectedDays.map((d) => ({
      meeting_id: meeting.id,
      time_slot: new Date(d).toISOString(),
    }));

    const { error: errSlots } = await supabase.from("meeting_slots").insert(slotsToInsert);
    if (errSlots) return console.error("Create slots error:", errSlots);

    setNewTitle("");
    setSelectedDays([]);
    fetchMeetings();
  };

  // -------------------- Vote trực tiếp inline --------------------
  const toggleVoteInline = async (slotId, meeting_id) => {
    if (!user) return alert("Bạn cần đăng nhập!");

    // kiểm tra slot đã vote chưa
    const meeting = meetings.find((m) => m.id === meeting_id);
    const slot = meeting.meeting_slots.find((s) => s.id === slotId);
    const existingVote = slot.votes?.find((v) => v.user_id === user.id);

    if (existingVote) {
      // đã vote -> bỏ vote
      await supabase
        .from("votes")
        .delete()
        .eq("id", existingVote.id);
    } else {
      // thêm vote
      await supabase.from("votes").insert({
        meeting_id,
        meeting_time_id: slotId,
        user_id: user.id,
      });
    }
  };

  if (loading) return <p>Đang tải...</p>;

  // -------------------- Component grid vote --------------------
  const MeetingTimeGrid = ({ slots, selectedSlotsState, onSelectSlot }) => {
    const slotsByDate = slots.reduce((acc, slot) => {
      const date = new Date(slot.time_slot);
      const dateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${date.getFullYear()}`;
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(slot);
      return acc;
    }, {});

    const allDates = Object.keys(slotsByDate);

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `50px repeat(${allDates.length}, 1fr)`,
          gridTemplateRows: "30px repeat(24, 1fr)",
          gap: "2px",
          marginTop: "8px",
        }}
      >
        {/* Tên ngày */}
        {allDates.map((dateStr, colIdx) => (
          <div
            key={`day-${dateStr}`}
            style={{
              gridColumn: colIdx + 2,
              gridRow: 1,
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "12px",
              whiteSpace: "nowrap",
            }}
          >
            {dateStr}
          </div>
        ))}

        {/* Cột giờ */}
        {Array.from({ length: 24 }).map((_, h) => (
          <div
            key={`hour-${h}`}
            style={{
              gridColumn: 1,
              gridRow: h + 2,
              textAlign: "right",
              fontSize: "12px",
              color: "#555",
              paddingRight: "4px",
              lineHeight: "1.2",
            }}
          >
            {h}:00
          </div>
        ))}

        {/* Ô vote */}
        {allDates.map((dateStr, colIdx) => {
          const slotsForDate = slotsByDate[dateStr];
          const maxVotes = Math.max(...slotsForDate.map((s) => s.votes?.length || 0), 1);

          return Array.from({ length: 24 }).map((_, h) => {
            const slot = slotsForDate.find((s) => new Date(s.time_slot).getHours() === h);
            const slotId = slot?.id || `hour-${dateStr}-${h}`;
            const voteCount = slot?.votes?.length || 0;
            const alpha = voteCount / maxVotes * 0.8 + 0.2;
            const color = selectedSlotsState.includes(slotId)
              ? "#ffd700"
              : `rgba(30,144,255,${alpha})`;

            return (
              <div
                key={slotId}
                onClick={() => onSelectSlot(slotId, slot?.meeting_id)}
                style={{
                  gridColumn: colIdx + 2,
                  gridRow: h + 2,
                  backgroundColor: color,
                  borderRadius: "3px",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  width: "100%",
                  height: "100%",
                }}
              />
            );
          });
        })}
      </div>
    );
  };

  // -------------------- Render --------------------
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      {/* ==== FORM TẠO MEETING ==== */}
      <div
        style={{
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "12px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h3>Tạo cuộc họp mới</h3>
        <input
          type="text"
          placeholder="Title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />

        <div style={{ marginBottom: "12px" }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{ padding: "6px", borderRadius: "6px" }}
          >
            {Array.from({ length: 12 }).map((_, m) => (
              <option key={m} value={m}>
                {m + 1}/{selectedYear}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ padding: "6px", width: "80px", marginLeft: "6px", borderRadius: "6px" }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {Array.from({ length: daysInMonth(selectedMonth, selectedYear) }).map((_, idx) => {
            const day = idx + 1;
            const dateStr = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, "0")}-${day
              .toString()
              .padStart(2, "0")}`;
            const isSelected = selectedDays.includes(dateStr);
            return (
              <div
                key={day}
                onClick={() => toggleDay(day)}
                style={{
                  padding: "8px",
                  borderRadius: "6px",
                  border: isSelected ? "2px solid #1e90ff" : "1px solid #ccc",
                  backgroundColor: isSelected ? "#1e90ff" : "#fff",
                  color: isSelected ? "#fff" : "#000",
                  cursor: "pointer",
                  width: "40px",
                  textAlign: "center",
                  userSelect: "none",
                }}
              >
                {day}
              </div>
            );
          })}
        </div>

        <button
          onClick={createMeeting}
          style={{
            display: "block",
            marginTop: "12px",
            padding: "8px 16px",
            borderRadius: "8px",
            backgroundColor: "#1e90ff",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Tạo cuộc họp
        </button>
      </div>

      {/* ==== DANH SÁCH MEETINGS INLINE ==== */}
      {meetings.length === 0 && <p>Hiện chưa có cuộc họp nào.</p>}
      {meetings.map((meeting) => {
        const myVotes = meeting.meeting_slots
          .filter((slot) => slot.votes.find((v) => v.user_id === user.id))
          .map((slot) => slot.id);

        return (
          <div
            key={meeting.id}
            style={{
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              backgroundColor: "#fff",
              marginBottom: "16px",
            }}
          >
            <h4>{meeting.title}</h4>

            {/* Grid vote inline */}
            <MeetingTimeGrid
              slots={meeting.meeting_slots}
              selectedSlotsState={myVotes}
              onSelectSlot={toggleVoteInline}
            />

            {/* Nút mở popup vote */}
            <button
              onClick={() => {
                setSelectedDaySlots(meeting.meeting_slots);
                setSelectedDayPopup(
                  meeting.meeting_slots.map((s) => {
                    const date = new Date(s.time_slot);
                    return `${date.getDate().toString().padStart(2, "0")}/${(
                      date.getMonth() + 1
                    )
                      .toString()
                      .padStart(2, "0")}/${date.getFullYear()}`;
                  })
                );
                setSelectedSlots(myVotes);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: "#1e90ff",
                color: "#fff",
                cursor: "pointer",
                marginTop: "6px",
              }}
            >
              Vote (Popup)
            </button>
          </div>
        );
      })}

      {/* ==== Popup vote vẫn giữ nguyên nếu muốn ==== */}
      {selectedDayPopup && selectedDaySlots.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "16px",
              borderRadius: "12px",
              width: "750px",
              height: "90%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ textAlign: "center", marginBottom: "12px" }}>Vote thời gian</h3>
            <MeetingTimeGrid
              slots={selectedDaySlots}
              selectedSlotsState={selectedSlots}
              onSelectSlot={(slotId) => {
                setSelectedSlots((prev) =>
                  prev.includes(slotId) ? prev.filter((s) => s !== slotId) : [...prev, slotId]
                );
              }}
            />
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                onClick={() => {
                  setSelectedDayPopup(null);
                  setSelectedSlots([]);
                }}
                style={{ padding: "6px 14px", borderRadius: "6px", cursor: "pointer", backgroundColor: "#eee" }}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  for (let slotId of selectedSlots) {
                    let slot = selectedDaySlots.find((s) => s.id === slotId);
                    if (!slot) {
                      const [_, dateStr, h] = slotId.split("-");
                      const datetimeStr = `${dateStr.split("/").reverse().join("-")}T${h
                        .toString()
                        .padStart(2, "0")}:00:00`;
                      const { data: newSlot } = await supabase
                        .from("meeting_slots")
                        .insert({ meeting_id: selectedDaySlots[0]?.meeting_id, time_slot: new Date(datetimeStr).toISOString() })
                        .select("*")
                        .single();
                      slot = newSlot;
                    }
                    const existing = slot.votes?.find((v) => v.user_id === user.id);
                    if (!existing) {
                      await supabase.from("votes").insert({
                        meeting_id: slot.meeting_id,
                        meeting_time_id: slot.id,
                        user_id: user.id,
                      });
                    }
                  }
                  setSelectedDayPopup(null);
                  setSelectedSlots([]);
                  fetchMeetings();
                }}
                style={{ padding: "6px 14px", borderRadius: "6px", backgroundColor: "#1e90ff", color: "#fff", cursor: "pointer" }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
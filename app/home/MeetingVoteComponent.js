"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";

export default function MeetingVote() {
  const [userId, setUserId] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [newMeeting, setNewMeeting] = useState({ title: "", content: "", link: "" });
  const [selectedMonth, setSelectedMonth] = useState(""); 
  const [selectedYear, setSelectedYear] = useState("");   
  const [selectedDays, setSelectedDays] = useState([]);   
  const [voteModal, setVoteModal] = useState({ show: false, meeting: null, deleteMode: false });
  const [votesData, setVotesData] = useState({});

  // --- Lấy userId ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      if (!error) setUserId(profile.id);
    };
    fetchUser();
  }, []);

  // --- Load meetings + Realtime ---
  useEffect(() => {
    if (!userId) return;
    const fetchMeetings = async () => {
      const { data, error } = await supabase.from("meetings").select("*").order("created_at", { ascending: false });
      if (!error) setMeetings(data);
    };
    fetchMeetings();

    const channel = supabase
      .channel("public:meetings")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, (payload) => {
        setMeetings(prev => {
          if (payload.eventType === "INSERT") return [payload.new, ...prev];
          if (payload.eventType === "DELETE") return prev.filter(m => m.id !== payload.old.id);
          if (payload.eventType === "UPDATE") return prev.map(m => m.id === payload.new.id ? payload.new : m);
          return prev;
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  // --- Form change ---
  const handleChange = (e) => setNewMeeting(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // --- Toggle day ---
  const toggleDay = (dayNumber) => {
    if (!selectedMonth || !selectedYear) return alert("Vui lòng chọn tháng và năm trước");
    const fullDate = `${selectedYear}-${selectedMonth.padStart(2,"0")}-${dayNumber.padStart(2,"0")}`;
    setSelectedDays(prev => prev.includes(fullDate) ? prev.filter(d => d!==fullDate) : [...prev, fullDate]);
  };

  const getDaysInMonth = (month, year) => (!month || !year ? 31 : new Date(year, parseInt(month), 0).getDate());

  // --- Tạo meeting ---
  const handleCreateMeeting = async () => {
    if (!newMeeting.title || selectedDays.length === 0) 
      return alert("Vui lòng điền tên và chọn ít nhất một ngày!");
    
    const { data, error } = await supabase
      .from("meetings")
      .insert([{ ...newMeeting, days: selectedDays, created_by: userId }])
      .select()
      .single(); 

    if (error) return alert("Tạo cuộc họp thất bại: " + error.message);

    setMeetings(prev => [data, ...prev]);
    setNewMeeting({ title: "", content: "", link: "" });
    setSelectedDays([]); 
    setSelectedMonth(""); 
    setSelectedYear("");
  };

  // --- Xóa meeting ---
  const handleDeleteMeeting = async () => {
    if (!voteModal.meeting) return;

    const { error } = await supabase
      .from("meetings")
      .delete()
      .eq("id", voteModal.meeting.id)
      .eq("created_by", userId);

    if (error) {
      alert("Xóa thất bại: " + error.message);
      return;
    }

    setMeetings(prev => prev.filter(m => m.id !== voteModal.meeting.id));
    setVoteModal({ show: false, meeting: null, deleteMode: false });
  };

  // --- Mở vote modal ---
  const openVoteModal = async (meeting) => {
    setVoteModal({ show: true, meeting, deleteMode: false });

    // Lấy vote cùng user info
    const { data } = await supabase
      .from("meeting_votes")
      .select("day, hour, user_id, profiles(full_name)")
      .eq("meeting_id", meeting.id);

    const voteMap = {};
    if (data) {
      data.forEach(v => {
        const key = `${v.day}_${v.hour}`;
        voteMap[key] = voteMap[key] || { count: 0, voted: false, users: [] };
        voteMap[key].count += 1;
        voteMap[key].users.push(v.profiles?.full_name || v.user_id);
        if (v.user_id === userId) voteMap[key].voted = true; // highlight current user
      });
    }
    setVotesData(voteMap);
  };

  // --- Vote click (UI + Supabase) ---
  const handleVoteClick = async (day, hour) => {
    if (!voteModal.meeting) return;
    const key = `${day}_${hour}`;
    const current = votesData[key] || { count: 0, voted: false };

    // Cập nhật UI ngay
    setVotesData(prev => {
      const newData = { ...prev };
      newData[key] = {
        count: current.count + (current.voted ? -1 : 1),
        voted: !current.voted
      };
      return newData;
    });

    if (current.voted) {
      // xóa vote
      const { error } = await supabase
        .from("meeting_votes")
        .delete()
        .eq("meeting_id", voteModal.meeting.id)
        .eq("day", day)
        .eq("hour", hour)
        .eq("user_id", userId);

      if (error) console.error("Vote delete error:", error.message);
    } else {
      // thêm vote
      const { error } = await supabase
        .from("meeting_votes")
        .upsert(
          [{ meeting_id: voteModal.meeting.id, day, hour, user_id: userId }],
          { onConflict: ["meeting_id", "user_id", "day", "hour"] }
        );
      if (error) console.error("Vote upsert error:", error.message);
    }
  };

  // --- Realtime votes ---
  useEffect(() => {
    if (!voteModal.show || !voteModal.meeting) return;
    const meetingId = voteModal.meeting.id;

    const channel = supabase
      .channel(`vote-meeting-${meetingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_votes", filter: `meeting_id=eq.${meetingId}` },
        payload => {
          setVotesData(prev => {
            const newData = { ...prev };
            const key = `${payload.new?.day || payload.old.day}_${payload.new?.hour || payload.old.hour}`;
            const current = prev[key] || { count: 0, voted: prev[key]?.voted || false };

            if (payload.eventType === "INSERT") {
              newData[key] = { ...current, count: current.count + 1 };
            } else if (payload.eventType === "DELETE") {
              newData[key] = { ...current, count: Math.max(0, current.count - 1) };
            }

            return newData;
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // Luôn để dependency array cố định: voteModal.show + voteModal.meeting
  }, [voteModal.show, voteModal.meeting]);


  const confirmDelete = (meeting) => setVoteModal({ show: true, meeting, deleteMode: true });

return (
  <div className="p-6 max-w-7xl mx-auto space-y-8 text-gray-200 font-sans">

    {/* ================== Form tạo cuộc họp ================== */}
    <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-950 p-6 rounded-2xl shadow-2xl flex flex-col lg:flex-row gap-6">

      {/* Left: Input + Nút tạo cuộc họp */}
      <div className="flex-1 flex flex-col gap-4">
        <input 
          type="text" 
          name="title" 
          placeholder="Tên cuộc họp" 
          value={newMeeting.title} 
          onChange={handleChange} 
          className="border border-gray-700 bg-gray-900 text-gray-200 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none w-full"
        />
        <textarea 
          name="content" 
          placeholder="Nội dung cuộc họp" 
          value={newMeeting.content} 
          onChange={handleChange} 
          className="border border-gray-700 bg-gray-900 text-gray-200 p-4 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none w-full h-40 resize-y"
        />
        <input 
          type="text" 
          name="link" 
          placeholder="Link Meet" 
          value={newMeeting.link} 
          onChange={handleChange} 
          className="border border-gray-700 bg-gray-900 text-gray-200 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none w-full"
        />

        {/* Nút tạo cuộc họp */}
        <button 
          className="mt-4 bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-2xl hover:from-indigo-500 hover:to-blue-400 transition-all font-semibold w-full"
          onClick={handleCreateMeeting}
        >
          Tạo cuộc họp
        </button>
      </div>

      {/* Right: Chọn tháng/ngày */}
      <div className="flex-1 flex flex-col gap-4">
        <h3 className="font-semibold text-gray-300">Chọn tháng & năm</h3>
        <div className="flex gap-2">
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
            className="border border-gray-700 bg-gray-900 text-gray-200 p-3 rounded-xl w-1/2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            <option value="">Tháng</option>
            {Array.from({ length: 12 }, (_, i) => i+1).map(m => (
              <option key={m} value={m.toString().padStart(2,"0")}>{m}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={e => setSelectedYear(e.target.value)} 
            className="border border-gray-700 bg-gray-900 text-gray-200 p-3 rounded-xl w-1/2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            <option value="">Năm</option>
            {Array.from({ length: 3 }, (_, i) => 2025+i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <h3 className="font-semibold text-gray-300">Chọn ngày</h3>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => {
            const day = (i+1).toString().padStart(2,"0");
            const fullDate = selectedYear && selectedMonth ? `${selectedYear}-${selectedMonth}-${day}` : day;
            const selected = selectedDays.includes(fullDate);
            return (
              <button 
                key={day} 
                type="button" 
                className={`p-2 rounded-lg transition-all text-sm font-medium border ${
                  selected 
                    ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-lg border-blue-400" 
                    : "bg-gray-800 text-gray-200 border-gray-700 hover:bg-indigo-700 hover:text-white shadow-sm"
                }`} 
                onClick={() => toggleDay(day)}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

    </div>

    {/* ================== Danh sách cuộc họp ================== */}
    <div className="space-y-6">
      <h2 className="text-4xl font-bold text-gray-100 mb-6">Danh sách cuộc họp</h2>
      <div className="flex flex-col gap-6">
        {meetings.map((meeting, idx) => {
          let topDisplay = "Chưa có vote";

          if (Array.isArray(meeting.days) && votesData) {
            const totalVotePerDay = {};
            meeting.days.forEach(day => {
              let total = 0;
              for (let hour = 0; hour < 24; hour++) {
                const key = `${day}_${hour}`;
                if (votesData[key]) total += votesData[key].count;
              }
              totalVotePerDay[day] = total;
            });

            const [topDay] = Object.entries(totalVotePerDay).sort((a, b) => b[1] - a[1])[0] || [];

            if (topDay) {
              let topHour = 0, maxHourVote = 0;
              for (let hour = 0; hour < 24; hour++) {
                const key = `${topDay}_${hour}`;
                const voteCount = votesData[key]?.count || 0;
                if (voteCount > maxHourVote) {
                  maxHourVote = voteCount;
                  topHour = hour;
                }
              }
              topDisplay = `${topDay} lúc ${topHour}:00 (${maxHourVote} vote${maxHourVote > 1 ? "s" : ""})`;
            }
          }

          return (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4, ease: "easeOut" }}
              whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
              whileTap={{ scale: 0.98, backgroundColor: "#1f2937" }}
              onClick={() => openVoteModal(meeting)}
              className="bg-gray-900 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between border-l-8 border-indigo-500 p-6 gap-6 cursor-pointer transition"
            >
              {/* Left */}
              <div className="flex-1 flex flex-col gap-4">
                <h3 className="text-2xl font-bold text-white">{meeting.title}</h3>
                <p className="text-gray-300 text-lg whitespace-pre-line">{meeting.content}</p>
                {meeting.link && (
                  <div className="text-sm text-gray-400">
                    <span className="font-medium">Link Meet: </span>
                    <a
                      href={meeting.link}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="text-indigo-400 underline break-all"
                    >
                      {meeting.link}
                    </a>
                  </div>
                )}
              </div>

              {/* Right */}
              <div className="flex flex-col justify-between items-start md:items-end gap-4 md:gap-6">
                <div className="flex flex-col items-start md:items-end gap-2">
                  <span className="font-medium text-gray-400">Thời gian họp gợi ý:</span>
                  <span className="text-indigo-400 font-semibold">{topDisplay}</span>
                </div>

                <div className="flex gap-3 flex-wrap">
                  {meeting.created_by === userId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(meeting);
                      }}
                      className="bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 font-semibold"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
    
  </div>
  );
}

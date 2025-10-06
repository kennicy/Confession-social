"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { addDays } from "date-fns";
import { supabase } from "../../lib/supabaseClient";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";

export default function CalendarComponent() {
  const [userId, setUserId] = useState(null);
  const [text, setText] = useState("");
  const [events, setEvents] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [visibleWeek, setVisibleWeek] = useState(0);
  const calendarRef = useRef(null);
  const [popupMsg, setPopupMsg] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const totalWeeks = 16;
  const hkStartDate = new Date(2025, 7, 25);
  const dayMap = { "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6 };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
    };
    fetchUser();
  }, []);

  const getVNDate = (date) => new Date(date.getTime() + 7 * 60 * 60 * 1000);

  const getWeekStart = (date) => {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0,0,0,0);
    return weekStart;
  };

  const getCurrentWeek = () => {
    const todayVN = getVNDate(new Date());
    const weekStart = getWeekStart(todayVN);
    const diffWeeks = Math.floor((weekStart - hkStartDate) / (7 * 24 * 60 * 60 * 1000));
    return 35 + diffWeeks;
  };
  const currentWeek = getCurrentWeek();

  const handleDatesSet = (dateInfo) => {
    const vnDate = getVNDate(dateInfo.start);
    const weekStart = getWeekStart(vnDate);
    const diffWeeks = Math.floor((weekStart - hkStartDate) / (7*24*60*60*1000));
    const weekNumber = 35 + diffWeeks;
    setVisibleWeek(weekNumber);
  };

  const showCenterPopup = (msg, duration = 2000) => {
    setPopupMsg(msg);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), duration);
  };

  const parseText = () => {
    const lines = text.split("\n").slice(1);
    const newEvents = [];

    lines.forEach((line) => {
      const cols = line.split("\t");
      if (cols.length < 12) return;
      const [hk, ma, name, tc, tc_hp, nhom, thu, tiet, gio, phong, cs, tuanStr] = cols;
      if (thu === "--" || gio === "--" || tuanStr === "--") return;
      const [startTime, endTime] = gio.split(" - ");
      if (!startTime || !endTime) return;

      tuanStr.split("|").forEach((w) => {
        if (w === "--") return;
        const weekNumber = parseInt(w, 10);
        if (isNaN(weekNumber)) return;

        let color = "#007bff"; // future
        if (weekNumber < currentWeek) color = "#28a745"; // past
        else if (weekNumber === currentWeek) color = "#fd7e14"; // current

        const eventDate = addDays(hkStartDate, (weekNumber - 35) * 7);
        const dayOffset = (dayMap[thu]-1) % 7;
        const eventStart = new Date(eventDate);
        eventStart.setDate(eventStart.getDate() + dayOffset);
        const [startH, startM] = startTime.split(":").map(Number);
        eventStart.setHours(startH, startM);

        const eventEnd = new Date(eventStart);
        const [endH, endM] = endTime.split(":").map(Number);
        eventEnd.setHours(endH, endM);

        newEvents.push({
          id: ma+nhom+thu+w,
          title: `${ma} - ${name}`,
          start: eventStart,
          end: eventEnd,
          backgroundColor: color,
          borderColor: "#444",
          textColor: "#fff",
          extendedProps: { phong, cs, nhom, week: weekNumber, tiet, gio },
        });
      });
    });

    setEvents(newEvents);
    const allWeeksFromEvents = Array.from(new Set(newEvents.map(ev => ev.extendedProps.week))).sort((a,b)=>a-b);
    setWeeks(allWeeksFromEvents);
  };

  const scrollToWeek = (weekNum) => {
    setVisibleWeek(weekNum);
    const deltaWeeks = weekNum - 35;
    const scrollDate = addDays(hkStartDate, deltaWeeks * 7);
    calendarRef.current.getApi().gotoDate(scrollDate);
  };

  useEffect(() => {
    if (!userId) return;
    const fetchCalendar = async () => {
      try {
        const { data, error } = await supabase
          .from("timetable")
          .select("events")
          .eq("user_id", userId)
          .single();

        if (error && error.code !== "PGRST116") return console.error(error);

        if (data?.events) {
          const loadedEvents = JSON.parse(data.events).map(ev => ({
            ...ev,
            start: new Date(ev.start),
            end: new Date(ev.end),
            backgroundColor: (() => {
              const w = ev.extendedProps.week;
              if (w < currentWeek) return "#28a745";
              else if (w === currentWeek) return "#fd7e14";
              else return "#007bff";
            })(),
            borderColor: "#444",
            textColor: "#fff",
          }));
          setEvents(loadedEvents);
          const allWeeksFromEvents = Array.from(new Set(loadedEvents.map(ev => ev.extendedProps.week))).sort((a,b)=>a-b);
          setWeeks(allWeeksFromEvents);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCalendar();
  }, [userId]);

  const saveCalendar = async () => {
    if (!userId) return showCenterPopup("User not logged in!");
    try {
      await supabase
        .from("timetable")
        .upsert({ user_id: userId, events: JSON.stringify(events) }, { onConflict: ["user_id"] });

      showCenterPopup("Calendar saved successfully!");
    } catch (err) {
      console.error(err);
      showCenterPopup("Error saving calendar: " + err.message);
    }
  };

  if (!userId) return <div>Loading user...</div>;

  return (
    <div style={{ padding:20, fontFamily:"Inter, Arial, sans-serif", background:"#000", color:"#e5e7eb", minHeight:"100vh" }}>
      <h2 style={{ marginBottom:15, fontWeight:600, fontSize:20 }}>📅 My Timetable</h2>

      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        <textarea
          rows={6}
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder="Paste timetable (tab-separated)"
          style={{ 
            flex:1, fontFamily:"monospace", fontSize:12, padding:10, 
            borderRadius:6, border:"1px solid #444", background:"#111", color:"#e5e7eb", resize:"vertical" 
          }}
        />
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button onClick={parseText} style={{ padding:"10px 16px", borderRadius:6, background:"linear-gradient(90deg,#1e90ff,#0056b3)", color:"#fff", border:"none", cursor:"pointer" }}>Generate Calendar</button>
          <button onClick={saveCalendar} style={{ padding:"10px 16px", borderRadius:6, background:"linear-gradient(90deg,#28a745,#1c7430)", color:"#fff", border:"none", cursor:"pointer" }}>Save Calendar</button>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          display: "flex",
          gap: 2,
          padding: "4px 0",
          background: "#111",
          borderRadius: 6,
          marginBottom: 20,
          overflow: "hidden",
        }}
      >
        {weeks.map((w) => {
          let color = "#6c757d";
          if (w < currentWeek) color = "#28a745";
          else if (w === currentWeek) color = "#fd7e14";
          else color = "#1e90ff";

          const isVisible = w === visibleWeek+1;
          return (
            <div
              key={w}
              title={`Week ${w}`}
              onClick={() => scrollToWeek(w)}
              style={{
                flex: 1,
                height: 16,
                backgroundColor: color,
                borderRadius: 4,
                cursor: "pointer",
                opacity: isVisible ? 0.7 : 1,
                transition: "all 0.3s",
              }}
            />
          );
        })}
      </div>

      {/* Calendar */}
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
        initialView="timeGridWeek"
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="18:00:00"
        events={events}
        height="auto"
        nowIndicator
        datesSet={handleDatesSet}
        headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridWeek,timeGridDay" }}
        eventContent={(info) => {
          const { title, extendedProps } = info.event;
          return (
            <div style={{ fontSize: 10, lineHeight: "12px", padding: "2px", color: "#fff" }}>
              <div>{title}</div>
              <div>G{extendedProps.nhom}</div>
              <div>{extendedProps.phong}</div>
              <div>{extendedProps.cs}</div>
              <div>{extendedProps.tiet}</div>
            </div>
          );
        }}
      />



      {/* Popup */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: showPopup
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -50%) scale(0.8)",
          opacity: showPopup ? 1 : 0,
          background: "linear-gradient(135deg, #1e90ff, #0056b3)",
          color: "#fff",
          padding: "18px 28px",
          borderRadius: 12,
          zIndex: 9999,
          fontSize: 16,
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          transition: "all 0.3s ease-in-out",
          pointerEvents: "none"
        }}
      >
        {popupMsg}
      </div>
    </div>
  );
}

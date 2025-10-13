"use client";

import { useState } from "react";

// Import các component quiz theo môn
import MathQuiz from "./MathQuizComponent";
import PhysicsQuiz from "./PhysicsQuizComponent";
import EnglishQuiz from "./EnglishQuizComponent";

export default function QuizComponent() {
  const subjects = {
    Math: MathQuiz,
    Physics: PhysicsQuiz,
    English: EnglishQuiz,
  };

  const [activeSubject, setActiveSubject] = useState(null);
  const ActiveQuiz = activeSubject ? subjects[activeSubject] : null;

  return (
    <div
      style={{
        minHeight: "80vh",
        padding: "20px",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        background: "#f9fafb",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        Quiz Center
      </h2>

      {/* Nút chọn môn học */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "30px", flexWrap: "wrap" }}>
        {Object.keys(subjects).map((subject) => (
          <button
            key={subject}
            onClick={() => setActiveSubject(subject)}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              backgroundColor: activeSubject === subject ? "#2563eb" : "#e5e7eb",
              color: activeSubject === subject ? "#fff" : "#111",
              fontWeight: "600",
              transition: "0.3s",
            }}
          >
            {subject}
          </button>
        ))}
      </div>

      {/* Render quiz component */}
      <div>
        {ActiveQuiz ? (
          <ActiveQuiz />
        ) : (
          <p style={{ color: "#555" }}>👉 Please select a subject to start the quiz!</p>
        )}
      </div>
    </div>
  );
}

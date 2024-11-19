"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const studentNames = students.map((student) => student.name);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("timestamp", { ascending: false });

      if (!error) setQuestions(data);
    };

    const fetchStudents = async () => {
      const { data, error } = await supabase.from("students").select("*");
      if (!error) setStudents(data);
    };

    const channel = supabase
      .channel("update-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "questions",
        },
        () => {
          fetchQuestions();
        }
      )
      .subscribe();

    const studentsAnswered = supabase
      .channel("students-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "students",
        },
        () => {
          fetchStudents();
        }
      )
      .subscribe();

    fetchQuestions();
    fetchStudents();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeAllChannels(studentsAnswered);
    };
  }, [supabase]);

  const handleDeleteQuestion = async (id, name) => {
    await supabase
      .from("students")
      .upsert({
        name: name,
      })
      .select();

    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const deleteSession = async () => {
    const { data: questions, error: error_questions } = await supabase
      .from("questions")
      .select("*");

    const { data: students, error: error_students } = await supabase
      .from("students")
      .select("*");

    const questions_ids = questions.map((q) => q.id);
    const student_ids = students.map((s) => s.id);

    await supabase.from("students").delete().in("id", student_ids);
    await supabase.from("questions").delete().in("id", questions_ids);
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-5">
      <h1 className="text-2xl font-bold">
        Admin Panel — Only for TAs and professors!
      </h1>
      <button
        className="px-3 py-1 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition ease-in-out duration-300"
        onClick={() => deleteSession()}
      >
        Delete session (Careful!)
      </button>
      <div className="flex flex-col gap-4">
        {questions.map((q) => (
          <div
            className="border-2 flex flex-col gap-2 align bg-gray-50 border-gray-300 p-4 rounded w-full"
            key={q.id}
          >
            <div className="text-lg">{q.question}</div>
            <div className="text-sm">
              <strong>
                {q.name}{" "}
                {studentNames.includes(q.name) && (
                  <span className="text-red-500"> ALREADY ANSWERED</span>
                )}
              </strong>
            </div>

            <p>
              {
                <button
                  className="px-3 py-1 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-green-300 transition ease-in-out duration-300"
                  onClick={() => handleDeleteQuestion(q.id, q.name)}
                >
                  Mark as answered
                </button>
              }
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const studentNames = students.map((student) => student.name);

  console.log(students);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("timestamp", { ascending: false });

      if (!error) setQuestions(data);
    };

    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("name");
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
          console.log("Fetching!");
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
    const data = students.filter((s) => s.name == name);

    if (data.length == 0) {
      await supabase
        .from("students")
        .upsert({ name: name, questions_answered: 1 })
        .select();
    } else {
      const student_data = data[0];
      const questions_answered = student_data.questions_answered;
      await supabase
        .from("students")
        .update({ questions_answered: questions_answered + 1 })
        .eq("name", name)
        .select();
    }

    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const deleteSession = async () => {
    const { data: questions } = await supabase.from("questions").select("*");
    const questions_ids = questions.map((q) => q.id);
    await supabase.from("questions").delete().in("id", questions_ids);

    // const { data: students } = await supabase.from("students").select("*");
    // const student_ids = students.map((s) => s.id);
    // await supabase.from("students").delete().in("id", student_ids);
  };

  const dismissQuestion = async (id) => {
    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="flex flex-col items-center justify-center gap-5 p-2">
      <h2 className="font-bold">Students who have asked questions</h2>
      <div className="bg-gray-200 p-4 rounded-md min-w-0.5">
        {students.map((s) => (
          <div key={s.id} className="flex flex-row items justify-between gap-5">
            <div>{s.name}</div>
            <div>{s.questions_answered}</div>
          </div>
        ))}
      </div>
      <h1 className="text-2xl font-bold">
        Admin Panel — Only for TAs and professors!
      </h1>
      <button
        className="px-3 py-1 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition ease-in-out duration-300"
        onClick={() => deleteSession()}
      >
        Clear Questions
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
                {q.name}
                {studentNames.includes(q.name) && (
                  <span className="text-red-500">
                    {" "}
                    ANSWERED{" "}
                    {
                      students.filter((s) => s.name == q.name)[0]
                        .questions_answered
                    }{" "}
                    TIMES
                  </span>
                )}
              </strong>
            </div>

            <button
              className="px-3 py-1 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-green-300 transition ease-in-out duration-300"
              onClick={() => handleDeleteQuestion(q.id, q.name)}
            >
              Add point & dismiss
            </button>
            <button
              className="px-3 py-1 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-green-300 transition ease-in-out duration-300"
              onClick={() => dismissQuestion(q.id, q.name)}
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

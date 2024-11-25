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
  };

  const addPointAll = async () => {
    const names = questions.map((q) => q.name);
    const unique_names = [...new Set(names)];
    console.log(names, unique_names);

    unique_names.forEach(async (name) => {
      const points = names.filter((n) => n == name).length;
      const data = students.filter((s) => s.name == name);

      if (data.length == 0) {
        await supabase
          .from("students")
          .upsert({ name: name, questions_answered: points })
          .select();
      } else {
        const student_data = data[0];
        const questions_answered = student_data.questions_answered;
        await supabase
          .from("students")
          .update({ questions_answered: questions_answered + points })
          .eq("name", name)
          .select();
      }
    });

    deleteSession();
  };

  const dismissQuestion = async (id) => {
    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const downloadCSV = () => {
    const pairs = students.map((s) => [s.name, s.questions_answered]);
    const csvRows = [["Student Name", "Questions asked"], ...pairs];

    console.log(pairs);

    const csvContent = csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "student_answers.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex sm:flex-row flex-col justify-center gap-5 p-6 bg-white text-black">
      <div className="w-100 flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <button
          className="px-3 py-1 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition ease-in-out duration-300"
          onClick={() => deleteSession()}
        >
          Clear Questions
        </button>
        <button
          className="px-3 py-1 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition ease-in-out duration-300"
          onClick={() => addPointAll()}
        >
          Add Point to All & Clear Questions
        </button>
        <button
          onClick={() => downloadCSV()}
          className="px-3 py-1 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition ease-in-out duration-300"
        >
          Download .CSV
        </button>
        <h2 className="font-bold">Students who have asked questions</h2>
        <div className="bg-gray-200 p-4 rounded-md min-w-0.5  text-black">
          {students.map((s) => (
            <div
              key={s.id}
              className="flex flex-row items justify-between gap-5"
            >
              <div>{s.name}</div>
              <div>{s.questions_answered}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4 ">
        <h2 className="text-2xl font-bold">Questions asked by students</h2>
        {questions.map((q) => (
          <div
            className="border-2 flex flex-col gap-2 align bg-gray-50 p-4 rounded-xl w-full"
            key={q.id}
          >
            <div className="text-lg text-black">{q.question}</div>
            <div className="text-sm text-black">
              <strong>
                {q.name}
                {studentNames.includes(q.name) && (
                  <span className="text-red-500">
                    {" "}
                    {
                      students.filter((s) => s.name == q.name)[0]
                        .questions_answered
                    }{" "}
                    POINTS
                  </span>
                )}
              </strong>
            </div>
            <div className="flex flex-row gap-2">
              <button
                className="px-3 py-1 bg-green-500 text-white font-semibold rounded shadow-md hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-green-300 transition ease-in-out duration-300"
                onClick={() => handleDeleteQuestion(q.id, q.name)}
              >
                Add point & dismiss
              </button>
              <button
                className="px-3 py-1 bg-blue-500 text-white font-semibold rounded shadow-md hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-green-300 transition ease-in-out duration-300"
                onClick={() => dismissQuestion(q.id, q.name)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

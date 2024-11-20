"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useUser } from "../context/UserContext";
import { redirect, useRouter } from "next/navigation";

export default function Forum() {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const { name } = useUser();
  const router = useRouter();

  useEffect(() => {
    const fetchQuestions = async () => {
      console.log("fetching...");
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("timestamp", { ascending: false });

      if (!error) setQuestions(data);
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

    fetchQuestions();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handlePostQuestion = async () => {
    if (name) {
      const { error } = await supabase.from("questions").insert([
        {
          name: name,
          question: newQuestion,
        },
      ]);

      if (!error) setNewQuestion("");
    }
  };

  const handleWithdrawQuestion = async (id) => {
    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  if (name) {
    return (
      <div className="w-100 box-border flex flex-col overflow-y-scroll  items-center justify-center gap-5 p-5">
        <h1 className="text-2xl font-bold">BIEN 210 Presentations Forum</h1>

        <input
          type="text"
          placeholder={`Ask a question, ${name}!`}
          value={newQuestion}
          className="w-full max-w-md px-4 py-2 text-gray-800 bg-white border text-center border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 transition ease-in-out duration-300"
          onChange={(e) => setNewQuestion(e.target.value)}
        />
        <button
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition ease-in-out duration-300"
          onClick={handlePostQuestion}
        >
          Post your question
        </button>

        <div className="flex flex-col gap-4">
          {questions.map((q) => (
            <div
              className="border-2 flex flex-col gap-2 align bg-gray-50 border-gray-300 p-4 rounded w-full"
              key={q.id}
            >
              <div className="text-lg">{q.question}</div>
              <div className="text-sm">
                <strong>{q.name}</strong>
              </div>

              <p>
                {q.name === name && (
                  <button
                    className="px-3 py-1 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition ease-in-out duration-300"
                    onClick={() => handleWithdrawQuestion(q.id)}
                  >
                    Withdraw
                  </button>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    redirect("/");
  }
}

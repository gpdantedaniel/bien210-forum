"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

import { useUser } from "./context/UserContext";

export default function Home() {
  const { name, setName } = useUser();
  const router = useRouter();

  const handleStartSession = () => {
    if (name) {
      setName(name);
      router.push("/forum");
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-5">
      <Image
        src="/bioeng.png"
        alt="The best engineering major at McGill"
        width={150} // Specify width
        height={300} // Specify height
      />
      <h1 className="text-2xl font-bold">
        Welcome to the BIEN 210 presentations forum!
      </h1>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        className="w-full max-w-md px-4 py-2 text-gray-800 bg-white border text-center border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 transition ease-in-out duration-300"
        onChange={(e) => setName(e.target.value)}
      />

      <button
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition ease-in-out duration-300"
        onClick={handleStartSession}
      >
        Enter Forum
      </button>
    </div>
  );
}

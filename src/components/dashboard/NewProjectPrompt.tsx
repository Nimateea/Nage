"use client";

import React, { useState } from "react";

interface NewProjectPromptProps {
  onBack: () => void;
  onCreate: (name?: string, prompt?: string) => Promise<void>;
}

export function NewProjectPrompt({ onBack, onCreate }: NewProjectPromptProps) {
  const [prompt, setPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (customName?: string) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const name = customName || prompt.trim().slice(0, 30) || "Untitled Moodboard";
      await onCreate(name, prompt.trim());
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative bg-black select-none px-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-[#888888] hover:text-white text-[13px] flex items-center gap-1.5 absolute top-8 left-10 transition-colors"
        title="Back to projects"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      {/* Centered Logo */}
      <div className="mb-10 text-center">
        <div
          onClick={onBack}
          className="text-white text-[30px] font-normal tracking-[-1px] cursor-pointer"
          style={{ fontFamily: '"Gegola DEMO", sans-serif' }}
        >
          nage
        </div>
      </div>

      {/* Prompt Box */}
      <div
        className="w-full max-w-[640px] bg-[#050505] border border-[#151515] rounded-[24px] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Tell me about your project :)"
          className="w-full bg-transparent text-white text-[15px] resize-none outline-none min-h-[44px] mb-5 placeholder-[#333333]"
        />

        <div className="flex justify-between items-center">
          {/* Left Icons */}
          <div className="flex gap-4 items-center text-[#444444]">
            <button
              type="button"
              className="hover:text-[#888888] transition-colors"
              title="Add attachment"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              type="button"
              className="hover:text-[#888888] transition-colors"
              title="Options"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
                <circle cx="5" cy="12" r="1.5" />
              </svg>
            </button>
          </div>

          {/* Right Icons */}
          <div className="flex gap-4 items-center">
            <button
              type="button"
              className="text-[#444444] hover:text-[#888888] transition-colors"
              title="Camera"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            <button
              type="button"
              className="text-[#444444] hover:text-[#888888] transition-colors"
              title="Voice"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={isCreating}
              className="w-8 h-8 rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#888888] hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
              title="Create Project"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div
        className={`flex justify-center items-center gap-3 mt-4 w-full max-w-[640px] transition-opacity ${
          isCreating ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {/* Illustrations */}
        <div
          onClick={() => handleSubmit("Illustration Project")}
          className="flex flex-col items-start gap-2.5 w-[98px] h-[85px] p-2 pt-4 rounded-[16px] bg-[#0D0D0D] hover:bg-[#151515] transition-all cursor-pointer"
        >
          <span className="text-[#A0A0A0] text-[12px] w-full text-center">
            Illustrations
          </span>
          <div className="w-full flex-grow flex justify-center items-center opacity-60">
            <svg width="32" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z" />
            </svg>
          </div>
        </div>

        {/* Moodboards */}
        <div
          onClick={() => handleSubmit("New Moodboard")}
          className="flex flex-col items-start gap-2.5 w-[98px] h-[85px] p-2 pt-4 rounded-[16px] bg-[#0D0D0D] hover:bg-[#151515] transition-all cursor-pointer"
        >
          <span className="text-[#A0A0A0] text-[12px] w-full text-center">
            Moodboards
          </span>
          <div className="w-full flex-grow flex justify-center items-center gap-[3px]">
            <div className="w-[24px] h-[22px] bg-[#1A1A1A] rounded-[4px]" />
            <div className="w-[24px] h-[22px] bg-[#1A1A1A] rounded-[4px]" />
            <div className="w-[16px] h-[22px] bg-[#1A1A1A] rounded-[4px]" />
          </div>
        </div>

        {/* Font */}
        <div
          onClick={() => handleSubmit("Typography Project")}
          className="flex flex-col items-start gap-2.5 w-[98px] h-[85px] p-2 pt-4 rounded-[16px] bg-[#0D0D0D] hover:bg-[#151515] transition-all cursor-pointer"
        >
          <span className="text-[#A0A0A0] text-[12px] w-full text-center">
            Font
          </span>
          <div className="w-full flex-grow flex justify-center items-center">
            <span className="text-[#333333] font-bold text-[22px]">Aa</span>
          </div>
        </div>
      </div>
    </div>
  );
}

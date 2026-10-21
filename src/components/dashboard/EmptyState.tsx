import React from "react";

interface EmptyStateProps {
  onNewProject: () => void;
}

export function EmptyState({ onNewProject }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-6"
      style={{
        border: "1.5px dashed #222222",
        borderRadius: "24px",
        width: "100%",
        maxWidth: "840px",
        height: "440px",
      }}
    >
      {/* 3D Stacked Rectangles SVG Graphic from Nage Prototype */}
      <div className="mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="178"
          height="120"
          viewBox="0 0 178 120"
          fill="none"
        >
          <rect
            x="107.364"
            width="81.5632"
            height="83.2277"
            rx="13.3164"
            transform="rotate(30 107.364 0)"
            fill="#0A0A0A"
          />
          <rect
            width="81.5632"
            height="83.2277"
            rx="13.3164"
            transform="matrix(0.866019 -0.500012 -0.500012 -0.866019 41.6147 112.859)"
            fill="#0D0D0D"
          />
          <rect
            width="81.5632"
            height="83.2277"
            rx="13.3164"
            transform="matrix(1 0 0 -1 47.9124 119.221)"
            fill="#0F0F0F"
          />
        </svg>
      </div>

      {/* Text */}
      <h2 className="text-white font-medium text-[15px] mb-2">No Project yet!</h2>
      <p className="text-[#555555] text-[13px] mb-6">
        Click on the New project button to create a project
      </p>

      <button
        onClick={onNewProject}
        className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:bg-[#E5E5E5] active:scale-[0.98] flex items-center gap-2"
      >
        New Project
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
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

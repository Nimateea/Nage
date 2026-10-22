"use client";

import React, { useRef, useState } from "react";
import { useEditorStore } from "@/lib/canvas/store/editorStore";

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);

  const {
    activeTool,
    setActiveTool,
    centerView,
    openShortcutsModal,
    openIllustrationModal,
    showToast,
  } = useEditorStore();

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      showToast(`Selected image: ${file.name}`);
      // Image upload and node insertion will be fully wired in Step 11
    }
  };

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 select-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        id="image-upload-input"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="bg-[#111111] rounded-full px-6 py-3 flex items-center gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-[#1a1a1a]">
        {/* Move / Select (V) */}
        <button
          id="tool-move"
          type="button"
          onClick={() => setActiveTool("select")}
          className={`w-9 h-9 -my-2 rounded-full flex items-center justify-center transition-all ${
            activeTool === "select"
              ? "bg-[#2A2A2A] opacity-100 text-white"
              : "opacity-60 hover:opacity-100 text-white"
          }`}
          title="Move (V)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M8.15 18.0249C9.13333 18.0249 10.525 17.3333 11.625 14.0249L12.225 12.2249L14.025 11.6249C17.325 10.5249 18.0167 9.13327 18.0167 8.14994C18.0167 7.17494 17.325 5.77494 14.025 4.6666L6.95 2.30827C5.18333 1.7166 3.70833 1.8916 2.8 2.7916C1.89166 3.6916 1.71666 5.17494 2.30833 6.9416L4.66666 14.0166C5.775 17.3333 7.16666 18.0249 8.15 18.0249ZM13.6333 5.85827C15.95 6.63327 16.775 7.54994 16.775 8.14994C16.775 8.74994 15.95 9.6666 13.6333 10.4333L11.5333 11.1333C11.35 11.1916 11.2 11.3416 11.1417 11.5249L10.4417 13.6249C9.675 15.9416 8.75 16.7666 8.15 16.7666C7.55 16.7666 6.63333 15.9416 5.85833 13.6249L3.5 6.54994C3.075 5.2666 3.15 4.2166 3.69166 3.67494C4.23333 3.13327 5.28333 3.0666 6.55833 3.4916L13.6333 5.85827Z"
              fill="currentColor"
            />
            <path
              d="M11.575 11.9998C11.7333 11.9998 11.8917 11.9415 12.0167 11.8165C12.2583 11.5748 12.2583 11.1748 12.0167 10.9332L9.03334 7.9415C8.79167 7.69984 8.39167 7.69984 8.15 7.9415C7.90834 8.18317 7.90834 8.58317 8.15 8.82484L11.1333 11.8165C11.25 11.9415 11.4167 11.9998 11.575 11.9998Z"
              fill="currentColor"
            />
          </svg>
        </button>

        {/* Hand (H) */}
        <button
          id="tool-hand"
          type="button"
          onClick={() => setActiveTool("hand")}
          className={`w-9 h-9 -my-2 rounded-full flex items-center justify-center transition-all ${
            activeTool === "hand"
              ? "bg-[#2A2A2A] opacity-100 text-white"
              : "opacity-60 hover:opacity-100 text-white"
          }`}
          title="Hand (H)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        </button>

        {/* Frame (F) */}
        <button
          id="tool-frame"
          type="button"
          onClick={() => setActiveTool("frame")}
          className={`w-9 h-9 -my-2 rounded-full flex items-center justify-center transition-all ${
            activeTool === "frame"
              ? "bg-[#2A2A2A] opacity-100 text-white"
              : "opacity-60 hover:opacity-100 text-white"
          }`}
          title="Frame (F)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M6 2.5v15M14 2.5v15M2.5 6h15M2.5 14h15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Shape (R / O) with Dropdown */}
        <div className="relative">
          <button
            id="tool-shape"
            type="button"
            onClick={() => {
              if (activeTool === "rectangle") {
                setActiveTool("ellipse");
              } else if (activeTool === "ellipse") {
                setActiveTool("rectangle");
              } else {
                setActiveTool("rectangle");
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setShapeMenuOpen(!shapeMenuOpen);
            }}
            className={`w-9 h-9 -my-2 rounded-full flex items-center justify-center transition-all ${
              activeTool === "rectangle" || activeTool === "ellipse"
                ? "bg-[#2A2A2A] opacity-100 text-white"
                : "opacity-60 hover:opacity-100 text-white"
            }`}
            title="Shape (R: Rectangle / O: Ellipse)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <rect
                x="2.5"
                y="2.5"
                width="9"
                height="9"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle
                cx="12.5"
                cy="12.5"
                r="5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>

        {/* Text (T) */}
        <button
          id="tool-text"
          type="button"
          onClick={() => setActiveTool("text")}
          className={`w-9 h-9 -my-2 rounded-full flex items-center justify-center transition-all ${
            activeTool === "text"
              ? "bg-[#2A2A2A] opacity-100 text-white"
              : "opacity-60 hover:opacity-100 text-white"
          }`}
          title="Text (T)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M16.6667 3.3335H3.33333C3.11232 3.3335 2.90036 3.42129 2.74408 3.57757C2.5878 3.73385 2.5 3.94582 2.5 4.16683V6.66683C2.5 6.88784 2.5878 7.0998 2.74408 7.25609C2.90036 7.41237 3.11232 7.50016 3.33333 7.50016C3.55435 7.50016 3.76631 7.41237 3.92259 7.25609C4.07887 7.0998 4.16667 6.88784 4.16667 6.66683V5.00016H9.16667V15.8335H7.5C7.27899 15.8335 7.06702 15.9213 6.91074 16.0776C6.75446 16.2339 6.66667 16.4458 6.66667 16.6668C6.66667 16.8878 6.75446 17.0998 6.91074 17.2561C7.06702 17.4124 7.27899 17.5002 7.5 17.5002H12.5C12.721 17.5002 12.933 17.4124 13.0893 17.2561C13.2455 17.0998 13.3333 16.8878 13.3333 16.6668C13.3333 16.4458 13.2455 16.2339 13.0893 16.0776C12.933 15.9213 12.721 15.8335 12.5 15.8335H10.8333V5.00016H15.8333V6.66683C15.8333 6.88784 15.9211 7.0998 16.0774 7.25609C16.2337 7.41237 16.4457 7.50016 16.6667 7.50016C16.8877 7.50016 17.0996 7.41237 17.2559 7.25609C17.4122 7.0998 17.5 6.88784 17.5 6.66683V4.16683C17.5 3.94582 17.4122 3.73385 17.2559 3.57757C17.0996 3.42129 16.8877 3.3335 16.6667 3.3335Z"
              fill="currentColor"
            />
          </svg>
        </button>

        {/* Import Image */}
        <button
          id="tool-image"
          type="button"
          onClick={handleImageClick}
          className="w-9 h-9 -my-2 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 text-white transition-all"
          title="Import Image (I)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M7.5 8.95833C6.23333 8.95833 5.20833 7.93333 5.20833 6.66667C5.20833 5.4 6.23333 4.375 7.5 4.375C8.76666 4.375 9.79166 5.4 9.79166 6.66667C9.79166 7.93333 8.76666 8.95833 7.5 8.95833ZM7.5 5.625C6.92499 5.625 6.45833 6.09167 6.45833 6.66667C6.45833 7.24167 6.92499 7.70833 7.5 7.70833C8.075 7.70833 8.54166 7.24167 8.54166 6.66667C8.54166 6.09167 8.075 5.625 7.5 5.625Z"
              fill="currentColor"
            />
            <path
              d="M12.5 18.9582H7.5C2.97501 18.9582 1.04167 17.0248 1.04167 12.4998V7.49984C1.04167 2.97484 2.97501 1.0415 7.5 1.0415H10.8333C11.175 1.0415 11.4583 1.32484 11.4583 1.6665C11.4583 2.00817 11.175 2.2915 10.8333 2.2915H7.5C3.65834 2.2915 2.29167 3.65817 2.29167 7.49984V12.4998C2.29167 16.3415 3.65834 17.7082 7.5 17.7082H12.5C16.3417 17.7082 17.7083 16.3415 17.7083 12.4998V8.33317C17.7083 7.9915 17.9917 7.70817 18.3333 7.70817C18.675 7.70817 18.9583 7.9915 18.9583 8.33317V12.4998C18.9583 17.0248 17.025 18.9582 12.5 18.9582Z"
              fill="currentColor"
            />
            <path
              d="M15 7.2915C14.9167 7.2915 14.8417 7.27484 14.7583 7.2415C14.525 7.14984 14.375 6.9165 14.375 6.6665V1.6665C14.375 1.32484 14.6583 1.0415 15 1.0415C15.3417 1.0415 15.625 1.32484 15.625 1.6665V5.15817L16.225 4.55817C16.4667 4.3165 16.8667 4.3165 17.1083 4.55817C17.35 4.79984 17.35 5.19984 17.1083 5.4415L15.4417 7.10817C15.325 7.22484 15.1667 7.2915 15 7.2915Z"
              fill="currentColor"
            />
            <path
              d="M15 7.29154C14.8417 7.29154 14.6833 7.2332 14.5583 7.1082L12.8917 5.44154C12.65 5.19987 12.65 4.79987 12.8917 4.5582C13.1333 4.31654 13.5333 4.31654 13.775 4.5582L15.4417 6.22487C15.6833 6.46654 15.6833 6.86654 15.4417 7.1082C15.3167 7.2332 15.1583 7.29154 15 7.29154Z"
              fill="currentColor"
            />
            <path
              d="M2.225 16.4168C2.025 16.4168 1.825 16.3168 1.70834 16.1418C1.51667 15.8585 1.59167 15.4668 1.88334 15.2751L5.99167 12.5168C6.89167 11.9085 8.13334 11.9835 8.95 12.6751L9.225 12.9168C9.64167 13.2751 10.35 13.2751 10.7583 12.9168L14.225 9.9418C15.1083 9.18346 16.5 9.18346 17.3917 9.9418L18.75 11.1085C19.0083 11.3335 19.0417 11.7251 18.8167 11.9918C18.5917 12.2501 18.2 12.2835 17.9333 12.0585L16.575 10.8918C16.1583 10.5335 15.45 10.5335 15.0333 10.8918L11.5667 13.8668C10.6833 14.6251 9.29167 14.6251 8.4 13.8668L8.125 13.6251C7.74167 13.3001 7.10834 13.2668 6.68334 13.5585L2.575 16.3168C2.46667 16.3835 2.34167 16.4168 2.225 16.4168Z"
              fill="currentColor"
            />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-[1px] h-[24px] bg-[#333333]" />

        {/* Center View */}
        <button
          id="tool-center"
          type="button"
          onClick={centerView}
          className="w-9 h-9 -my-2 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 text-white transition-all"
          title="Center View (Shift + 1)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M12.5 7.50016L16.6667 3.3335M13.3333 3.3335H16.6667V6.66683M7.50001 12.5002L3.33334 16.6668M6.66668 16.6668H3.33334V13.3335"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Illustration Nodes */}
        <button
          id="tool-illustration"
          type="button"
          onClick={openIllustrationModal}
          className="w-9 h-9 -my-2 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 text-white transition-all"
          title="Illustration Nodes"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M1.66666 3.33317C1.66666 2.89114 1.84225 2.46722 2.15481 2.15466C2.46737 1.8421 2.8913 1.6665 3.33332 1.6665H6.66666C7.10868 1.6665 7.53261 1.8421 7.84517 2.15466C8.15773 2.46722 8.33332 2.89114 8.33332 3.33317V6.6665C8.33332 7.10853 8.15773 7.53245 7.84517 7.84501C7.53261 8.15758 7.10868 8.33317 6.66666 8.33317H3.33332C2.8913 8.33317 2.46737 8.15758 2.15481 7.84501C1.84225 7.53245 1.66666 7.10853 1.66666 6.6665V3.33317Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 8.33301V13.333H8.33333"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.8333 10.8332C10.8333 10.3911 11.0089 9.96722 11.3215 9.65466C11.634 9.3421 12.058 9.1665 12.5 9.1665H15.8333C16.2753 9.1665 16.6993 9.3421 17.0118 9.65466C17.3244 9.96722 17.5 10.3911 17.5 10.8332V14.1665C17.5 14.6085 17.3244 15.0325 17.0118 15.345C16.6993 15.6576 16.2753 15.8332 15.8333 15.8332H12.5C12.058 15.8332 11.634 15.6576 11.3215 15.345C11.0089 15.0325 10.8333 14.6085 10.8333 14.1665V10.8332Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Shortcuts */}
        <button
          id="tool-shortcuts"
          type="button"
          onClick={openShortcutsModal}
          className="w-9 h-9 -my-2 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 text-white transition-all"
          title="Shortcuts"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M10 2.0835C6.82501 2.0835 4.58334 4.36933 4.58334 7.18266C4.58334 8.46266 5.11001 9.326 5.77084 10.1493C5.91418 10.3285 6.06001 10.501 6.21001 10.6785L6.29001 10.7718C6.46501 10.9802 6.64584 11.1952 6.81501 11.4168C7.15168 11.8593 7.46751 12.3568 7.64418 12.9452C7.68745 13.1025 7.66746 13.2705 7.5885 13.4133C7.50954 13.5561 7.37786 13.6624 7.2216 13.7094C7.06534 13.7564 6.89689 13.7404 6.75225 13.6649C6.6076 13.5894 6.49823 13.4603 6.44751 13.3052C6.33251 12.9218 6.11668 12.5635 5.82001 12.1743C5.66345 11.9719 5.50173 11.7735 5.33501 11.5793L5.25834 11.4877C5.10834 11.311 4.95001 11.1243 4.79584 10.9318C4.05834 10.0135 3.33334 8.876 3.33334 7.18183C3.33334 3.636 6.17918 0.833496 10 0.833496C13.8208 0.833496 16.6667 3.63516 16.6667 7.18266C16.6667 8.876 15.9417 10.0135 15.2042 10.9327C15.05 11.1243 14.8917 11.311 14.7417 11.4885L14.665 11.5793C14.49 11.786 14.3275 11.9802 14.18 12.1743C13.8833 12.5635 13.6675 12.9227 13.5525 13.3052C13.4993 13.4573 13.3895 13.5831 13.2459 13.6563C13.1022 13.7295 12.9359 13.7444 12.7816 13.698C12.6272 13.6516 12.4967 13.5474 12.4172 13.4072C12.3378 13.2669 12.3155 13.1014 12.355 12.9452C12.5325 12.3568 12.8483 11.8593 13.1858 11.4168C13.3542 11.1952 13.535 10.9802 13.7108 10.7718L13.79 10.6785C13.94 10.501 14.0858 10.3285 14.2292 10.1502C14.89 9.32516 15.4167 8.46266 15.4167 7.18266C15.4167 4.36933 13.175 2.0835 10 2.0835ZM7.29168 15.0002H12.7083C12.8741 15.0002 13.0331 15.066 13.1503 15.1832C13.2675 15.3004 13.3333 15.4594 13.3333 15.6252C13.3333 15.7909 13.2675 15.9499 13.1503 16.0671C13.0331 16.1843 12.8741 16.2502 12.7083 16.2502H7.29168C7.12592 16.2502 6.96695 16.1843 6.84974 16.0671C6.73253 15.9499 6.66668 15.7909 6.66668 15.6252C6.66668 15.4594 6.73253 15.3004 6.84974 15.1832C6.96695 15.066 7.12592 15.0002 7.29168 15.0002ZM7.91668 18.1252C7.91668 17.9594 7.98253 17.8004 8.09974 17.6832C8.21695 17.566 8.37592 17.5002 8.54168 17.5002H11.4583C11.6241 17.5002 11.7831 17.566 11.9003 17.6832C12.0175 17.8004 12.0833 17.9594 12.0833 18.1252C12.0833 18.2909 12.0175 18.4499 11.9003 18.5671C11.7831 18.6843 11.6241 18.7502 11.4583 18.7502H8.54168C8.37592 18.7502 8.21695 18.6843 8.09974 18.5671C7.98253 18.4499 7.91668 18.2909 7.91668 18.1252Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

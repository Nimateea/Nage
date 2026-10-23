"use client";

import React from "react";
import { useEditorStore } from "@/lib/canvas/store/editorStore";

export function EditorModals() {
  const {
    shortcutsModalOpen,
    closeModals,
  } = useEditorStore();

  return (
    <>

      {/* Shortcuts Modal */}
      {shortcutsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none"
          onClick={closeModals}
        >
          <div
            className="bg-[#111111] border border-[#222222] rounded-[20px] p-8 max-w-sm w-full max-h-[85vh] overflow-y-auto relative shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
              onClick={closeModals}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M10 2.0835C6.82501 2.0835 4.58334 4.36933 4.58334 7.18266C4.58334 8.46266 5.11001 9.326 5.77084 10.1493C5.91418 10.3285 6.06001 10.501 6.21001 10.6785L6.29001 10.7718C6.46501 10.9802 6.64584 11.1952 6.81501 11.4168C7.15168 11.8593 7.46751 12.3568 7.64418 12.9452C7.68745 13.1025 7.66746 13.2705 7.5885 13.4133C7.50954 13.5561 7.37786 13.6624 7.2216 13.7094C7.06534 13.7564 6.89689 13.7404 6.75225 13.6649C6.6076 13.5894 6.49823 13.4603 6.44751 13.3052C6.33251 12.9218 6.11668 12.5635 5.82001 12.1743C5.66345 11.9719 5.50173 11.7735 5.33501 11.5793L5.25834 11.4877C5.10834 11.311 4.95001 11.1243 4.79584 10.9318C4.05834 10.0135 3.33334 8.876 3.33334 7.18183C3.33334 3.636 6.17918 0.833496 10 0.833496C13.8208 0.833496 16.6667 3.63516 16.6667 7.18266C16.6667 8.876 15.9417 10.0135 15.2042 10.9327C15.05 11.1243 14.8917 11.311 14.7417 11.4885L14.665 11.5793C14.49 11.786 14.3275 11.9802 14.18 12.1743C13.8833 12.5635 13.6675 12.9227 13.5525 13.3052C13.4993 13.4573 13.3895 13.5831 13.2459 13.6563C13.1022 13.7295 12.9359 13.7444 12.7816 13.698C12.6272 13.6516 12.4967 13.5474 12.4172 13.4072C12.3378 13.2669 12.3155 13.1014 12.355 12.9452C12.5325 12.3568 12.8483 11.8593 13.1858 11.4168C13.3542 11.1952 13.535 10.9802 13.7108 10.7718L13.79 10.6785C13.94 10.501 14.0858 10.3285 14.2292 10.1502C14.89 9.32516 15.4167 8.46266 15.4167 7.18266C15.4167 4.36933 13.175 2.0835 10 2.0835ZM7.29168 15.0002H12.7083C12.8741 15.0002 13.0331 15.066 13.1503 15.1832C13.2675 15.3004 13.3333 15.4594 13.3333 15.6252C13.3333 15.7909 13.2675 15.9499 13.1503 16.0671C13.0331 16.1843 12.8741 16.2502 12.7083 16.2502H7.29168C7.12592 16.2502 6.96695 16.1843 6.84974 16.0671C6.73253 15.9499 6.66668 15.7909 6.66668 15.6252C6.66668 15.4594 6.73253 15.3004 6.84974 15.1832C6.96695 15.066 7.12592 15.0002 7.29168 15.0002ZM7.91668 18.1252C7.91668 17.9594 7.98253 17.8004 8.09974 17.6832C8.21695 17.566 8.37592 17.5002 8.54168 17.5002H11.4583C11.6241 17.5002 11.7831 17.566 11.9003 17.6832C12.0175 17.8004 12.0833 17.9594 12.0833 18.1252C12.0833 18.2909 12.0175 18.4499 11.9003 18.5671C11.7831 18.6843 11.6241 18.7502 11.4583 18.7502H8.54168C8.37592 18.7502 8.21695 18.6843 8.09974 18.5671C7.98253 18.4499 7.91668 18.2909 7.91668 18.1252Z"
                  fill="white"
                />
              </svg>
              Keyboard Shortcuts
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex justify-between items-center text-[#888]">
                <span>Move / Select</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">V</span>
              </li>
              <li className="flex justify-between items-center text-[#888]">
                <span>Hand / Pan</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">H / Space</span>
              </li>
              <li className="flex justify-between items-center text-[#888]">
                <span>Frame</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">F</span>
              </li>
              <li className="flex justify-between items-center text-[#888]">
                <span>Rectangle</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">R</span>
              </li>
              <li className="flex justify-between items-center text-[#888]">
                <span>Ellipse</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">O</span>
              </li>
              <li className="flex justify-between items-center text-[#888]">
                <span>Add Text</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">T</span>
              </li>
              <li className="flex justify-between items-center text-[#888]">
                <span>Upload Image</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">I</span>
              </li>
              <li className="flex justify-between items-center text-[#888]">
                <span>Center View</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">Shift + 1</span>
              </li>
              <li className="flex justify-between items-center text-[#888]">
                <span>Undo</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">⌘Z</span>
              </li>
              <li className="flex justify-between items-center text-[#888]">
                <span>Redo</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">⌘⇧Z</span>
              </li>
              <li className="flex justify-between items-center text-[#888]">
                <span>Delete Node</span>
                <span className="bg-[#222] px-2 py-1 rounded text-white text-xs">⌫ / Del</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);
const ConfirmContext = createContext(null);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const confirmDialog = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({
        message,
        resolve: (value) => {
          setConfirmState(null);
          resolve(value);
        },
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      <ConfirmContext.Provider value={confirmDialog}>
        {children}

        <div className="fixed bottom-4 inset-x-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto max-w-sm w-full sm:w-auto text-sm font-medium rounded-xl px-4 py-2.5 shadow-lg border animate-slide-up ${
                t.type === "error"
                  ? "bg-red-950/90 border-red-800 text-red-200"
                  : t.type === "success"
                  ? "bg-[#123244] border-[#90d3d9]/50 text-[#90d3d9]"
                  : "bg-[#123244] border-[#1c3f4f] text-gray-200"
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>

        {confirmState && (
          <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-[#123244] border border-[#1c3f4f] rounded-2xl p-5 space-y-4 shadow-2xl animate-slide-up">
              <p className="text-gray-100 text-sm leading-relaxed">{confirmState.message}</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => confirmState.resolve(false)}
                  className="px-4 py-1.5 rounded-lg text-sm bg-[#1c3f4f] text-gray-300 hover:bg-[#254d5f] transition"
                >
                  ביטול
                </button>
                <button
                  onClick={() => confirmState.resolve(true)}
                  className="px-4 py-1.5 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium transition"
                >
                  אישור
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within UIProvider");
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within UIProvider");
  return ctx;
}

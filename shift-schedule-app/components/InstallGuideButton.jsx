"use client";

import { useState } from "react";

export default function InstallGuideButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 text-xs text-[#90d3d9] hover:text-white transition mx-auto"
      >
        <span>📲</span>
        <span>איך מוסיפים את הסידור כאפליקציה בטלפון?</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setOpen(false)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#123244] border border-[#1c3f4f] rounded-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">הוספה כאפליקציה</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white text-xl leading-none"
                aria-label="סגור"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-[#90d3d9] font-semibold flex items-center gap-2">
                <span>🍎</span> אייפון (Safari)
              </h3>
              <ol className="text-sm text-gray-300 space-y-1.5 list-decimal list-inside">
                <li>פתחו את הסידור מתוך אפליקציית Safari (לא כרום)</li>
                <li>לחצו על כפתור השיתוף (הריבוע עם החץ למעלה) בתחתית המסך</li>
                <li>גללו למטה ובחרו <b>"הוסף למסך הבית"</b></li>
                <li>לחצו <b>"הוסף"</b> בפינה העליונה</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="text-[#90d3d9] font-semibold flex items-center gap-2">
                <span>🤖</span> אנדרואיד (Chrome)
              </h3>
              <ol className="text-sm text-gray-300 space-y-1.5 list-decimal list-inside">
                <li>פתחו את הסידור מתוך כרום</li>
                <li>לחצו על שלוש הנקודות בפינה הימנית העליונה</li>
                <li>בחרו <b>"הוספה למסך הבית"</b> או <b>"התקן אפליקציה"</b></li>
                <li>אשרו את ההוספה</li>
              </ol>
            </div>

            <p className="text-xs text-gray-500 text-center pt-1">
              לאחר ההוספה יופיע סמל של רסיס במסך הבית, ותוכלו לפתוח את הסידור ישירות ממנו
            </p>
          </div>
        </div>
      )}
    </>
  );
}

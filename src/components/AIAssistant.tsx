// src/components/AIAssistant.tsx
import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

type AIAssistantProps = {
  onClose: () => void;
};

export function AIAssistant({ onClose }: AIAssistantProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const askAI = useAction(api.aiAssistant.askAI);
  const chatHistory = useQuery(api.aiAssistantQueries.getChatHistory) ?? [];

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error("من فضلك اكتب سؤالك");
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      const response = await askAI({ question });
      setAnswer(response);
      setQuestion("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "حدث خطأ أثناء معالجة سؤالك";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "مين أفضل طالب في آخر 4 أيام؟",
    "كام طالب مسجل في البرامج؟",
    "إيه أكثر فيديو مشاهدة؟",
    "عرض إحصائيات الحضور",
    "كام محفظ عندنا؟",
    "إيه البرامج المتاحة؟",
  ];

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1EAC57] to-[#179948] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
              🤖
            </div>
            <div>
              <h2 className="text-xl font-bold">المساعد الذكي</h2>
              <p className="text-xs text-[#E0F7EB]">اسألني أي شيء عن الدار</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* أسئلة سريعة */}
          {!answer && !loading && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                💡 أسئلة سريعة:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setQuestion(q)}
                    className="text-right px-4 py-3 rounded-xl bg-[#E9F8F0] text-[#0F7A3C] hover:bg-[#D7F1E3] transition-colors text-sm border border-[#C2EDD9]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* الإجابة أثناء التحميل */}
          {loading && (
            <div className="bg-gradient-to-br from-[#E9F8F0] to-[#D7F1E3] rounded-2xl p-6 border border-[#C2EDD9]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#1EAC57] flex items-center justify-center text-white">
                  🤖
                </div>
                <span className="font-semibold text-[#0F7A3C]">
                  المساعد الذكي
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#1EAC57]">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1EAC57]"></div>
                <span className="text-sm">جاري التفكير...</span>
              </div>
            </div>
          )}

          {/* الإجابة بعد الرجوع */}
          {answer && !loading && (
            <div className="bg-gradient-to-br from-[#E9F8F0] to-[#D7F1E3] rounded-2xl p-6 border border-[#C2EDD9]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#1EAC57] flex items-center justify-center text-white">
                  🤖
                </div>
                <span className="font-semibold text-[#0F7A3C]">
                  المساعد الذكي
                </span>
              </div>
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {answer}
              </div>
            </div>
          )}

          {/* تاريخ المحادثات */}
          {chatHistory.length > 0 && !loading && !answer && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                📜 آخر المحادثات:
              </h3>
              <div className="space-y-3">
                {chatHistory.slice(0, 3).map((chat: any) => (
                  <div
                    key={chat._id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                  >
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">سؤال:</span>{" "}
                      {chat.question}
                    </div>
                    <div className="text-sm text-gray-800">
                      <span className="font-semibold">إجابة:</span>{" "}
                      {chat.answer.substring(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleAsk}
          className="p-6 border-t border-gray-200 bg-gray-50"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="اكتب سؤالك هنا... مثلاً: مين أفضل طالب؟"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-[#C2EDD9] focus:border-[#1EAC57] focus:ring-2 focus:ring-[#B4E8D2] transition-all text-right"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#1EAC57] to-[#179948] text-white rounded-xl font-semibold hover:from-[#179948] hover:to-[#147B3A] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "⏳" : "إرسال"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

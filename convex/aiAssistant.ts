"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import Groq from "groq-sdk";

// دالة الذكاء الاصطناعي باستخدام Groq
export const askAI = action({
  args: { question: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("يجب تسجيل الدخول أولاً");

    // التأكد من وجود مفتاح GROQ
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("لم يتم إعداد GROQ_API_KEY في Convex.");
    }

    // إنشاء عميل Groq داخل الـ handler
    const groq = new Groq({ apiKey });

    try {
      // جمع البيانات من قاعدة البيانات
      const students = await ctx.runQuery(
        api.aiAssistantQueries.getStudentsData
      );
      const teachers = await ctx.runQuery(
        api.aiAssistantQueries.getTeachersData
      );
      const programs = await ctx.runQuery(
        api.aiAssistantQueries.getProgramsData
      );
      const attendance = await ctx.runQuery(
        api.aiAssistantQueries.getAttendanceData
      );
      const evaluations = await ctx.runQuery(
        api.aiAssistantQueries.getEvaluationsData
      );
      const videos = await ctx.runQuery(api.aiAssistantQueries.getVideosData);
      const resources = await ctx.runQuery(
        api.aiAssistantQueries.getResourcesData
      );
      const competitions = await ctx.runQuery(
        api.aiAssistantQueries.getCompetitionsData
      );

      const gradeMap: any = {
        "ممتاز": 5,
        "جيد جداً": 4,
        "جيد": 3,
        "مقبول": 2,
        "ضعيف": 1,
      };

      // متوسط التقييمات
      const avgGrade =
        evaluations.length > 0
          ? (
              evaluations.reduce(
                (sum: number, e: any) =>
                  sum + (gradeMap[e.overallGrade] || 0),
                0
              ) / evaluations.length
            ).toFixed(2)
          : "لا توجد تقييمات";

      // أفضل الطلاب بالحضور
      const bestAttendance = (() => {
        const map: Record<string, number> = {};
        attendance.forEach((a: any) => {
          if (a.studentId && a.status === "حاضر") {
            const student = students.find((s: any) => s._id === a.studentId);
            if (student) {
              map[student.name] = (map[student.name] || 0) + 1;
            }
          }
        });
        const list = Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => `- ${name}: ${count} يوم`);
        return list.join("\n") || "لا توجد بيانات";
      })();

      // أفضل الطلاب بالتقييمات
      const bestGrades = (() => {
        const map: any = {};
        evaluations.forEach((e: any) => {
          const student = students.find((s: any) => s._id === e.studentId);
          if (!student) return;
          if (!map[student.name]) {
            map[student.name] = { total: 0, count: 0 };
          }
          map[student.name].total += gradeMap[e.overallGrade] || 0;
          map[student.name].count++;
        });

        const list = Object.entries(map)
          .map(([name, data]: any) => ({
            name,
            avg: data.total / data.count,
          }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 5)
          .map((s) => `- ${s.name}: ${s.avg.toFixed(2)}/5`);

        return list.join("\n") || "لا توجد بيانات";
      })();

      // 👇 هنا الـ context الذي يتحكم في سلوك المساعد بالكامل
      const context = `
أنت مساعد ذكي لدار ابن الجزري لتحفيظ القرآن الكريم.

📌 معلومات ثابتة عن دار ابن الجزري:
- اسم الدار: دار ابن الجزري لتحفيظ القرآن الكريم.
- رقم التواصل (جوال / واتساب):00201070506656
- البريد الإلكتروني:Elsayedaboelnor@gmail.com
- الموقع: المنزله - قطر (يمكنك تعديل النص حسب العنوان الحقيقي).
- أوقات العمل: من الأحد إلى الخميس، من 8:00 صباحا إلى 8:00 مساءً.

📊 الطلاب:
- العدد: ${students.length}
- النشطون: ${students.filter((s: any) => s.isActive).length}

👨‍🏫 المحفظون:
- العدد: ${teachers.length}
- النشطون: ${teachers.filter((t: any) => t.isActive).length}

📚 البرامج:
- العدد: ${programs.length}
- النشط: ${programs.filter((p: any) => p.isActive).length}

📅 الحضور (آخر 7 أيام):
- إجمالي السجلات: ${attendance.length}
- الحاضرون: ${attendance.filter((a: any) => a.status === "حاضر").length}
- الغياب: ${attendance.filter((a: any) => a.status === "غائب").length}

📝 التقييمات (آخر 7 أيام):
- العدد: ${evaluations.length}
- المتوسط: ${avgGrade}

🎥 الفيديوهات:
- العدد: ${videos.length}

📖 المصادر:
- العدد: ${resources.length}

🏆 المسابقات:
- النشطة: ${competitions.length}

⭐ أفضل الطلاب بالحضور:
${bestAttendance}

⭐ أفضل الطلاب بالتقييمات:
${bestGrades}

تعليمات المساعد:
- استخدم العربية الفصحى.
- كن ودودًا واستخدم الإيموجي بشكل مناسب.
- اجعل إجابتك مختصرة وواضحة.
- إذا سُئلت عن رقم التواصل أو الواتساب أو طريقة التواصل مع الدار، فاستخدم المعلومات الموجودة في قسم "معلومات ثابتة عن دار ابن الجزري" ولا تخترع أرقامًا جديدة.
- إذا سُئلت عن مواعيد العمل أو موقع الدار، فاعتمد على نفس القسم.
- اعتمد دائمًا على البيانات المعطاة أعلاه (الطلاب، البرامج، الحضور، التقييمات...) في تحليلك.
- إذا كان السؤال غير واضح، اطلب التوضيح بلطف.
`;

      // استدعاء Groq بالموديل الحالي
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: context },
          { role: "user", content: args.question },
        ],
        temperature: 0.7,
      });

      const answer =
        completion.choices?.[0]?.message?.content ||
        "عذراً، لم أتمكن من الإجابة.";

      // حفظ المحادثة في قاعدة البيانات
      await ctx.runMutation(api.aiAssistantQueries.saveChatHistory, {
        question: args.question,
        answer,
      });

      return answer;
    } catch (error: any) {
      console.error("Groq AI Error:", error);
      throw new Error(
        `خطأ أثناء تشغيل الذكاء الاصطناعي: ${
          error?.message || "خطأ غير معروف"
        }`
      );
    }
  },
});

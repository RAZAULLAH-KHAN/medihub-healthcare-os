const TRIAGE_PROMPT = `You are a hospital routing assistant, not a diagnostician.
Given patient-described symptoms, suggest the most likely hospital department from this list only:
Cardiology, General Medicine, Pediatrics, Orthopedics, Dermatology, ENT, Gynecology, Emergency, Neurology, Gastroenterology, Pulmonology, Ophthalmology.
Reply with JSON only: {"department":"...","reason":"one short sentence"}.
Do not add clinical claims or treatment advice.`;

const SUMMARY_PROMPT = `Summarize this medical report in plain language for the patient.
Rules:
- Do not add new clinical claims, diagnoses, or advice that are not in the source.
- Keep it under 120 words.
- Use everyday words.
Return plain text only.`;

export async function runAi(prompt: string, userText: string) {
  const key = process.env.AI_API_KEY;
  const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  if (!key) {
    return fallback(userText, prompt);
  }

  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 400,
          messages: [{ role: "user", content: `${prompt}\n\n${userText}` }],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return String(data.content?.[0]?.text ?? "").trim();
    }

    const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}\n\n${userText}` }] }],
        }),
      },
    );
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts as Array<{ text?: string }> | undefined;
    const textPart = parts?.find((p) => typeof p.text === "string")?.text ?? parts?.[0]?.text ?? "";
    return String(textPart).trim();
  } catch {
    return fallback(userText, prompt);
  }
}

function fallback(userText: string, prompt: string) {
  if (prompt.includes("department")) {
    const t = userText.toLowerCase();
    let department = "General Medicine";
    if (/chest|heart|palpitat/.test(t)) department = "Cardiology";
    else if (/bone|fracture|joint|knee|back pain/.test(t)) department = "Orthopedics";
    else if (/child|baby|fever in kid/.test(t)) department = "Pediatrics";
    else if (/skin|rash|acne/.test(t)) department = "Dermatology";
    else if (/ear|nose|throat|sinus/.test(t)) department = "ENT";
    else if (/pregnan|period|gynae/.test(t)) department = "Gynecology";
    else if (/bleed|unconscious|severe|accident/.test(t)) department = "Emergency";
    else if (/headache|seizure|numb/.test(t)) department = "Neurology";
    else if (/stomach|vomit|abdomen/.test(t)) department = "Gastroenterology";
    else if (/cough|breath|asthma/.test(t)) department = "Pulmonology";
    else if (/eye|vision/.test(t)) department = "Ophthalmology";
    return JSON.stringify({
      department,
      reason: "Matched from common symptom keywords (fallback while AI is unavailable).",
    });
  }
  const clipped = userText.replace(/\s+/g, " ").slice(0, 400);
  return `Your doctor recorded the following: ${clipped} Please review the full report and discuss any questions with your doctor.`;
}

export { TRIAGE_PROMPT, SUMMARY_PROMPT };

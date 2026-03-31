"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, AlertCircle, Clipboard, Send, ShieldAlert, X } from "lucide-react";

type Msg = { id: string; fromMe: boolean; text: string; time: string };

type StepKey =
  | "C0_chat"
  | "C1_flag_shown"
  | "C2_assist_open"
  | "C3_suggestions"
  | "C4_compose"
  | "C5_done";

function timeLabelFixed(t: string) {
  return t;
}

export default function ScenarioCClient({
  pid = "TEST_PID",
  returnUrl = "",
}: {
  pid?: string;
  returnUrl?: string;
}) {
  // ---------------- SAFE CLOCK (no Date.now) ----------------
  const clockRef = useRef(0);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      clockRef.current += 1;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ---------------- TIMING ----------------
  const startedAtRef = useRef<number | null>(null);
  const stepEnterRef = useRef<number>(0);
  const [scenarioFinished, setScenarioFinished] = useState(false);

  const steps: StepKey[] = [
    "C0_chat",
    "C1_flag_shown",
    "C2_assist_open",
    "C3_suggestions",
    "C4_compose",
    "C5_done",
  ];

  const [stepIndex, setStepIndex] = useState(0);
  const [stepTimes, setStepTimes] = useState<Record<string, number>>({});


  useEffect(() => {
    if (startedAtRef.current === null) {
      startedAtRef.current = clockRef.current;
      stepEnterRef.current = clockRef.current;
    }
  }, []);

  function goToStep(nextKey: StepKey) {
    const now = clockRef.current;
    const currentKey = steps[stepIndex];
    const delta = now - stepEnterRef.current;

    setStepTimes((prev) => ({
      ...prev,
      [currentKey]: (prev[currentKey] ?? 0) + delta,
    }));

    stepEnterRef.current = now;
    setStepIndex(Math.max(0, steps.indexOf(nextKey)));
  }

  // ---------------- CHAT STATE ----------------
  const [thread, setThread] = useState<Msg[]>([
    {
      id: "m1",
      fromMe: false,
      text: "Hey, this is Charlie. Turns out we’re in psych 101 together!",
      time: timeLabelFixed("Today 7:12 PM"),
    },
    {
      id: "m2",
      fromMe: true,
      text: "Hi. That’s cool.",
      time: timeLabelFixed("Today 7:14 PM"),
    },
  ]);

  const flaggedMessageId = "m3";
  const [flagArrived, setFlagArrived] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const flagScheduledRef = useRef(false);

  // ---------------- DELAYED RISKY MESSAGE ----------------
  useEffect(() => {
    if (flagScheduledRef.current) return;
    flagScheduledRef.current = true;

    const start = clockRef.current;
    const delayTicks = 180; // ~3 seconds

    const check = () => {
      if (clockRef.current - start >= delayTicks) {
        setThread((prev) => [
          ...prev,
          {
            id: "m3",
            fromMe: false,
            text:
              "Do you want to come over and study later? My roommate will be gone!",
            time: timeLabelFixed("Today 7:15 PM"),
          },
        ]);

        setFlagArrived(true);
        setShowToast(true);
        goToStep("C1_flag_shown");

        return;
      }

      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  }, []);

  // ---------------- ASSIST PANEL ----------------
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistOpens, setAssistOpens] = useState(0);
  const [whyOpen, setWhyOpen] = useState(false);

  function openAssist() {
    if (!assistOpen) {
      setAssistOpen(true);
      setAssistOpens((n) => n + 1);
      goToStep("C2_assist_open");
    }
  }

  function closeAssist() {
    setAssistOpen(false);
  }

  function toggleWhy() {
    setWhyOpen((v) => !v);
  }

  const safety = useMemo(() => {
    return {
      headline:
        "This message may be pressuring a fast in-person meet in a private setting.",
      reasons: [
        "You don’t know them well yet.",
        "Private locations early can increase vulnerability.",
        "Mentioning 'roommate will be gone' may be a pressure cue.",
      ],
      guideline:
        "Common safety practice: chat longer and meet in a public space first.",
      suggestions: [
        "I’m not comfortable meeting at someone’s place yet. I’d prefer a public spot.",
        "No thanks — I don’t go to someone’s place this soon.",
        "I’m not ready to meet privately. Maybe we can talk more first?",
        "I’m going to pass, but I hope your semester goes well!",
      ],
    };
  }, []);

  // ---------------- COMPOSER ----------------
  const [draft, setDraft] = useState("");
  const [savedDraft, setSavedDraft] = useState("");
  const [sentCount, setSentCount] = useState(0);
  const [suggestionClicks, setSuggestionClicks] = useState(0);
  const [editKeystrokes, setEditKeystrokes] = useState(0);
  const [readyToFinish, setReadyToFinish] = useState(false);
  

  function chooseSuggestion(text: string) {
    setDraft(text);
    setSuggestionClicks((n) => n + 1);
    goToStep("C3_suggestions");
  }

  function saveDraft() {
    if (!draft.trim()) return;
    setSavedDraft(draft);
    goToStep("C4_compose");
  }

  function sendDraft() {
    if (!draft.trim()) return;

    setThread((prev) => [
      ...prev,
      {
        id: `me_${clockRef.current}`,
        fromMe: true,
        text: draft,
        time: timeLabelFixed("Today 7:18 PM"),
      },
    ]);

    setDraft("");
    setSavedDraft("");
    setSentCount((n) => n + 1);
    goToStep("C4_compose");
    setReadyToFinish(true);
  }

  async function copyDraft() {
    if (!draft.trim()) return;
    try {
      await navigator.clipboard.writeText(draft);
    } catch {}
  }

  // ---------------- FINISH ----------------
  function finishScenario() {
    setScenarioFinished(true);
  }

  // ---------------- UI ----------------
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-100 text-gray-900">
      <div className="relative w-[390px] h-[820px] bg-white rounded-[44px] shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ArrowLeft size={18} />
            <div>
              <div className="text-sm font-semibold">Charlie</div>
              <div className="text-xs text-gray-500">New match</div>
            </div>
          </div>

          <button
            type="button"
            onClick={assistOpen ? closeAssist : openAssist}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium shadow-sm hover:bg-blue-100 transition"
            //aria-label="Open context assist"
            //title="Context Assist"
          >
            <AlertCircle size={18} />
            Assist
          </button>
        </div>

        {/* Thread */}
        <div className="relative h-[540px] px-4 py-4 bg-gray-50 overflow-y-auto">
          {showToast && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-6 z-40">
              <div className="w-full max-w-[300px] rounded-2xl border border-amber-300 bg-amber-50 shadow-xl p-4 text-center">
                <div className="text-base font-semibold text-amber-900 mb-2">
                  ⚠️ Safety check detected
                </div>
                <div className="text-sm text-amber-900 mb-3">
                  A message may contain boundary pressure. Tap <span className="font-semibold">Assist</span> to see why.
                </div>
                <button
                  type="button"
                  onClick={() => setShowToast(false)}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {thread.map((m) => {
            const isFlagged =
              flagArrived && m.id === flaggedMessageId;

            return (
              <div
                key={m.id}
                className={`mb-3 flex ${
                  m.fromMe ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow ${
                    m.fromMe
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200"
                  } ${isFlagged ? "ring-2 ring-amber-400" : ""}`}
                >
                  {m.text}
                </div>
              </div>
            );
          })}

          {/* Assist Panel */}
          {assistOpen && (
            <div className="absolute top-0 right-0 w-[320px] h-full bg-white border-l border-gray-200 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="font-semibold flex items-center gap-2">
                  <ShieldAlert size={16} className="text-amber-600" />
                  Safety Assist
                </div>
                <X onClick={closeAssist} size={16} />
              </div>

              <div className="text-sm">{safety.headline}</div>

              <button
                onClick={toggleWhy}
                className="text-sm bg-gray-900 text-white px-3 py-2 rounded-lg"
              >
                {whyOpen ? "Hide why" : "Show why"}
              </button>

              {whyOpen && (
                <div className="text-xs space-y-2">
                  <ul className="list-disc pl-4">
                    {safety.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <div className="text-gray-600">{safety.guideline}</div>
                </div>
              )}

              <div className="space-y-2">
                {safety.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => chooseSuggestion(s)}
                    className="w-full text-left border border-gray-200 rounded-lg p-2 text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                onClick={copyDraft}
                className="text-xs border px-3 py-2 rounded-lg"
              >
                <Clipboard size={14} /> Copy draft
              </button>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex gap-2">
            <textarea
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setEditKeystrokes((k) => k + 1);
              }}
              placeholder="Message..."
            />
            <button
              disabled={!draft.trim()}
              onClick={sendDraft}
              className="bg-blue-600 text-white px-3 rounded-xl"
            >
              <Send size={16} />
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {readyToFinish && !scenarioFinished && (
                <div className="rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-3 shadow-sm">
                  <div className="text-sm font-semibold text-blue-900 mb-1">
                    Scenario completed
                  </div>
                </div>
              )}
              {scenarioFinished && (
                <div className="rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-3 shadow-sm">
                    <div className="text-sm font-semibold text-blue-900 mb-1">
                      You can close this window now and return to the survey.
                    </div>
                </div>
              )}

            <div className="flex justify-between items-center text-xs">
                <button onClick={saveDraft}>Save draft</button>

                <button
              type="button"
              onClick={finishScenario}
              disabled={!readyToFinish || scenarioFinished}
              className={`px-3 py-1 rounded-lg text-sm transition
                ${!readyToFinish && !scenarioFinished
                  ? "bg-gray-900 text-white hover:opacity-90"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"}
                `}
                >
              Finish scenario
            </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
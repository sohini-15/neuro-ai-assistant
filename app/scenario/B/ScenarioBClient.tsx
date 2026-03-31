"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, AlertCircle, Send, Clipboard, X, TriangleAlert } from "lucide-react";

type Msg = { id: string; fromMe: boolean; text: string; time: string };

type StepKey =
  | "B0_chat"
  | "B1_compose"
  | "B2_alert_shown"
  | "B3_edit_after_alert"
  | "B4_sent"
  | "B5_done";

function timeLabelFixed(t: string) {
  return t;
}

export default function ScenarioBClient({
  sessionId = "DEMO_SESSION",
  exitUrl = "",
}: {
  sessionId?: string;
  exitUrl?: string;
}) {
  // ---------------- “clock” (no Date.now / performance.now) ----------------
  const clockRef = useRef(0);
  useEffect(() => {
    clockRef.current = 1;
    let rafId: number;
    const tick = () => {
      clockRef.current += 1;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ---------------- timing ----------------
  const startedAtRef = useRef<number | null>(null);
  const stepEnterRef = useRef<number>(0);
  const [scenarioFinished, setScenarioFinished] = useState(false);
  const replyScheduledRef = useRef(false);

  useEffect(() => {
    if (startedAtRef.current === null) startedAtRef.current = clockRef.current;
    if (stepEnterRef.current === 0) stepEnterRef.current = clockRef.current;
  }, []);

  const steps: StepKey[] = ["B0_chat", "B1_compose", "B2_alert_shown", "B3_edit_after_alert", "B4_sent", "B5_done"];
  const [stepIndex, setStepIndex] = useState(0);
  const [stepTimes, setStepTimes] = useState<Record<string, number>>({});

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

  // ---------------- chat state ----------------
  // “Yesterday” setup + “Today” pacing sequence
  const [thread, setThread] = useState<Msg[]>(() => [
    { id: "y1", fromMe: false, text: "i have a 12 hour shift tomorrow lol", time: timeLabelFixed("Yesterday 8:41 PM") },
    { id: "y2", fromMe: false, text: "sure, let's hang out sometime", time: timeLabelFixed("Yesterday 8:43 PM") },
    { id: "y3", fromMe: true, text: "cool", time: timeLabelFixed("Yesterday 8:45 PM") },

    { id: "t1", fromMe: true, text: "hey good morning :)", time: timeLabelFixed("Today 9:03 AM") },
    { id: "t2", fromMe: true, text: "hope your shift is going okay", time: timeLabelFixed("Today 9:19 AM") },
    { id: "t3", fromMe: true, text: "hey, i know you're busy but can't wait to hear back from you, haha", time: timeLabelFixed("Today 10:02 AM") },
  ]);

  // The participant is about to type something intense
  const [draft, setDraft] = useState("");
  const [savedDraft, setSavedDraft] = useState("");

  // Instrumentation
  const [alertShownCount, setAlertShownCount] = useState(0);
  const [sendAnywayCount, setSendAnywayCount] = useState(0);
  const [editAfterAlertCount, setEditAfterAlertCount] = useState(0);
  const [draftSavedCount, setDraftSavedCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [editKeystrokes, setEditKeystrokes] = useState(0);
  const [readyToFinish, setReadyToFinish] = useState(false);
  const [theirReplyArrived, setTheirReplyArrived] = useState(false);

  const [assistOpen, setAssistOpen] = useState(false);

  // Alert logic
  const [showAlert, setShowAlert] = useState(false);
  const [alertAlreadyTriggered, setAlertAlreadyTriggered] = useState(false);

// Trigger alert whenever they try to send any non-empty message
function requestSend() {
  const msg = draft.trim();
  if (!msg) return;

  goToStep("B1_compose");

  // First send attempt: show alert
  if (!alertAlreadyTriggered) {
    setShowAlert(true);
    setAlertShownCount((n) => n + 1);
    setAlertAlreadyTriggered(true);
    goToStep("B2_alert_shown");
    return;
  }

  // After the first alert, future sends go through normally
  sendDraft();
}

  function sendDraft() {
    const msg = draft.trim();
    if (!msg) return;

    setThread((prev) => [
      ...prev,
      { id: `me_${clockRef.current}`, fromMe: true, text: msg, time: timeLabelFixed("Today 10:45 AM") },
    ]);

    setSentCount((n) => n + 1);
    setDraft("");
    setSavedDraft("");
    setShowAlert(false);
    goToStep("B4_sent");
    if (theirReplyArrived) setReadyToFinish(true);

    if (!replyScheduledRef.current) {
        replyScheduledRef.current = true;

        const seed = [...sessionId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const replyDelayTicks = 200 + (seed % 240);
        const startTick = clockRef.current;

        const check = () => {
            if (clockRef.current - startTick >= replyDelayTicks) {
            setThread((prev) => [
                ...prev,
                {
                id: `them_${clockRef.current}`,
                fromMe: false,
                text: "hey! sorry just seeing this — shift was brutal 😭",
                time: timeLabelFixed("Today 12:36 PM"),
                },
            ]);
            goToStep("B0_chat");
            setTheirReplyArrived(true);
            return;
            }

            requestAnimationFrame(check);
        };

        requestAnimationFrame(check);
    }
  }

  async function copyDraft() {
    if (!draft.trim()) return;
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      // ignore
    }
  }

  function saveDraft() {
    if (!draft.trim()) return;
    setSavedDraft(draft);
    setDraftSavedCount((n) => n + 1);
    goToStep("B3_edit_after_alert");
  }

  function editInstead() {
    setEditAfterAlertCount((n) => n + 1);
    setShowAlert(false);
    goToStep("B3_edit_after_alert");
  }

  function sendAnyway() {
  setSendAnywayCount((n) => n + 1);
  setShowAlert(false);
  sendDraft();
}

  function openAssist() {
    setAssistOpen(true);
  }
  function closeAssist() {
    setAssistOpen(false);
  }

  function finishScenario() {
    setScenarioFinished(true);
  }

  // ---------------- UI ----------------
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-100 text-gray-900">
      {/* Phone frame */}
      <div className="relative w-[390px] h-[820px] bg-white rounded-[44px] shadow-xl border border-gray-200 overflow-hidden">
        {/* Status bar */}
        <div className="h-8 flex items-center justify-between px-5 text-xs text-gray-500">
          <span>9:41</span>
          <span className="opacity-70">LTE ▪︎ ▪︎ ▪︎ 🔋</span>
        </div>

        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100" type="button" aria-label="Back" onClick={() => {}}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="text-sm font-semibold leading-4">Jamie</div>
              <div className="text-xs text-gray-500">Last active: today</div>
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
          <div className="text-center text-xs text-gray-400 mb-3">Conversation</div>

          {thread.map((m) => (
            <div key={m.id} className={`mb-3 flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[78%]">
                <div
                  className={[
                    "rounded-2xl px-3 py-2 text-sm leading-snug shadow-sm",
                    m.fromMe
                      ? "bg-blue-600 text-white rounded-tr-md"
                      : "bg-white text-gray-900 border border-gray-200 rounded-tl-md",
                  ].join(" ")}
                >
                  {m.text}
                </div>
                <div className={`text-[11px] mt-1 ${m.fromMe ? "text-right text-gray-400" : "text-left text-gray-400"}`}>
                  {m.time}
                </div>
              </div>
            </div>
          ))}

          {/* Assist panel */}
          <div
            className={[
              "absolute top-0 right-0 h-full w-[320px] bg-white border-l border-gray-200 shadow-lg",
              "transition-transform duration-200",
              assistOpen ? "translate-x-0" : "translate-x-full",
            ].join(" ")}
            role="dialog"
            aria-label="Pacing assist panel"
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200">
              <div className="font-semibold text-sm">Pacing Assist</div>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100" onClick={closeAssist} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-56px)]">
              <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                This is guidance, not a rule. You’re in control.
              </div>

              <div className="border border-gray-200 rounded-lg p-3 bg-white">
                <div className="text-xs font-semibold text-gray-600 mb-1">Context you might have missed</div>
                <div className="text-sm text-gray-800">They said: “i have a 12 hour shift tomorrow lol”</div>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="text-xs font-semibold text-gray-600 mb-1">Why this matters</div>
                <div className="text-sm text-gray-800">
                  After long shifts, replies can be delayed. Multiple follow-ups can accidentally feel intense.
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 bg-white">
                <div className="text-xs font-semibold text-gray-600 mb-1">Typical reply window (rough)</div>
                <div className="text-sm text-gray-800">Often 2–8 hours on workdays, sometimes longer.</div>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 bg-white">
                <div className="text-xs font-semibold text-gray-600 mb-2">Low-pressure alternatives</div>
                <div className="space-y-2">
                  {[
                    "Oops, just realized you said you’d be busy today — ignore my messages for now! Hope your shift’s going alright.",
                    "Just realized you're literally working half the day, sorry about the spam lol",
                    "Sorry for the spam! Forgot it was a 12 hour shift.",
                  ].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                      onClick={() => setDraft(t)}
                    >
                      <div className="text-sm">{t}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={copyDraft}
                className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <Clipboard size={16} />
                Copy current draft
              </button>
            </div>
          </div>

          {/* Alert modal */}
          {showAlert && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
              <div className="w-full max-w-[340px] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-start gap-3">
                  <div className="mt-0.5 text-amber-600">
                    <TriangleAlert size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Tone / pacing check</div>
                    <div className="text-xs text-gray-500 mt-1">
                      This message might feel intense right now. You can still send it — you’re in control.
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="text-xs text-gray-600">
                    Reason: they mentioned a 12-hour shift + you’ve already sent multiple follow-ups today.
                  </div>

                  <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    Try a low-pressure version, or save this as a draft for later.
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                      onClick={editInstead}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                      onClick={saveDraft}
                    >
                      Save draft
                    </button>
                  </div>

                  <button
                    type="button"
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90 text-sm"
                    onClick={sendAnyway}
                  >
                    Send anyway
                  </button>

                  <button
                    type="button"
                    className="w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                    onClick={() => setShowAlert(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="h-[118px] border-t border-gray-200 bg-white px-3 py-3">
          <div className="flex items-end gap-2">
            <textarea
              className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={2}
              placeholder="Message…"
              value={draft}
              onFocus={() => goToStep("B1_compose")}
              onChange={(e) => {
                setDraft(e.target.value);
                setEditKeystrokes((k) => k + 1);
              }}
            />

            <button
              type="button"
              className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40"
              aria-label="Send"
              disabled={!draft.trim()}
              onClick={requestSend}
            >
              <Send size={18} />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">{savedDraft ? "Draft saved ✔" : " "}</div>
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
    </main>
  );
}
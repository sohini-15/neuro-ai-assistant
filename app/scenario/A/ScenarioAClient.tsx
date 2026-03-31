"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {ArrowLeft, AlertCircle, Send, Clipboard, X} from "lucide-react";

type Msg = {id: string; fromMe: boolean; text: string; time: string};

type StepKey = 
    | "A0_chat"
    | "A1_assist_open"
    | "A2_explanation"
    | "A3_suggestions"
    | "A4_compose"
    | "A5_followup";

function nowTimeLabel() 
{
    const d = new Date();
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    return `${h}:${m} ${ampm}`;
}

export default function ScenarioAClient(
    {
        sessionId = "DEMO_SESSION",
        returnUrl = "",
    }:
    {
        sessionId?: string;
        returnUrl?: string;
    }
)

{
    /// timing
    const startedAtRef = useRef<number | null>(null);
    const stepEnterRef = useRef<number>(0);



    const steps: StepKey[] = 
    [
        "A0_chat",
        "A1_assist_open",
        "A2_explanation",
        "A3_suggestions",
        "A4_compose",
        "A5_followup",
    ];

    const [stepIndex, setStepIndex] = useState(0);
    const [stepTimes, setStepTimes] = useState<Record<string, number>>({});

    const clockRef = useRef(0);

    const [scenarioFinished, setScenarioFinished] = useState(false);

    useEffect(() => 
        {
            if (startedAtRef.current === null) startedAtRef.current = clockRef.current;
            if (stepEnterRef.current === 0) stepEnterRef.current = clockRef.current;
        }, []
    );

    useEffect(() => 
    {
        // initialize once after mount
        clockRef.current = 1;

        const tick = () => {
            // update a monotonic counter using animation frames (no Date.now / performance.now)
            clockRef.current += 1;
            rafId = requestAnimationFrame(tick);
        };

        let rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, []);

    function goToStep(nextKey: StepKey)
    {
        const now = clockRef.current;
        const currentKey = steps[stepIndex];
        const delta = now - stepEnterRef.current;

        setStepTimes((prev) => 
            ({
                ...prev,
                [currentKey]: (prev[currentKey] ?? 0) + delta,
            }));

        stepEnterRef.current = now;
        setStepIndex(Math.max(0, steps.indexOf(nextKey)));
    }

    /// realistic chat state
    const [thread, setThread] = useState<Msg[]>(() => [
        { id: "m1", fromMe: true, text: "Hey! How was your day?", time: "6:12 PM"},
        { id: "m2", fromMe: false, text: "Yeah, today was kinda rough tbh", time: "6:15 PM"},
    ]);

    const [assistOpen, setAssistOpen] = useState(false);

    type AssistMode = "interpret" | "suggest" | "compose";
    const [assistMode, setAssistMode] = useState<AssistMode>("interpret");

    /// what kind of help they chose
    const [modeClicksInterpret, setModeClicksInterpret] = useState(0);
    const [modeClicksSuggest, setModeClicksSuggest] = useState(0);
    const [modeClicksCompose, setModeClicksCompose] = useState(0);

    /// compose: reply builder
    type ComposeGoal = "understand" | "support";
    type ComposeTone = "gentle" | "direct";

    const [composeGoal, setComposeGoal] = useState<ComposeGoal>("understand");
    const [composeTone, setComposeTone] = useState<ComposeTone>("gentle");

    const [draft, setDraft] = useState("");
    const [savedDraft, setSavedDraft] = useState("");

    /// instrumentation
    const [assistOpens, setAssistOpens] = useState(0);
    const [suggestionClicks, setSuggestionClicks] = useState(0);
    const [sentCount, setSentCount] = useState(0);
    const [editKeystrokes, setEditKeystrokes] = useState(0);
    const [readyToFinish, setReadyToFinish] = useState(false);
    const [followupArrived, setFollowupArrived] = useState(false);

    /// progress conversation
    const [beat, setBeat] = useState<1 | 2>(1);
    const followupScheduledRef = useRef(false);

    /// for assist panel: which message is being assisted on
    const targetMessage = useMemo(() => 
    {
        for (let i = thread.length - 1; i >= 0; i--)
        {
            if (!thread[i].fromMe) return thread[i];
        }
        return thread[thread.length - 1];
    }, [thread]);

    /// explanation varies by beat
    const explanation = useMemo(() =>
    {
        if (beat === 1)
        {
            return {
                title: "What it might mean",
                summary: "They may be venting and looking for empathy, not solutions.",
                why: "Phrases like 'kinda rough' and 'tbh' can indicate low energy. People often prefer acknowledgement over advice in such situations",
                suggestions:
                [
                    { label: "Acknowledge and ask", text: "I'm sorry it was rough. Do you want to talk about it?" },
                    { label: "Letting them vent", text: "That sounds tough. I'm here if you need to vent." },
                    { label: "Ask for preference", text: "I hear you. Do you want comfort, advice, or just someone to listen?" },
                ],
            };
        }
        return {
            title: "What it might mean",
            summary: "They may feel overwhelmed and unsure how to explain it yet.",
            why: "'idk...just a lot' can mean they want support, but don't have the right words or energy to articulate it.",
            suggestions: [
                { label: "Reflective listening", text: "That sounds like a lot. I'm here - no need to explain it perfectly." },
                { label: "Offer a prompt", text: "Do you want to share what part felt hardest, or would you rather be distracted for a bit?" },
                { label: "Ask for preference", text: "I can listen, help problem-solve or simply keep you company. What would feel best?" },
            ],
        };
    }, [beat]);

    /// Compose: build question based on goal/tone
    const followupGenerated = useMemo(() => 
    {
        const topic1 = beat === 1 ? "what made today rough" : "what’s going on";
        const topic2 = beat === 1 ? "vent" : "take a break";

        const templates: Record<ComposeGoal, Record<ComposeTone, string[]>> = 
        {
            understand: 
            {
                gentle: 
                [
                    `If you’re up for it, do you want to share ${topic1}?`,
                    `Would it help to talk a little about ${topic1}, or would you rather ${topic2}?`,
                ],
                direct: 
                [
                    `Do you want to tell me about ${topic1}?`, 
                    `Is there any one thing that’s making it feel hard today?`
                ],
            },
            support:
            {
                gentle:
                [
                    "Hey, I'm here for you. Whatever you need.",
                    "That's alright. Is there anything I can do to help?",
                ],
                direct:
                [
                    "I'm here to help if you need me.",
                    "Do let me know if there's anything I can do to support you.",
                ],
            },
        };

        return templates[composeGoal][composeTone];
    }, [beat, composeGoal, composeTone]);

    function openAssist() 
    {
        if (!assistOpen) 
        {
            setAssistOpen(true);
            setAssistOpens((n) => n + 1);
            goToStep("A1_assist_open");
        }
    }

    function closeAssist() 
    {
    setAssistOpen(false);
    }

    function showWhy() 
    {
        goToStep("A2_explanation");
    }

    function chooseSuggestion(text: string) 
    {
        setDraft(text);
        setSuggestionClicks((n) => n + 1);
        goToStep("A3_suggestions");
    }

    function saveDraft() 
    {
        setSavedDraft(draft);
        goToStep("A4_compose");
    }

    function sendDraft() 
    {
        const msg = draft.trim();
        if (!msg) return;

        setThread((prev) => 
            [
            ...prev,
            { id: `me_${Date.now()}`, fromMe: true, text: msg, time: nowTimeLabel() },
            ]);
        setSentCount((n) => n + 1);
        setDraft("");
        setSavedDraft("");
        goToStep("A4_compose");
        setAssistOpen(false);

        if (beat === 1 && !followupScheduledRef.current) 
        {
            followupScheduledRef.current = true;
            goToStep("A5_followup");

            //const delayMs = 3500 + Math.floor(Math.random() * 2500);
            const seed = [...sessionId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            const delayMs = 3500 + (seed % 2500);
            setTimeout(() => 
            {
                setThread((prev) => 
                [
                    ...prev,
                    { id: `them_${Date.now()}`, fromMe: false, text: "idk… just a lot going on", time: nowTimeLabel() },
                    
                ]);
                setBeat(2);
                setFollowupArrived(true);
                followupScheduledRef.current = false;
                goToStep("A0_chat");
            }, delayMs);
        }
        if (followupArrived) {
          setReadyToFinish(true);
        }
    }

    async function copyCurrentDraft() 
    {
        if (!draft.trim()) return;
        try 
        {
            await navigator.clipboard.writeText(draft);
        } 
        catch 
        {
        // ignore for now
        }
    }

    function finishScenario() {
      setScenarioFinished(true);
    }

    function setMode(next: AssistMode) 
    {
        setAssistMode(next);

        if (next === "interpret") setModeClicksInterpret((n) => n + 1);
        if (next === "suggest") setModeClicksSuggest((n) => n + 1);
        if (next === "compose") setModeClicksCompose((n) => n + 1);

        if (next === "interpret") goToStep("A2_explanation");
        else goToStep("A3_suggestions");
    }

    /// UI
    return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-100 text-gray-900">
      <div className="relative w-[390px] h-[820px] bg-white rounded-[44px] shadow-xl border border-gray-200 overflow-hidden">
        <div className="h-8 flex items-center justify-between px-5 text-xs text-gray-500">
          <span>9:41</span>
          <span className="opacity-70">LTE ▪︎ ▪︎ ▪︎ 🔋</span>
        </div>

        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100" type="button" aria-label="Back" onClick={() => {}}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="text-sm font-semibold leading-4">Alex</div>
              <div className="text-xs text-gray-500">Active earlier</div>
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

        <div className="relative h-[540px] px-4 py-4 bg-gray-50 overflow-y-auto">
          <div className="text-center text-xs text-gray-400 mb-3">Today</div>

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

          <div
            className={[
              "absolute top-0 right-0 h-full w-[320px] bg-white border-l border-gray-200 shadow-lg",
              "transition-transform duration-200",
              assistOpen ? "translate-x-0" : "translate-x-full",
            ].join(" ")}
            role="dialog"
            aria-label="Context assist panel"
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200">
              <div className="font-semibold text-sm">Context Assist</div>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100" onClick={closeAssist} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-56px)]">
              <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                This is a suggestion, not a rule. You can ignore, edit, or use anything here.
              </div>

              <div className="flex gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setMode("interpret")}
                  className={[
                    "flex-1 text-xs px-2 py-2 rounded-lg",
                    assistMode === "interpret"
                      ? "bg-white shadow-sm font-semibold"
                      : "text-gray-600 hover:bg-white",
                  ].join(" ")}
                >
                  Interpret
                </button>

                <button
                  type="button"
                  onClick={() => setMode("suggest")}
                  className={[
                    "flex-1 text-xs px-2 py-2 rounded-lg",
                    assistMode === "suggest"
                      ? "bg-white shadow-sm font-semibold"
                      : "text-gray-600 hover:bg-white",
                  ].join(" ")}
                >
                  Reply ideas
                </button>

                <button
                  type="button"
                  onClick={() => setMode("compose")}
                  className={[
                    "flex-1 text-xs px-2 py-2 rounded-lg",
                    assistMode === "compose"
                      ? "bg-white shadow-sm font-semibold"
                      : "text-gray-600 hover:bg-white",
                  ].join(" ")}
                >
                  Write my own
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-600">Message you selected</div>
                <div className="text-xs text-gray-700 border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="mb-1">
                    <span className="font-semibold">Alex:</span>{" "}
                    <span className="bg-yellow-100 px-1 rounded">{targetMessage.text}</span>
                  </div>
                  <div className="text-[11px] text-gray-500">The system focuses on the highlighted message.</div>
                </div>
              </div>

              {assistMode === "interpret" && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600">{explanation.title}</div>
                  <div className="text-sm text-gray-800">{explanation.summary}</div>

                  <button
                    type="button"
                    onClick={showWhy}
                    className="w-full text-sm px-3 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90"
                  >
                    Show why (plain language)
                  </button>

                  {stepIndex >= steps.indexOf("A2_explanation") && (
                    <div className="text-sm text-gray-800 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="font-semibold text-xs text-gray-600 mb-1">Why</div>
                      <div className="text-sm">{explanation.why}</div>
                    </div>
                  )}
                </div>
              )}

              {assistMode === "suggest" && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600">Suggested replies (optional)</div>

                  {explanation.suggestions.map((s) => (
                    <button
                      key={s.text}
                      type="button"
                      onClick={() => chooseSuggestion(s.text)}
                      className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                    >
                      <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                      <div className="text-sm">{s.text}</div>
                    </button>
                  ))}
                </div>
              )}

              {assistMode === "compose" && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-600">Question Builder</div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Goal</div>
                      <select
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white"
                        value={composeGoal}
                        onChange={(e) => setComposeGoal(e.target.value as ComposeGoal)}
                      >
                        <option value="support">Support them</option>
                        <option value="understand">Understand context</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Tone</div>
                      <select
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white"
                        value={composeTone}
                        onChange={(e) => setComposeTone(e.target.value as ComposeTone)}
                      >
                        <option value="gentle">Gentle</option>
                        <option value="direct">Direct</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-500">This helps you ask a question without sounding pushy.</div>

                  <div className="space-y-2">
                    {followupGenerated.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => chooseSuggestion(q)}
                        className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                      >
                        <div className="text-xs text-gray-500 mb-1">Generated question</div>
                        <div className="text-sm">{q}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={copyCurrentDraft}
                className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <Clipboard size={16} />
                Copy current draft
              </button>
            </div>
          </div>
        </div>

        <div className="h-[118px] border-t border-gray-200 bg-white px-3 py-3">
          <div className="flex items-end gap-2">
            <textarea
              className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={2}
              placeholder="Message…"
              value={draft}
              onFocus={() => goToStep("A4_compose")}
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
              onClick={sendDraft}
            >
              <Send size={18} />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={saveDraft}
              disabled={!draft.trim()}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              Save draft
            </button>

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
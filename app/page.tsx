import Link from "next/link";

export default function Home() {
  const scenarios = [
    {
      id: "A",
      title: "Scenario A",
      subtitle: "Emotionally heavy conversation",
      description:
        "Interpret tone, understand likely intent, and decide how to respond without escalating the situation.",
    },
    {
      id: "B",
      title: "Scenario B",
      subtitle: "Ambiguous mixed-signal interaction",
      description:
        "Explore how communication support can help with unclear social context and uncertain conversational cues.",
    },
    {
      id: "C",
      title: "Scenario C",
      subtitle: "Safety-aware response support",
      description:
        "Practice identifying risk signals and drafting responses more carefully in sensitive situations.",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Neuro AI Assistant
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            A communication support prototype for interpreting tone, context,
            and conversational risk
          </h1>

          <p className="mt-6 text-lg leading-8 text-zinc-600">
            This project is a scenario-based frontend prototype designed to help
            users navigate emotionally charged or ambiguous online conversations
            more intentionally. It offers contextual interpretation, optional
            reply suggestions, and guided drafting support.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-zinc-500">
                {scenario.title}
              </p>
              <h2 className="mt-2 text-xl font-semibold">{scenario.subtitle}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {scenario.description}
              </p>

              <Link
                href={`/scenario/${scenario.id}`}
                className="mt-6 inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Open Scenario
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">What this prototype demonstrates</h3>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-600">
            <li>• Scenario-based communication support UI</li>
            <li>• Tone and context interpretation workflows</li>
            <li>• Guided response drafting and pacing support</li>
            <li>• Human-centered design for sensitive interactions</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
import ScenarioCClient from "./ScenarioCClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; return?: string }>;
}) {
  const params = await searchParams;

  return (
    <ScenarioCClient
      sessionId={params?.sessionId ?? "DEMO_SESSION"}
      exitUrl={params?.return ?? ""}
    />
  );
}
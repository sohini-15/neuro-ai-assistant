import ScenarioAClient from "./ScenarioAClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; return?: string }>;
}) {
  const params = await searchParams;

  return (
    <ScenarioAClient
      sessionId={params?.sessionId ?? "DEMO_SESSION"}
      exitUrl={params?.return ?? ""}
    />
  );
}
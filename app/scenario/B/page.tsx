import ScenarioBClient from "./ScenarioBClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; return?: string }>;
}) {
  const params = await searchParams;

  return (
    <ScenarioBClient
      sessionId={params?.sessionId ?? "DEMO_SESSION"}
      exitUrl={params?.return ?? ""}
    />
  );
}
import ScenarioAClient from "./ScenarioAClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string; return?: string }>;
}) {
  const params = await searchParams;

  return (
    <ScenarioAClient
      pid={params?.pid ?? "TEST_PID"}
      returnUrl={params?.return ?? ""}
    />
  );
}
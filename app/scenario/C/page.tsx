import ScenarioCClient from "./ScenarioCClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string; return?: string }>;
}) {
  const params = await searchParams;

  return (
    <ScenarioCClient
      pid={params?.pid ?? "TEST_PID"}
      returnUrl={params?.return ?? ""}
    />
  );
}
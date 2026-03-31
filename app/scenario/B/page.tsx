import ScenarioBClient from "./ScenarioBClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string; return?: string }>;
}) {
  const params = await searchParams;

  return (
    <ScenarioBClient
      pid={params?.pid ?? "TEST_PID"}
      returnUrl={params?.return ?? ""}
    />
  );
}
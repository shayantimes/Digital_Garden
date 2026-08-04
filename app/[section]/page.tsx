import { GardenSection } from "../components/garden-section";

export default async function CustomSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return <GardenSection slug={section} />;
}


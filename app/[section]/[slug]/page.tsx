import { GardenPostView } from "../../components/garden-post-view";

export default async function PublishedContentPage({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}) {
  const { section, slug } = await params;
  return <GardenPostView postSlug={slug} sectionSlug={section} />;
}

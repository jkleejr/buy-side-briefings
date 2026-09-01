import { getHomeData } from "@/lib/home-terminal";
import HomeTerminal from "@/components/home-terminal";
import SectorRotation from "@/components/sector-rotation";

export const revalidate = 300;

export default async function Home() {
  const data = await getHomeData();
  // SectorRotation fetches its own quotes and is an async server component, so
  // it is rendered here and handed to the client shell as a slot.
  return <HomeTerminal data={data} sectors={<SectorRotation />} />;
}

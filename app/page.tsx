import { getHomeData } from "@/lib/home-terminal";
import HomeTerminal from "@/components/home-terminal";

export const revalidate = 300;

export default async function Home() {
  const data = await getHomeData();
  return <HomeTerminal data={data} />;
}

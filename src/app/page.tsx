import Image from "next/image";
import { MorphingText } from "@/components/magicui/morphing-text";
import IpfsDownloader from  "./ipfsdownloader/page";
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">

      <MorphingText
        texts={["NFTinator", "IPFS Download", "Coming Soon"]}
        className="text-4xl font-bold"
      />
      {/* <IpfsDownloader /> */}
    </div>
  );
}

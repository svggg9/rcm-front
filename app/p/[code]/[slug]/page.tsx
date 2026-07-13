import ProductPage, {
  generateMetadata as generateProductMetadata,
} from "../../../product/[id]/page";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;

  return generateProductMetadata({
    params: Promise.resolve({ id: code }),
  });
}

export default async function PublicProductCodePage({ params }: Props) {
  const { code } = await params;

  return ProductPage({
    params: Promise.resolve({ id: code }),
  });
}
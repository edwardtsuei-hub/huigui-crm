import { redirect } from "next/navigation";

export default function ProductEditPage({ params }: { params: { id: string } }) {
  redirect("/products");
}

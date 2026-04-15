import { redirect } from "next/navigation";

export default function CustomerEditPage({ params }: { params: { id: string } }) {
  redirect(`/customers/${params.id}`);
}

import { redirect } from "next/navigation";
import Link from "next/link";

export default function SuccessPage() {
  redirect("/dashboard/success");
} 
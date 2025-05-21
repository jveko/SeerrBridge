import { redirect } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  redirect("/dashboard/settings");
} 
"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function credentialsLogin(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const result = await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  if (result?.error) {
    return { error: "Invalid email or password." };
  }

  redirect("/");
}

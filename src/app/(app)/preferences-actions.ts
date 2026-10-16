"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/session";

export type ThemePreference = "system" | "light" | "dark";

export async function setTheme(theme: ThemePreference) {
  await getCurrentMember();
  const store = await cookies();
  if (theme === "system") store.delete("theme");
  else store.set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax" });
  revalidatePath("/", "layout");
}

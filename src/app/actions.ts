"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setCompanyCookie(companyId: string | null) {
  if (companyId) {
    cookies().set("selectedCompanyId", companyId, { path: "/", maxAge: 60 * 60 * 24 * 30 }); // 30 days
  } else {
    cookies().delete("selectedCompanyId");
  }
  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, withClient } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { loginSchema, signupSchema } from "@/lib/validation";

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    redirect("/login?error=" + encodeURIComponent(error));
  }

  const { email, password } = parsed.data;

  const { rows } = await query(
    `SELECT u.id, u.email, u.password_hash, p.user_type, p.first_name, p.last_name
     FROM users u
     JOIN profiles p ON u.id = p.id
     WHERE u.email = $1`,
    [email]
  );

  const user = rows[0];
  if (!user) {
    redirect("/login?error=" + encodeURIComponent("Invalid email or password"));
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    redirect("/login?error=" + encodeURIComponent("Invalid email or password"));
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.userType = user.user_type;
  await session.save();

  revalidatePath("/", "layout");

  // Redirect based on user type
  const dashboardMap: Record<string, string> = {
    guide: "/guide",
    driver: "/driver",
    city_admin: "/city",
    super_admin: "/city",
  };

  // Admins without a selected city go to city selection first
  if ((user.user_type === "city_admin" || user.user_type === "super_admin") && !session.adminCityId) {
    redirect("/city/select");
  }

  redirect(dashboardMap[user.user_type] ?? "/");
}

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });

  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message || "Invalid input";
    redirect("/register?error=" + encodeURIComponent(error));
  }

  const { email, password, firstName, lastName } = parsed.data;

  try {
    await withClient(async (client) => {
      const { rows: existing } = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      if (existing.length > 0) {
        throw new Error("Email already registered");
      }

      const passwordHash = await hashPassword(password);

      const { rows: userRows } = await client.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [email, passwordHash]
      );
      const userId = userRows[0].id;

      await client.query(
        `INSERT INTO profiles (id, first_name, last_name, user_type)
         VALUES ($1, $2, $3, 'tourist')`,
        [userId, firstName, lastName]
      );
    });

    revalidatePath("/", "layout");
    redirect("/login?message=Account+created+successfully");
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;
    redirect("/register?error=" + encodeURIComponent(err.message));
  }
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  revalidatePath("/", "layout");
  redirect("/");
}

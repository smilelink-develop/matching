import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type CurrentAccount = {
  id: number;
  loginId: string;
  name: string;
  role: string;
};

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function hashPasscode(passcode: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(passcode, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPasscode(passcode: string, storedHash: string) {
  const [salt, existing] = storedHash.split(":");
  if (!salt || !existing) return false;
  const derived = scryptSync(passcode, salt, 64);
  return timingSafeEqual(Buffer.from(existing, "hex"), derived);
}

export async function createSession(accountId: number, impersonatedById?: number | null) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.staffSession.create({
    data: {
      accountId,
      token,
      impersonatedById: impersonatedById ?? null,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function writeSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.staffSession.findUnique({
    where: { token },
    include: {
      account: {
        select: {
          id: true,
          loginId: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma.staffSession.delete({ where: { token } }).catch(() => undefined);
    }
    return null;
  }

  return session;
}

export async function getCurrentAccount(): Promise<CurrentAccount | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  return {
    id: session.account.id,
    loginId: session.account.loginId,
    name: session.account.name,
    role: session.account.role,
  };
}

export async function requireCurrentAccount() {
  const account = await getCurrentAccount();
  if (!account) {
    redirect("/login");
  }
  return account;
}

export async function requireAdminAccount() {
  const account = await requireCurrentAccount();
  if (account.role !== "admin") {
    redirect("/");
  }
  return account;
}

export async function requireApiAccount() {
  const account = await getCurrentAccount();
  if (!account) {
    throw new AuthError("ログインが必要です", 401);
  }
  return account;
}

export async function requireApiAdmin() {
  const account = await requireApiAccount();
  if (account.role !== "admin") {
    throw new AuthError("管理者のみ操作できます", 403);
  }
  return account;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.staffSession.deleteMany({ where: { token } });
  }
  await clearSessionCookie();
}

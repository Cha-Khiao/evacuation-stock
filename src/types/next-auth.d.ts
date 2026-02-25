import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      shelterId: string | null;
      shelterName: string | null;
    } & DefaultSession["user"]
  }

  interface User {
    role: string;
    shelterId?: string | null;
    shelterName?: string | null;
  }
}
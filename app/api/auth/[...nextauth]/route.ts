import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Note le @ pour l'alias

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
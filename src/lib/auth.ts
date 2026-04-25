import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email.toLowerCase() } });
        if (!user || !user.password) return null;
        if (!user.isActive) return null;
        const ok = await bcrypt.compare(creds.password, user.password);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          image: user.image ?? undefined,
        } as any;
      },
    }),
    CredentialsProvider({
      id: 'wa-otp',
      name: 'WhatsApp OTP',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(creds) {
        if (!creds?.phone) return null;
        // Demo OTP: any 4-digit code accepted; in prod replace with verification
        const phone = creds.phone.replace(/\D/g, '');
        if (!phone) return null;
        let user = await prisma.user.findFirst({ where: { phone } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: `${phone}@cust.cafeqr.local`,
              phone,
              role: 'CUSTOMER',
              name: `Customer ${phone.slice(-4)}`,
            },
          });
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          phone: user.phone ?? undefined,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
      }
      return session;
    },
  },
};

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  phone?: string;
  image?: string;
};

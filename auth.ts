import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db';
import { users } from './db/schema/users';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  adapter: DrizzleAdapter(db),
  pages: {
    signIn: '/login'
  },
  providers: [
    CredentialsProvider({
      name: 'Sign in',
      id: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'example@example.com',
        },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }
        const user = await db.select().from(users).where(eq(users.email, String(credentials.email)))
        console.log(user)
        if (
          !user[0]||
          !(await bcrypt.compare(String(credentials.password), user[0].password!))
        ) {
          return null;
        }
        console.log("HERE")
        return {
          id: user[0].id,
          email: user[0].email,
          username: user[0].username,
          randomKey: 'Hey cool',
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) =>{
      if (user) {
        token.uid = user;
      }
      return token
    },
    session: async ({ session, token }) => {
      const user = await db.select().from(users).where(eq(users.email, String(session.user.email)))
      session.user = {
        email: session.user.email,
        id: user[0].id,
        emailVerified: new Date(),
      }
  
      return session;
    },
  },
  

});

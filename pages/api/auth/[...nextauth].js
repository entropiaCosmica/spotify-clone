import NextAuth from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
import SpotifyApi, { LOGIN_URL } from "../../../lib/spotify"


async function refreshAccessToken(token) {
  try {
    spotifyApi.setAccessToken(token.accessToken)
    SpotifyApi.setRefreshToken(token.refreshToken)

    const { body: refreshedToken } = await spotifyApi.refreshAccessToken
    console.log("REFRESHED TOKEN IS", refreshedToken)

    return {
      ...token,
      accessToken: refreshedToken.access_token,
      accessTokenExpires: Date.now + refreshedToken.expires_at * 1000,
      refreshToken: refreshedToken.refreshToken ?? token.refreshToken,

    }
  } catch (error) {
    console.log(error)

    return {
      ...token,
      error: "RefreshAccessTokenError"
    }
  }
}

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    SpotifyProvider({
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
      authorization: LOGIN_URL
    }),
    // ...add more providers here
  ],
  secret: process.env.JWT_SECRET,
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // initial sign in 
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          username: account.providerAccountId,
          accessTokenExpires: account.expires_at * 1000,
        }
      }
      //return previous token if access token has not expired
      if (Date.now() < token.accessTokenExpires) {
        console.log("VALID TOKEN")
        return token
      }
      console.log("TOKEN EXPIRED")
      return await refreshAccessToken(token)
      //access token has expires, refresh it
    },

    async session({ session, token }) {
      session.user.accessToken = token.accessToken
      session.user.refreshToken = token.refreshAccessToken
      session.user.username = token.username

      return session
    }

  }
})
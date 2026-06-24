/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    ENOKI_PUB_KEY: process.env.ENOKI_PUB_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID,
    SALT_SERVICE_URL: process.env.SALT_SERVICE_URL,
    ZK_PROVER_URL: process.env.ZK_PROVER_URL,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['@prisma/client'],
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    GOOGLE_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    ELEVEN_API_KEY: process.env.ELEVENLABS_API_KEY,
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
    CONFIDENCE_THRESHOLD: process.env.CONFIDENCE_THRESHOLD,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    SUPERVISOR_USERNAME: process.env.SUPERVISOR_USERNAME,
    SUPERVISOR_PASSWORD: process.env.SUPERVISOR_PASSWORD,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cursor cloud preview hosts to load the app in development
  allowedDevOrigins: [
    "*.agent.cvm.dev",
    "*.cvm.dev",
    "localhost",
    "127.0.0.1",
  ],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;

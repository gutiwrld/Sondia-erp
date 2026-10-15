import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App privada: todas las pantallas dependen de quién ha entrado, así que
  // renderizamos en cada petición (modelo clásico, sin Cache Components).
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

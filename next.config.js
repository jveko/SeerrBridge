/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["fs", "path"],
  // Configure remote image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'walter-r2.trakt.tv',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
    });
    
    // Disable webpack caching to prevent "Array buffer allocation failed" errors
    config.cache = false;
    
    // Add memory optimization for Node.js
    config.optimization = {
      ...config.optimization,
      minimize: true,
    };
    
    return config;
  },
  // Add valid experimental options
  experimental: {
    optimizePackageImports: ['lucide-react'],
    memoryBasedWorkersCount: true,
  },
}

module.exports = nextConfig; 
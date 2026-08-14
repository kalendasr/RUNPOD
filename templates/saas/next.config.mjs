/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output bundles a minimal server + only the node_modules the
  // app actually needs, which keeps the production Docker image small.
  output: "standalone",
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @toonstrip/next/server (M13) pulls in @toonstrip/cli, which loads
  // @napi-rs/canvas — a native addon. Left to webpack it tries to bundle the
  // platform .node binaries as JS modules and fails; this tells Next to
  // `require()` it at runtime in the server's own Node process instead.
  serverExternalPackages: ["@napi-rs/canvas", "@toonstrip/cli"],
};

export default nextConfig;

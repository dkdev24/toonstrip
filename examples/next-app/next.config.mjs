/** @type {import('next').NextConfig} */
const nextConfig = {
  // @toonstrip/cli's renderPlaceholder (M13) loads @napi-rs/canvas — a native
  // addon. Left to webpack it tries to bundle the platform .node binaries as
  // JS modules and fails; this tells Next to `require()` it at runtime in the
  // server's own Node process instead.
  serverExternalPackages: ["@napi-rs/canvas", "@toonstrip/cli"],
};

export default nextConfig;

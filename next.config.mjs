/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets `npm run dev` serve a phone on the same network (home Wi-Fi or an
  // iPhone hotspot) at the laptop's IP. Without this, Next blocks the
  // cross-origin /_next requests and client-side navigation breaks.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.20.10.*"],
};

export default nextConfig;

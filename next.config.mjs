// On Vercel, the public address of the site (e.g. namaz-tracker-opal.vercel.app). Email links are
// built from it, so they never point at a per-deployment address that asks for a Vercel login.
const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_SITE_URL: production ? `https://${production}` : "" },
};
export default nextConfig;

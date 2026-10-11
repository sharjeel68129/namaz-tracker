/** Lets phones add the site to the home screen, where it opens full screen like an app. */
export default function manifest() {
  return {
    name: "Namaz Tracker",
    short_name: "Namaz",
    description: "Log your five daily prayers and keep count of the Qaza you owe.",
    start_url: "/app",
    display: "standalone",
    background_color: "#171614",
    theme_color: "#171614",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

import type { MetadataRoute } from "next";

// Ask search engines to stay out of the private areas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/admin/"],
      },
    ],
  };
}

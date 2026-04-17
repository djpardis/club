/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });

  eleventyConfig.addFilter("navActive", (pageUrl, itemUrl) => {
    const p = (pageUrl || "/").replace(/\/$/, "") || "/";
    const i = (itemUrl || "/").replace(/\/$/, "") || "/";
    if (i === "/") return p === "/" || p === "";
    return p === i || p.startsWith(i + "/");
  });

  eleventyConfig.addFilter("readableDate", (dateObj) => {
    if (!dateObj) return "";
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  });

  eleventyConfig.addFilter("dateIso", (dateObj) => {
    if (!dateObj) return "";
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return d.toISOString().slice(0, 10);
  });

  eleventyConfig.addFilter("shortDate", (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const day = String(d.getDate()).padStart(2, "0");
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    return `${weekday} ${month} ${day}`;
  });

  eleventyConfig.addFilter("isFuture", (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() >= Date.now() - 24 * 60 * 60 * 1000;
  });

  eleventyConfig.addFilter("upcomingGigs", (gigs) => {
    if (!Array.isArray(gigs)) return [];
    const now = Date.now() - 24 * 60 * 60 * 1000;
    return gigs
      .filter((g) => g.date && new Date(g.date).getTime() >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  eleventyConfig.addFilter("sortMixtapesDesc", (items) => {
    if (!Array.isArray(items)) return [];
    return [...items].sort((a, b) => (b.year || 0) - (a.year || 0));
  });

  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}

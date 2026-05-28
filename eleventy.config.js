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

  // Rewrites relative URLs ("/foo", `src="/bar`) to absolute ones for use
  // inside the RSS/Atom feed where readers fetch content out of context.
  eleventyConfig.addFilter("absoluteUrls", (html, base) => {
    if (!html || !base) return html;
    const root = String(base).replace(/\/$/, "");
    return String(html).replace(
      /(\s(?:href|src|poster)\s*=\s*["'])\/(?!\/)/gi,
      `$1${root}/`
    );
  });

  eleventyConfig.addFilter("rfc3339", (dateObj) => {
    if (!dateObj) return "";
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return d.toISOString();
  });

  /** JSON-stringify a value for safe embedding inside application/ld+json (quotes, newlines). */
  eleventyConfig.addFilter("jsonEncode", (value) => JSON.stringify(value ?? ""));

  /** Escape text for XML (sitemap captions, etc.). */
  eleventyConfig.addFilter("xmlEscape", (value) => {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  });

  function decodeHtmlEntities(value) {
    return String(value)
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ");
  }

  function headingText(html) {
    return decodeHtmlEntities(
      String(html)
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function slugifyHeading(value) {
    return headingText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  }

  function uniqueHeadingId(base, seen) {
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  }

  function songLeadText(html) {
    if (!/<em\b/i.test(html)) return "";
    const title = String(html).match(/<em\b[^>]*>([\s\S]*?)<\/em>/i);
    return headingText(title ? title[1] : html).replace(/[.\s]+$/g, "");
  }

  eleventyConfig.addFilter("headingToc", (html) => {
    if (!html) return [];
    const seen = new Map();
    const items = [];
    let parentId;
    const blockPattern = /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>|<p\b([^>]*)>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)<\/p>/gi;

    for (const match of String(html).matchAll(blockPattern)) {
      if (match[1]) {
        const level = Number(match[1]);
        const attrs = match[2];
        const text = headingText(match[3]);
        const existingId = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
        const id = existingId ? existingId[1] : uniqueHeadingId(slugifyHeading(text), seen);
        items.push({ id, text, level, parentId: undefined });
        parentId = id;
        continue;
      }

      const text = songLeadText(match[5]);
      if (!parentId || !text) continue;
      const existingId = match[4].match(/\bid\s*=\s*["']([^"']+)["']/i);
      const id = existingId ? existingId[1] : uniqueHeadingId(slugifyHeading(text), seen);
      items.push({ id, text, level: 4, parentId });
    }

    return items.filter((item) => item.text);
  });

  eleventyConfig.addFilter("addHeadingIds", (html) => {
    if (!html) return html;
    const seen = new Map();
    let parentId;
    return String(html).replace(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>|<p\b([^>]*)>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)<\/p>/gi, (match, level, attrs, inner, paragraphAttrs, strongInner) => {
      if (level) {
        const existingId = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
        const id = existingId ? existingId[1] : uniqueHeadingId(slugifyHeading(inner), seen);
        parentId = id;
        if (existingId) return match;
        return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
      }

      const text = songLeadText(strongInner);
      if (!parentId || !text || /\bid\s*=/.test(paragraphAttrs)) return match;
      const id = uniqueHeadingId(slugifyHeading(text), seen);
      return match.replace(/^<p\b([^>]*)>/i, `<p$1 id="${id}">`);
    });
  });

  // All mixtape post pages, newest first.
  eleventyConfig.addCollection("mixtapes", (collectionApi) => {
    return collectionApi
      .getAll()
      .filter((item) => /^\/mixtapes\/\d{4}\/$/.test(item.url || ""))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  });

  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));

  // Make every external link open in a new tab with safe rel attrs.
  const SITE_HOSTS = new Set(["djpardis.club", "www.djpardis.club", "localhost"]);
  eleventyConfig.addTransform("externalLinks", function (content) {
    if (!this.page || !this.page.outputPath || !this.page.outputPath.endsWith(".html")) {
      return content;
    }
    return content.replace(/<a\b([^>]*?)href=(["'])([^"']+)\2([^>]*)>/gi, (match, before, quote, href, after) => {
      if (!/^https?:\/\//i.test(href)) return match;
      try {
        const host = new URL(href).hostname;
        if (SITE_HOSTS.has(host)) return match;
      } catch {
        return match;
      }
      const attrs = before + after;
      if (/\btarget\s*=/i.test(attrs)) return match;
      const relMatch = attrs.match(/\brel\s*=\s*(["'])([^"']*)\1/i);
      const existingRel = relMatch ? relMatch[2].split(/\s+/).filter(Boolean) : [];
      const relSet = new Set(existingRel.map((r) => r.toLowerCase()));
      relSet.add("noopener");
      relSet.add("noreferrer");
      const relString = `rel="${[...relSet].join(" ")}"`;
      let newBefore = before;
      let newAfter = after;
      if (relMatch) {
        if (before.match(/\brel\s*=/i)) {
          newBefore = before.replace(/\brel\s*=\s*(["'])([^"']*)\1/i, relString);
        } else {
          newAfter = after.replace(/\brel\s*=\s*(["'])([^"']*)\1/i, relString);
        }
        return `<a${newBefore}href=${quote}${href}${quote}${newAfter} target="_blank">`;
      }
      return `<a${before}href=${quote}${href}${quote}${after} target="_blank" ${relString}>`;
    });
  });

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

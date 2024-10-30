import * as cheerio from "cheerio";

import retry from "fetch-retry";

interface Article {
  title?: string;
  url?: string;
  date?: string;
  content?: string;
}

type Environment = "worker" | "next" | "none";

const BASE_URL = "https://www.paulgraham.com/";
const ARTICLES_URL = BASE_URL + "articles.html";

const fetch = retry(global.fetch);

function extractMonthAndYear(html: string) {
  // Find the first instance of a 4-digit year
  const yearRegex = /\b\d{4}\b/;
  const yearMatch = html.match(yearRegex);

  if (yearMatch === null || yearMatch.index === undefined) return null;

  // Extract the surrounding text to find the month
  const yearIndex = yearMatch.index;
  const surroundingText = html.substring(yearIndex - 20, yearIndex + 5);

  // Extract the month and year
  const monthYearRegex =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s\d{4}\b/;
  const monthYearMatch = surroundingText.match(monthYearRegex);
  return monthYearMatch && monthYearMatch[0];
}

export async function fetchArticleContent(
  url: string,
  index: number = 0,
  environment: Environment = "none"
): Promise<Article> {
  const response = await fetch(url, {
    retries: 3,
    retryDelay: function (attempt, error, response) {
      return Math.pow(2, attempt) * 1000; // 1000, 2000, 4000
    },
    ...(environment === "worker"
      ? {
          cf: {
            cacheEverything: true,
            cacheTtl: 60 * 60 * 24 * 7 + index * 60 * 60, // 1 week + index amount of hours
          },
        }
      : null),
    ...(environment === "next"
      ? {
          next: {
            revalidate: 60 * 60 * 24 * 7 + index * 60 * 60, // 1 week + index amount of hours
          },
        }
      : null),
  });
  const data = await response.text();
  const $ = cheerio.load(data);

  const elements: string[] = [];
  $("font").each((i, el) => {
    const element = cheerio.load(el.children);
    const html = element.html() || "";
    if (element.length >= 1 || (html.startsWith("[") && html.endsWith("]"))) {
      elements.push(html);
    }
  });

  const joined = elements.join("");
  const content = joined.replace("\n", " ").trim();
  const month = extractMonthAndYear(joined) || "NA";
  const date = month === "NA" ? "NA" : new Date(month).toUTCString();

  if (date === "NA") {
    console.log("Failed to extract date for", url);
  }

  return { content, date };
}

export async function fetchArticles(
  environment: Environment = "none"
): Promise<Article[]> {
  const response = await fetch(ARTICLES_URL, {
    ...(environment === "worker"
      ? {
          cf: {
            cacheEverything: true,
            cacheTtl: 60, // 1 minute
          },
        }
      : null),
    ...(environment === "next"
      ? ({
          next: {
            revalidate: 60, // 1 minute
          },
        } as any)
      : null),
  });
  const data = await response.text();
  const $ = cheerio.load(data);

  const articles: Article[] = [];
  // TODO_HACK: Num of links to skip. The first 3 links are not the most recent essays.
  // Rather, Paul shares the best essays to start "if you're not sure which to read [first]

  // Find all 'a' tags with hrefs, skip those that have no actual text
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const title = $(element).text().trim(); // Extracts only the text, skips inner HTML tags
    const url = href && href.endsWith(".html") && title ? BASE_URL + href : "";

    if (url === "https://paulgraham.com/rss.html") {
      return;
    }

    articles.push({
      title,
      url,
    });
  });

  return articles;
}

export async function fetchContent(
  articles: Article[],
  environment: Environment = "none"
) {
  return Promise.all(
    articles.map(async (article, i) => {
      if (article.url) {
        const content = await fetchArticleContent(article.url, i, environment);
        return { ...article, ...content };
      } else {
        return article;
      }
    })
  );
}
export function prettifyXML(xml: string, tab = "\t"): string {
  let formatted = "",
    indent = "";
  xml.split(/>\s*</).forEach((node) => {
    if (node.match(/^\/\w/)) indent = indent.substring(tab.length); // decrease indent

    // Ignore formatting for description tags
    if (node.includes("<description>")) {
      formatted += node + ">\r\n";
    } else {
      formatted += indent + "<" + node + ">\r\n";
      if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab; // increase indent
    }
  });

  return formatted.substring(1, formatted.length - 3);
}

export function generateRssFeed(articles: Article[]): string {
  const rss = `<?xml version="1.0"?>
    <rss version="2.0">
    <channel>
      <title>Paul Graham: Essays</title>
      <link>${BASE_URL}</link>
      <description>Essays.</description>
      <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
      ${articles
        .filter((article) => article.title && article.url)
        .map(
          (article) => `
        <item>
            <title>${article.title}</title>
            <link>${article.url}</link>
            <pubDate>${article.date}</pubDate>
            ${
              article?.content
                ? `<description>
                <![CDATA[${article.content
                  .replace("\n", " ")
                  .replace("  ", " ")}]]>
            </description>`
                : ""
            }
        </item>
        `
        )
        .join("")}
    `;
  return rss;
}

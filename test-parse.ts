import fs from "fs";
import * as cheerio from "cheerio";

const html = fs.readFileSync("articles.html", "utf-8");
const $ = cheerio.load(html);
const links: string[] = [];

$("a[href]").each((i, el) => {
  const href = $(el).attr("href");
  const title = $(el).text().trim();
  if (href && href.endsWith(".html") && title) {
    links.push(title);
  }
});

console.log(links.slice(0, 10));

import fs from "fs";

import { fetchArticles, fetchContent, generateRssFeed } from "./feed";

const links = await fetchArticles();
const articles = await fetchContent(links);
const rss = generateRssFeed(articles);

fs.writeFileSync("./feed.rss", rss);

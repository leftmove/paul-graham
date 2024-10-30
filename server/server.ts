import express from "express";

import { fetchArticles, fetchContent, generateRssFeed } from "../feed";

const app = express();
const environment = "none"; // Not required for this example

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/essays", async (req, res) => {
  const links = await fetchArticles(environment);
  const articles = await fetchContent(links);
  const rss = generateRssFeed(articles);

  res.send(rss);
});

# Paul Graham RSS Feed

An RSS feed for Paul Graham's essays.

This project was created because [Aaron Swart's RSS feed](https://paulgraham.com/rss.html) on Paul Graham's website stopped working. And because I wanted the full text along with the publication date for my RSS reader.

Inspired by Daniel Olshansky's [feed](https://github.com/Olshansk/pgessays-rss). (The starting point for this project was an AI translation of his Python code.)

The hosted version of this feed is available at **[anonyonoor.com/feeds/paul-graham](https://www.anonyonoor.com/feeds/paul-graham)**.

# Features

- Checks for updates every minute.
- Includes the full text of each essay.
- Includes the publication date of each essay.
- Includes the URL and title of each essay.
- Self-host possible.

# Usage

If you don't want to use the hosted version above, you can run the scripts yourself.

The following code will generate an RSS feed and save it to `feed.rss`.

```javascript
import fs from "fs";

import { fetchArticles, fetchContent, generateRssFeed } from "./feed";

const links = await fetchArticles();
const articles = await fetchContent(links);
const rss = generateRssFeed(articles);

fs.writeFileSync("./feed.rss", rss);
```

You can also use third party hosting providers, like [Cloudflare Workers](https://workers.cloudflare.com/) or any other provider you'd like.

(You can also use [Next.js](https://nextjs.org/), since that's what I used to create the hosted version. But that's bit overkill and not a goal of the repository.)

See the [server folder]("./server") for an example of how to use this with [Express.js](https://expressjs.com/), or the [worker folder]("./worker") for an example of how to use this with Cloudflare Workers.

---

Thanks Aaron Swartz for the idea.

You made the world a better place.

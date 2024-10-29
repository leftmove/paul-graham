import * as cheerio from 'cheerio';

import retry from 'fetch-retry';

interface Article {
	title?: string;
	url?: string;
	date?: string;
	content?: string;
}

const BASE_URL = 'https://www.paulgraham.com/';
const ARTICLES_URL = BASE_URL + 'articles.html';

const fetch = retry(global.fetch);

export async function fetchArticleContent(url: string, index: number = 0): Promise<Article> {
	const response = await fetch(url, {
		retries: 3,
		retryDelay: function (attempt, error, response) {
			return Math.pow(2, attempt) * 1000; // 1000, 2000, 4000
		},
		cf: {
			cacheEverything: true,
			cacheTtl: 60 * 60 * 24 * 7 + index * 60 * 60, // 1 week + index amount of hours
		},
	});
	const data = await response.text();
	const $ = cheerio.load(data);

	// Extract the main content. Most PG essays are inside <font> tags.
	const content = $('font').html() || '';
	const date = $('font').next().text().trim();

	return { content, date };
}

export async function fetchArticles(): Promise<Article[]> {
	const response = await fetch(ARTICLES_URL);
	const data = await response.text();
	const $ = cheerio.load(data);

	const articles: Article[] = [];
	// TODO_HACK: Num of links to skip. The first 3 links are not the most recent essays.
	// Rather, Paul shares the best essays to start "if you're not sure which to read [first]

	// Find all 'a' tags with hrefs, skip those that have no actual text
	$('a[href]').each((_, element) => {
		const href = $(element).attr('href');
		const title = $(element).text().trim(); // Extracts only the text, skips inner HTML tags
		const url = href && href.endsWith('.html') && title ? BASE_URL + href : '';

		articles.push({
			title,
			url,
		});
	});

	return articles;
}

export async function fetchContent(articles: Article[]) {
	return Promise.all(
		articles.map(async (article) => {
			if (article.url) {
				const content = await fetchArticleContent(article.url);
				return { ...article, ...content };
			} else {
				return article;
			}
		})
	);
}

export function prettifyXML(xml: string, tab = '\t') {
	// tab = optional indent value, default is tab (\t)
	var formatted = '',
		indent = '';
	xml.split(/>\s*</).forEach(function (node) {
		if (node.match(/^\/\w/)) indent = indent.substring(tab.length); // decrease indent by one 'tab'
		formatted += indent + '<' + node + '>\r\n';
		if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab; // increase indent
	});
	return formatted.substring(1, formatted.length - 3);
}

export function generateRssFeed(articles: Article[]): string {
	const rss = prettifyXML(`<?xml version="1.0"?>
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
            ${
							article?.content
								? `<description>
                <![CDATA[${JSON.stringify(article.content)}]]>
            </description>`
								: ''
						}
        </item>
        `
				)
				.join('')}
    `);
	return rss;
}

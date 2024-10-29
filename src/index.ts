import { fetchArticles, fetchContent, generateRssFeed } from './feed';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const links = await fetchArticles();
		const articles = await fetchContent(links);
		const rss = generateRssFeed(articles);

		return new Response(rss);
	},
} satisfies ExportedHandler<Env>;

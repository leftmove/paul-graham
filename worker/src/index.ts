import { fetchArticles, fetchContent, generateRssFeed } from '../../feed';

// You should copy all the code from feed.ts instead of importing it
// It's imported here for simplicity, but in a real worker project everything should be in the same folder.

const environment = 'worker';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const links = await fetchArticles(environment);
		const articles = await fetchContent(links, environment);
		const rss = generateRssFeed(articles);

		return new Response(rss);
	},
} satisfies ExportedHandler<Env>;

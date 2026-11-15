import { error } from '@sveltejs/kit';
import { getCategory } from '$lib/blog/categories';
import {
	filterPostsByCategory,
	getCategoriesWithCounts,
	getFeaturedPost,
	getPublishedPosts
} from '$lib/server/blog';

export function load({ url }: { url: URL }) {
	const requested = url.searchParams.get('category');
	const category = requested ? getCategory(requested) : undefined;

	if (requested && !category) {
		error(404, 'That journal chapter does not exist.');
	}

	const allPosts = getPublishedPosts();
	const posts = filterPostsByCategory(category?.id ?? null, allPosts);

	return {
		posts,
		categories: getCategoriesWithCounts(),
		totalPosts: allPosts.length,
		selectedCategory: category ?? null,
		featured: category ? null : (getFeaturedPost(allPosts) ?? null)
	};
}

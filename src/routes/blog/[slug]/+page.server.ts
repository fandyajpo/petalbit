import { error } from '@sveltejs/kit';
import { getPostBySlug, getRelatedPosts } from '$lib/server/blog';

export function load({ params }: { params: { slug: string } }) {
	const post = getPostBySlug(params.slug);
	if (!post) {
		error(404, 'That essay is not in the journal.');
	}

	return {
		post,
		related: getRelatedPosts(post.slug, 3)
	};
}

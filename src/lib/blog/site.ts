export const SITE_URL = 'https://petalbit.vercel.app';
export const SITE_NAME = 'Petalbit';
export const JOURNAL_NAME = 'The Petalbit Journal';
export const JOURNAL_DESCRIPTION =
	'A little journal of feelings and flowers: botanical meanings, romantic notes, digital gifts, and pixel-art stories from Petalbit.';

export function absoluteUrl(path = '/'): string {
	return new URL(path, SITE_URL).href;
}

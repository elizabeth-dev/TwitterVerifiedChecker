import * as http from 'node:http';

const cache = new Map();

setInterval(() => {
	cache.clear();
}, 1000 * 60 * 60 * 24);

http
	.createServer(async (req, res) => {
		try {
			console.log(req.url);
			const username = req.url.split('/')[1];
			if (!username) {
				res.writeHead(404);
				res.end();
				return;
			}

			res.setHeader('Access-Control-Allow-Origin', '*');

			if (cache.has(username)) {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(cache.get(username)));
				return;
			}

			const token = await getBearerToken();

			if (!token) {
				res.writeHead(500);
				res.end();
				return;
			}

			const guestToken = await getGuestToken(username);

			if (!guestToken) {
				res.writeHead(500);
				res.end();
				return;
			}

			const twitterRes = await fetch(
				`https://twitter.com/i/api/graphql/G3KGOASz96M-Qu0nwmGXNg/UserByScreenName?variables=%7B%22screen_name%22%3A%22${username}%22%2C%22withSafetyModeUserFields%22%3Atrue%7D&features=%7B%22hidden_profile_likes_enabled%22%3Atrue%2C%22hidden_profile_subscriptions_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22subscriptions_verification_info_is_identity_verified_enabled%22%3Afalse%2C%22subscriptions_verification_info_verified_since_enabled%22%3Atrue%2C%22highlights_tweets_tab_ui_enabled%22%3Atrue%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%7D&fieldToggles=%7B%22withAuxiliaryUserLabels%22%3Afalse%7D`,
				{
					credentials: 'include',
					headers: {
						'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/117.0',
						Accept: '*/*',
						'Accept-Language': 'en-US,en;q=0.5',
						'content-type': 'application/json',
						'x-csrf-token': '4bdf09b5bebdc5dc6a67723fb79231fd',
						'x-guest-token': guestToken,
						'x-twitter-client-language': 'en',
						'x-twitter-active-user': 'yes',
						'Sec-Fetch-Dest': 'empty',
						'Sec-Fetch-Mode': 'cors',
						'Sec-Fetch-Site': 'same-origin',
						authorization: `Bearer ${token}`,
					},
					referrer: `https://twitter.com/${username}`,
					method: 'GET',
					mode: 'cors',
				}
			);

			if (twitterRes.status !== 200) {
				res.writeHead(twitterRes.status);
				res.end();
				return;
			}

			const twitterData = await twitterRes.json();

			if (!twitterData.data.user) {
				res.writeHead(404);
				res.end();
				return;
			}

			const verifiedTimestamp = twitterData.data.user.result.verification_info.reason?.verified_since_msec;
			const result = {
				username,
				isBlue: !!verifiedTimestamp,
				blueSince: verifiedTimestamp,
				blueHidden: !!verifiedTimestamp && twitterData.data.user.result.is_blue_verified === false,
			};

			if (cache.size > 1000) cache.clear();

			cache.set(username, result);

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(result));
		} catch (e) {
			console.error(e);

			res.writeHead(500);
			res.end();
		}
	})
	.listen(8080, () => {
		console.log('Listening on port 8080');
	});

const bearerTokenRegex = new RegExp('"Bearer (.*?)"', '');

const getBearerToken = async () => {
	const res = await fetch('https://abs.twimg.com/responsive-web/client-web/main.f367860a.js', {
		credentials: 'omit',
		headers: {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/117.0',
			Accept: '*/*',
			'Accept-Language': 'en-US,en;q=0.5',
			'Sec-Fetch-Dest': 'script',
			'Sec-Fetch-Mode': 'cors',
			'Sec-Fetch-Site': 'cross-site',
		},
		referrer: 'https://twitter.com/',
		method: 'GET',
		mode: 'cors',
	});

	if (res.status !== 200) return null;

	const text = await res.text();
	return bearerTokenRegex.exec(text)?.[1] ?? null;
};

const guestTokenRegex = new RegExp('"gt=(.*?);', '');

const getGuestToken = async (username) => {
	const firstRes = await fetch(`https://twitter.com/${username}`, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/117.0',
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.5',
			'Upgrade-Insecure-Requests': '1',
			'Sec-Fetch-Dest': 'document',
			'Sec-Fetch-Mode': 'navigate',
			'Sec-Fetch-Site': 'none',
			'Sec-Fetch-User': '?1',
		},
		method: 'GET',
		mode: 'no-cors',
		redirect: 'manual',
	});

	if (firstRes.status !== 302) return null;

	const cookie = firstRes.headers.get('set-cookie').split(';')[0];

	const res = await fetch(`https://twitter.com/${username}`, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/117.0',
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.5',
			'Upgrade-Insecure-Requests': '1',
			'Sec-Fetch-Dest': 'document',
			'Sec-Fetch-Mode': 'navigate',
			'Sec-Fetch-Site': 'none',
			'Sec-Fetch-User': '?1',
			Cookie: cookie,
		},
		method: 'GET',
		mode: 'no-cors',
	});

	if (res.status !== 200) return null;

	const text = await res.text();
	return guestTokenRegex.exec(text)?.[1] ?? null;
};

//gt=1699156261911028034

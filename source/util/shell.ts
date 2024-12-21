export type ShellOptions<D = {}> = D & MetaDescriptor;
export function ApplyMetaDescriptorDefaults(options: ShellOptions, defaults: Readonly<Partial<ShellOptions>>) {
	if (defaults.title && !options.title)             options.title       = defaults.title;
	if (defaults.description && !options.description) options.description = defaults.description;

	if (defaults.meta && !options.meta)     options.meta   = defaults.meta;
	if (defaults.og && !options.og)         options.og     = defaults.og;
	if (defaults.jsonLD && !options.jsonLD) options.jsonLD = defaults.jsonLD;
}

export type InferShellOptions<F> = F extends (jsx: any, options: infer U) => any ? U : never;

export type MetaDescriptor = {
	title?: string,
	description?: string,
	meta?: Record<string, string>,
	og?: OpenGraph<string>
	jsonLD?: LdJsonObject[];
}

export function RenderMetaDescriptor<T>(options: ShellOptions<T>) {
	let out = "";

	if (options.title) out += `<title>${EscapeHTML(options.title)}</title>`;
	if (options.description) out += `<meta name="description" content="${EscapeHTML(options.description)}">\n`;

	if (options.meta) for (const key in options.meta) {
		out += `<meta name="${EscapeHTML(key)}" content="${EscapeHTML(options.meta[key])}">\n`;
	}

	if (options.jsonLD) for (const json of options.jsonLD) {
		out += `<script>${EscapeHTML(JSON.stringify(json))}</script>\n`;
	}

	// Auto apply og:title + og:description if not present
	if (options.title && !options.og?.title) out += `<meta property="og:title" content="${EscapeHTML(options.title)}">\n`;
	if (options.description && !options.og?.description) out += `<meta property="og:description" content="${EscapeHTML(options.description)}">\n`;

	// Apply open graphs
	if (options.og) out += RenderOpenGraph(options.og);

	return out;
}


function RenderOpenGraph<T extends string>(og: OpenGraph<T>) {
	// Manually encoding everything rather than using a loop to ensure they are in the correct order
	// And to ensure extra values can't leak in creating unsafe og tags

	const type = og.type || "website";
	let out = RenderProperty("og:type", type);

	if (og.title)       out += RenderProperty("og:title", og.title);
	if (og.description) out += RenderProperty("og:description", og.description);
	if (og.determiner)  out += RenderProperty("og:determiner",  og.determiner);
	if (og.url)         out += RenderProperty("og:url",  og.url);
	if (og.secure_url)  out += RenderProperty("og:secure_url",  og.secure_url);

	if (og.locale) {
		if (typeof og.locale === "string") out += RenderProperty("og:locale",  og.locale);
		else {
			out += RenderProperty("og:locale",  og.locale.base);
			for (const l of og.locale.alternative) out += RenderProperty("og:locale:alternative",  l);
		}
	}

	if (og.image) for (const img of og.image) {
		out += RenderProperty("og:image", img.url);
		if (img.secure_url) out += RenderProperty("og:image:secure_url", img.secure_url);
		if (img.type)       out += RenderProperty("og:image:type",       img.type);
		if (img.width)      out += RenderProperty("og:image:width",      img.width.toString());
		if (img.height)     out += RenderProperty("og:image:height",     img.height.toString());
		if (img.alt)        out += RenderProperty("og:image:alt",        img.alt);
	}

	if (og.video) for (const vid of og.video) {
		out += RenderProperty("og:video", vid.url);
		if (vid.secure_url) out += RenderProperty("og:video:secure_url", vid.secure_url);
		if (vid.type)       out += RenderProperty("og:video:type",       vid.type);
		if (vid.width)      out += RenderProperty("og:video:width",      vid.width.toString());
		if (vid.height)     out += RenderProperty("og:video:height",     vid.height.toString());
		if (vid.alt)        out += RenderProperty("og:video:alt",        vid.alt);
	}

	if (og.audio) for (const audio of og.audio) {
		out += RenderProperty("og:audio", audio.url);
		if (audio.secure_url) out += RenderProperty("og:audio:secure_url", audio.secure_url);
		if (audio.type)       out += RenderProperty("og:audio:type",       audio.type);
	}

	return out + RenderOpenGraphExtras(og);
}

function RenderProperty(name: string, value: string) {
	return `<meta property="${name}" content="${EscapeHTML(value)}">\n`
}

function RenderOpenGraphExtras<T extends OpenGraphType>(og: OpenGraph<T>) {
	let out = "";

	if (og.type === "music.song") {
		const g = og as OpenGraph<"music.song">;

		if (g.duration) out += RenderProperty("og:music:duration", g.duration.toString());
		if (g.album) for (const album of g.album) {
			if (typeof album === "string") out += RenderProperty("og:music:album", album);
			else {
				out += RenderProperty("og:music:album", album.url);
				if (album.disc) out += RenderProperty("og:music:album:disc",   album.disc.toString());
				if (album.track) out += RenderProperty("og:music:album:track", album.track.toString());
			}
		}
		if (g.musician) for (const profile of g.musician) out += RenderProperty("og:music:musician", profile);

		return out;
	}

	if (og.type === "music.album") {
		const g = og as OpenGraph<"music.album">;

		if (g.songs) for (const song of g.songs) {
			if (typeof song === "string") out += RenderProperty("og:music:song", song);
			else {
				out += RenderProperty("og:music:song", song.url);
				if (song.disc) out += RenderProperty("og:music:song:disc",   song.disc.toString());
				if (song.track) out += RenderProperty("og:music:song:track", song.track.toString());
			}
		}
		if (g.musician) for (const profile of g.musician) out += RenderProperty("og:music:musician", profile);
		if (g.release_date) out += RenderProperty("og:music:release_date", g.release_date.toISOString());

		return out;
	}

	if (og.type === "music.playlist") {
		const g = og as OpenGraph<"music.playlist">;

		if (g.songs) for (const song of g.songs) {
			if (typeof song === "string") out += RenderProperty("og:music:song", song);
			else {
				out += RenderProperty("og:music:song", song.url);
				if (song.disc) out += RenderProperty("og:music:song:disc",   song.disc.toString());
				if (song.track) out += RenderProperty("og:music:song:track", song.track.toString());
			}
		}
		if (g.creator) for (const profile of g.creator) out += RenderProperty("og:music:creator", profile);

		return out;
	}

	if (og.type === "music.radio_station") {
		const g = og as OpenGraph<"music.radio_station">;
		if (g.creator) for (const profile of g.creator) out += RenderProperty("og:music:creator", profile);
		return out;
	}

	if (og.type === "video.movie" || og.type === "video.episode" || og.type === "video.tv_show" || og.type === "video.other") {
		const g = og as OpenGraph<"video.episode">;

		if (g.actors) for (const actor of g.actors) {
			if (typeof actor === "string") out += RenderProperty("og:video:actor", actor);
			else {
				out += RenderProperty("og:video:actor", actor.url);
				out += RenderProperty("og:video:actor:role", actor.role);
			}
		}
		if (g.directors) for (const profile of g.directors) out += RenderProperty("og:video:director", profile);
		if (g.writers)   for (const profile of g.writers)   out += RenderProperty("og:video:writer", profile);
		if (g.duration)     out += RenderProperty("og:video:duration", g.duration.toString());
		if (g.release_date) out += RenderProperty("og:video:release_date", g.release_date.toISOString());
		if (g.tag)       for (const tag of g.tag)           out += RenderProperty("og:video:tag", tag);
		if (g.series)       out += RenderProperty("og:video:series", g.series);
	}

	if (og.type === "article") {
		const g = og as OpenGraph<"article">;

		if (g.published_time)  out += RenderProperty("og:article:published_time", g.published_time.toISOString());
		if (g.modified_time)   out += RenderProperty("og:article:modified_time", g.modified_time.toISOString());
		if (g.expiration_time) out += RenderProperty("og:article:expiration_time", g.expiration_time.toISOString());
		if (g.authors) for (const profile of g.authors) out += RenderProperty("og:article:author", profile);
		if (g.section)         out += RenderProperty("og:article:section", g.section);
		if (g.tag)     for (const tag of g.tag)         out += RenderProperty("og:video:tag", tag);
	}

	if (og.type === "book") {
		const g = og as OpenGraph<"book">;

		if (g.authors) for (const profile of g.authors) out += RenderProperty("og:article:author", profile);
		if (g.isbn)          out += RenderProperty("og:book:isbn", g.isbn);
		if (g.release_date)  out += RenderProperty("og:book:release_date", g.release_date.toISOString());
		if (g.tag)     for (const tag of g.tag)         out += RenderProperty("og:video:tag", tag);
	}

	if (og.type === "profile") {
		const g = og as OpenGraph<"profile">;

		if (g.first_name) out += RenderProperty("og:profile:first_name", g.first_name);
		if (g.last_name)  out += RenderProperty("og:profile:last_name", g.last_name);
		if (g.username)   out += RenderProperty("og:profile:username", g.username);
		if (g.gender)     out += RenderProperty("og:profile:gender", g.gender);
	}

	return "";
}


const escapeTo = {
	"&":  "&amp;",
	"<":  "&lt;",
	">":  "&gt;",
	"\"": "&quot;",
	"'":  "&#39;",
}

function EscapeHTML(str: string) {
	return str.replace(/[&<>"']/g, (match) => escapeTo[match as keyof typeof escapeTo] || match);
}




export type LdJsonObject    = { [Key in string]?: LdJsonValue | undefined; };
type LdJsonArray     = LdJsonValue[] | readonly LdJsonValue[];
type LdJsonPrimitive = string | number | boolean | null;
type LdJsonValue     = LdJsonPrimitive | LdJsonObject | LdJsonArray;


export type OpenGraphType = "website" | "article" | "book" | "profile"
	| "music.song"  | "music.album"   | "music.playlist" | "music.radio_station"
	| "video.movie" | "video.episode" | "video.tv_show"  | "video.other"
	| string;

export type OpenGraph<T extends OpenGraphType = string> = {
	// https://ogp.me/
	type?:        T,
	title?:       string,
	description?: string,
	determiner?:  string,

	url?:        string,
	secure_url?: string,

	locale?: string | {
		base: string,
		alternative: string[],
	},

	image?: OpenGraphImage[],
	video?: OpenGraphVideo[],
	audio?: OpenGraphAudio[],
} & (
	  T extends "music.song"          ? OpenGraphSong
	: T extends "music.album"         ? OpenGraphAlbum
	: T extends "music.playlist"      ? OpenGraphPlaylist
	: T extends "music.radio_station" ? OpenGraphRadioStation
	: T extends "video.movie"         ? OpenGraphMovie
	: T extends "video.episode"       ? OpenGraphEpisode
	: T extends "video.tv_show"       ? OpenGraphTvShow
	: T extends "video.other"         ? OpenGraphVideoOther
	: T extends "article"             ? OpenGraphArticle
	: T extends "book"                ? OpenGraphBook
	: T extends "profile"             ? OpenGraphProfile
	: {}
)

export type OpenGraphImage = {
	url:         string,
	secure_url?: string,
	type?:       string,
	width?:      number,
	height?:     number,
	alt?:        string,
}
export type OpenGraphVideo = {
	url: string,
	type?:       string,
	secure_url?: string,
	width?:      number,
	height?:     number,
	alt?:        string,
}
export type OpenGraphAudio = {
	url: string,
	type?:       string,
	secure_url?: string,
}



type OpenGraphSong = {
	duration?: number,
	album?: Array<string | {
		url:    string,
		disc?:  number,
		track?: number
	}>,
	musician?: string[], // link to URL with type profile
}
type OpenGraphAlbum = {
	songs?: Array<string | {
		url:    string,
		disc?:  number,
		track?: number
	}>,
	musician?:     string[], // link to URL with type profile
	release_date?: Date
}
type OpenGraphPlaylist = {
	songs?: Array<string | {
		url:    string,
		disc?:  number,
		track?: number
	}>,
	creator?: string[], // link to URL with type profile
}
type OpenGraphRadioStation = {
	creator?: string[], // link to URL with type profile
}


type OpenGraphMovie = {
	actors?:        Array<string | { url: string, role: string}>,
	directors?:     string[], // link to URL with type profile
	writers?:       string[], // link to URL with type profile
	duration?:     number,
	release_date?: Date,
	tag:           string[]
}
type OpenGraphEpisode = OpenGraphMovie & {
	series?: string // link to URL with type video.tv_show
};
type OpenGraphTvShow     = OpenGraphMovie;
type OpenGraphVideoOther = OpenGraphMovie;

type OpenGraphArticle = {
	published_time?:  Date,
	modified_time?:   Date,
	expiration_time?: Date,
	authors?:         string[], // link to URL with type profile
	section?:         string,
	tag?:             string,
}

type OpenGraphBook = {
	authors?:      string[], // link to URL with type profile
	isbn?:         string,
	release_date?: Date,
	tag?:          string
}

type OpenGraphProfile = {
	first_name?: string,
	last_name?:  string,
	username?:   string,
	gender?: "male" | "female" // don't @ me, it's in the spec
}
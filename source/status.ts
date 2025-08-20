const dictionary = {
	100: "Continue"                        as const,
	101: "Switching Protocols"             as const,
	102: "Processing"                      as const,
	103: "Early Hints"                     as const,

	200: "OK"                              as const,
	201: "Created"                         as const,
	202: "Accepted"                        as const,
	203: "Non-Authoritative Information"   as const,
	204: "No Content"                      as const,
	205: "Reset Content"                   as const,
	206: "Partial Content"                 as const,
	207: "Multi-Status"                    as const,
	208: "Already Reported"                as const,
	226: "IM Used"                         as const,

	300: "Multiple Choices"                as const,
	301: "Moved Permanently"               as const,
	302: "Found"                           as const,
	303: "See Other"                       as const,
	304: "Not Modified"                    as const,
	305: "Use Proxy"                       as const,
	306: "Switch Proxy"                    as const,
	307: "Temporary Redirect"              as const,
	308: "Permanent Redirect"              as const,

	400: "Bad Request"                     as const,
	401: "Unauthorized"                    as const,
	402: "Payment Required"                as const,
	403: "Forbidden"                       as const,
	404: "Not Found"                       as const,
	405: "Method Not Allowed"              as const,
	406: "Not Acceptable"                  as const,
	407: "Proxy Authentication Required"   as const,
	408: "Request Timeout"                 as const,
	409: "Conflict"                        as const,
	410: "Gone"                            as const,
	411: "Length Required"                 as const,
	412: "Precondition Failed"             as const,
	413: "Payload Too Large"               as const,
	414: "URI Too Long"                    as const,
	415: "Unsupported Media Type"          as const,
	416: "Range Not Satisfiable"           as const,
	417: "Expectation Failed"              as const,
	418: "I'm a teapot"                    as const,
	421: "Misdirected Request"             as const,
	422: "Unprocessable Content"           as const,
	423: "Locked"                          as const,
	424: "Failed Dependency"               as const,
	425: "Too Early"                       as const,
	426: "Upgrade Required"                as const,
	428: "Precondition Required"           as const,
	429: "Too Many Requests"               as const,
	431: "Request Header Fields Too Large" as const,
	451: "Unavailable For Legal Reasons"   as const,

	500: "Internal Server Error"           as const,
	501: "Not Implemented"                 as const,
	502: "Bad Gateway"                     as const,
	503: "Service Unavailable"             as const,
	504: "Gateway Timeout"                 as const,
	505: "HTTP Version Not Supported"      as const,
	506: "Variant Also Negotiates"         as const,
	507: "Insufficient Storage"            as const,
	508: "Loop Detected"                   as const,
	510: "Not Extended"                    as const,
	511: "Network Authentication Required" as const,
}

type Definitions = typeof dictionary;
export type StatusCode = keyof Definitions;
export type StatusText = Definitions[StatusCode];

const index = {
	code: new Map<string, StatusCode>(),
	text: new Map<StatusCode, StatusText>()
};

for (const k in dictionary) {
	const code = Number(k) as StatusCode;
	const text = dictionary[code];
	index.code.set(text.toLowerCase(), code);
	index.text.set(code, text);
}

type ResponseConfig = ResponseInit & { status: number, statusText: string };
export function MakeStatus(lookup: StatusCode | StatusText, init?: ResponseInit | Headers): ResponseConfig {
	if (init instanceof Headers) init = { headers: init };

	if (typeof lookup === "number") return lookupCode(lookup, init);
	return lookupStatus(lookup, init);
}

function lookupCode(code: StatusCode, init?: ResponseInit) {
	const text = index.text.get(code);
	if (text === undefined) throw new TypeError(`Status ${code} is not a known status code`);
	return SetStatus(init, code, text) as ResponseConfig;
}
function lookupStatus(text: StatusText, init?: ResponseInit) {
	const code = index.code.get(text.toLowerCase());
	if (code === undefined) throw new TypeError(`Status "${text}" is not a known status text`);
	return SetStatus(init, code, text) as ResponseConfig;
}

function SetStatus(into: ResponseInit = {}, status: number, statusText: string) {
	into.statusText = statusText;
	into.status = status;
	return into;
};
export function GetClientIPAddress(request: Request) {
	return request.headers.get("X-Real-IP") || "0.0.0.0";
}
import { RenderArgs } from "./render-args";
import { ErrorResponse } from "./shared";

export async function Render(rn: string, {req}: RenderArgs): Promise<string> {
	throw new ErrorResponse(404, "Resource Not Found", req.url || "/");
}
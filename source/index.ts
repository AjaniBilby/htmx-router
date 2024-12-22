import { RouteModule, CatchFunction, RenderFunction } from '~/types.js';
import { RouteContext, GenericContext } from "~/router.js";
import { createRequestHandler } from '~/request/index.js';

import {
	MetaDescriptor, RenderMetaDescriptor, ShellOptions, ApplyMetaDescriptorDefaults,
	LdJsonObject, OpenGraph, OpenGraphImage, OpenGraphVideo, OpenGraphAudio,
	InferShellOptions
} from '~/util/shell.js';
import { redirect, refresh, revalidate, text, json } from '~/util/response.js';
import { Cookies, CookieOptions } from "~/util/cookies.js";
import { EventSourceConnection } from "~/util/event-source.js";
import { DynamicReference } from '~/util/dynamic.js';
import { StyleClass } from '~/util/css.js';
import { RoutePath } from '~/util/route.js';
import { Endpoint } from '~/util/endpoint.js';


export {
	createRequestHandler,

	// Router types
	CatchFunction, RenderFunction,
	RouteContext, RouteModule, GenericContext,

	// Request helpers
	Cookies, CookieOptions,
	Endpoint, DynamicReference,

	// CSS Helper
	StyleClass,

	// SSE helper
	EventSourceConnection,

	// Response helpers
	redirect, refresh, revalidate, text, json,

	// Meta + shell helpers
	MetaDescriptor, RenderMetaDescriptor, ShellOptions, ApplyMetaDescriptorDefaults,
	LdJsonObject, OpenGraph, OpenGraphImage, OpenGraphVideo, OpenGraphAudio,
	InferShellOptions,

	RoutePath
};
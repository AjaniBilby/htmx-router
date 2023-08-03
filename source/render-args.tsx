import * as elements from 'typed-html';
import type http from "node:http";

import { RouteLeaf } from "./router";

type MetaHTML = { [key: string]: string };

const titleScript =
	`<script>`+
	`document.addEventListener("DOMContentLoaded",function(){`+
		`document.body.addEventListener("setTitle",function(evt){document.title=decodeURIComponent(evt.detail.value);})`+
	`});`+
	`</script>`;

const attrRegex = /^[A-z][A-z\-0-9]+$/;
function ValidateMetaHTML(val: MetaHTML) {
	for (const key in val) {
		if (!attrRegex.test(key)) return false;
	}

	return true;
}
function ValidateMetaHTMLs(val: MetaHTML[]) {
	for (const meta of val) {
		if (!ValidateMetaHTML(meta)) return false;
	}

	return true;
}

export enum MaskType {
	show = 0,
	headless = 1,
	hide = 2
}

export class RenderArgs {
	req: http.IncomingMessage;
	res: http.ServerResponse;
	title: string;
	params: MetaHTML;
	url: URL;

	shared: { [key: string]: any };
	links: MetaHTML[];
	meta:  MetaHTML[];

	_outletChain: RouteLeaf[];
	_maskChain: MaskType[];
	_maxChain: number;

	constructor(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
		this.req = req;
		this.res = res;
		this.url = url;
		this.params = {};

		this.title  = "";
		this.shared = {};
		this.links = [];
		this.meta  = [];

		this._outletChain = [];
		this._maskChain = [];
		this._maxChain = 0;
	}

	setTitle = (value: string) => {
		this.title = value;
	}

	addLinks = (links: MetaHTML[], override: boolean = false) => {
		if (!ValidateMetaHTMLs(links))
			throw new Error(`Provided links have invalid attribute`);

		if (override) {
			this.links = links;
		} else {
			this.links.push(...links);
		}
	}

	addMeta = (links: MetaHTML[], override: boolean = false) => {
		if (!ValidateMetaHTMLs(links))
			throw new Error(`Provided links have invalid attribute`);

		if (override) {
			this.meta = links;
		} else {
			this.meta.push(...links);
		}
	}

	// unpacking Outlet caused this to be undefined
	// 	hence the weird def
	Outlet = () => {
		const depth = this._maxChain - this._outletChain.length;
		const route = this._outletChain.pop();
		let mask = this._maskChain.pop();
		if (mask === undefined) {
			mask = MaskType.show;
		}

		if (!route) return new Promise<string>((res) => res(""));

		const routeName = `hx-route-${depth.toString(16)}`;
		return route.render(this, mask, routeName);
	}

	_addOutlet(route: RouteLeaf) {
		this._outletChain.push(route);
	}

	_applyMask(mask: boolean[], depth: number) {
		const padded = new Array(this._outletChain.length - mask.length).fill(false);

		for (let i=mask.length-1; i>=0; i--) {
			padded.push(mask[i])
		}

		this._maskChain = padded
			.map((x, i) =>
				x === true ?
					MaskType.hide :
				padded.length-i > depth ?
					MaskType.show:
					MaskType.headless);

		this._maxChain = this._maskChain.length;
	}

	renderHeadHTML = () => {
		let out = <title>{this.title}</title>;

		for (const elm of this.links) {
			out += "<link";
			for (const attr in elm) {
				out += ` ${attr}="${elm[attr].replace(/"/g, "\\\"")}"`
			}
			out += "></link>";
		}

		for (const elm of this.meta) {
			out += "<meta";
			for (const attr in elm) {
				out += ` ${attr}="${elm[attr].replace(/"/g, "\\\"")}"`
			}
			out += "></meta>";
		}

		return out+titleScript;
	}
}
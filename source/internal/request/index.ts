import { ServerOnlyWarning } from "../util.js";
ServerOnlyWarning("request");

import type { RouteTree } from '../../router.js';

export type RouterModule = { tree: RouteTree };
import { ClientIslandManifest } from "htmx-router";

import { ThemeSwitcher } from "~/component/client/theme-switcher";
import { Authenticate } from "~/component/client/authenticate";

const Client = {
	ThemeSwitcher,
	Authenticate
};

export default Client as ClientIslandManifest<typeof Client>;
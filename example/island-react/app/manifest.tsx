import { ClientIslandManifest } from "htmx-router";

import { Counter, Bar as Baz } from "~/component/counter";
import Foo from "~/component/foo";

const Client = {
	Counter, Baz,
	Foo
};

export default Client as ClientIslandManifest<typeof Client>;

import { useState } from "react";

import { SignUp } from "~/component/client/sign-up";
import { Login } from "~/component/client/login";

export function Authenticate() {
	const [ isLogin, setIsLogin ] = useState(true);
	const swapMode = async () => setIsLogin(!isLogin);

	if (isLogin) return <Login swapMode={swapMode}/>;
	return <SignUp swapMode={swapMode} />
}
import { shell } from "./$";

export const parameters = {};

export async function loader() {
	return shell(<div style={{ maxWidth: "500px" }}>
		<h1>Big Rock For Sale - Very Solid, Good For Many Thing</h1>
		<img src="/image/rock.jpg" style={{ width: "200px", float: "right", padding: "10px" }} />
		<p>
			Me have big rock.
			Very nice big rock.
			Found it near old cave by river (river big and splashing), rock about size of grug chest.
			Rock very solid, good for smash small things or maybe for sitting to and think problem.
			Me not know things well, but rock stable, never break.
			If you need something heavy and stable, big rock is perfect.
		</p>
		<p>
			You come take rock, bring many friend or have big strong back.
			Me no can deliver, me only have small wheel cart not good for giant stone.
			Price very good, you give some shiny coin or maybe share some of your wool cloth.
			Hurry, big rock not last long, many interest from other cave developer who need something strong to hold down tent flap or crush big nut.
			Don&apos;t wait, claim big rock now!
		</p>

		<a href="/dilemma">
			<button>Buy Rock</button>
		</a>
	</div>, { title: "Something"});
}
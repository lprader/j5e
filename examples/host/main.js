import Mod from "mod";

globalThis.console = Object.freeze({
	log(message) {
		trace(message, "\n");
	}
});

export default function () {
	if (Mod.has("check")) {
		const check = Mod.load("check");
		check();
		if (Mod.has("example"))
			Mod.load("example");
	} else {
		trace("j5e flashed. Ready to install mod.\n");
	}
}

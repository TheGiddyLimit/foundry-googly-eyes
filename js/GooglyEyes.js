class GooglyEyes {
	static async pInit () {
		this._initToggle();
		this._initTokenMods();
	}

	static _initToggle () {
		const $btn = $(`<button class="ggly__btn" title="Toggle Google Eye Tool"></button>`)
			.click(() => {
				$btn.toggleClass("ggly__btn--active");
				GooglyEyes._IS_ACTIVE = !GooglyEyes._IS_ACTIVE;
			})
			.appendTo(document.body);
	}

	static _initTokenMods () {
		libWrapper.register(
			GooglyEyes._MODULE_NAME,
			"Token.prototype.refresh",
			function (fn, ...args) {
				GooglyEyes._doRender(this);
				return fn(...args);
			},
			"WRAPPER",
		);

		libWrapper.register(
			GooglyEyes._MODULE_NAME,
			"Token.prototype._onClickLeft",
			function (fn, ...args) {
				if (GooglyEyes._doHandleClickLeft(this, ...args)) return false;
				return fn(...args);
			},
			"MIXED",
		);

		libWrapper.register(
			GooglyEyes._MODULE_NAME,
			"Token.prototype._onClickLeft2",
			function (fn, ...args) {
				if (GooglyEyes._doHandleClickLeft(this, ...args)) return false;
				return fn(...args);
			},
			"MIXED",
		);

		libWrapper.register(
			GooglyEyes._MODULE_NAME,
			"Token.prototype._onClickRight",
			function (fn, ...args) {
				if (GooglyEyes._doHandleClickRight(this, ...args)) return false;
				return fn(...args);
			},
			"MIXED",
		);

		libWrapper.register(
			GooglyEyes._MODULE_NAME,
			"Token.prototype._onClickRight2",
			function (fn, ...args) {
				if (GooglyEyes._doHandleClickRight(this, ...args)) return false;
				return fn(...args);
			},
			"MIXED",
		);

		this._doTriggerExistingTokens();
	}

	static _doTriggerExistingTokens () {
		(canvas?.tokens?.placeables || []).forEach(tk => {
			try {
				tk.mouseInteractionManager.callbacks.clickLeft = tk._onClickLeft.bind(tk);
				tk.mouseInteractionManager.callbacks.clickRight = tk._onClickRight.bind(tk);
				tk.mouseInteractionManager.callbacks.clickLeft2 = tk._onClickLeft.bind(tk);
				tk.mouseInteractionManager.callbacks.clickRight2 = tk._onClickRight.bind(tk);
				tk.mouseInteractionManager._activateClickEvents();
				tk.refresh();
			} catch (e) {
				// Sanity check/should never occur
				console.warn(`Failed to refresh token "${tk._id}"!`, e);
			}
		});
	}

	static _doRender (token) {
		const seenKeys = new Set();

		(token.data.flags?.[GooglyEyes._MODULE_NAME]?.points || [])
			.forEach(pt => {
				const eyeKey = `${pt.x}-${pt.y}`;
				seenKeys.add(eyeKey);

				token._googly_sptsEyes = token._googly_sptsEyes || {};

				let sptEye = token._googly_sptsEyes[eyeKey];
				if (sptEye && sptEye.parent) return;
				if (sptEye && !sptEye.parent) token.removeChild(sptEye);

				sptEye = PIXI.Sprite.from(GooglyEyes._TEXTURE_PATH);

				sptEye.anchor.set(0.5, 0.5);
				sptEye.position.set(pt.x, pt.y);
				sptEye.width = sptEye.height = pt.dim;
				sptEye.angle = pt.angle;

				token._googly_sptsEyes[eyeKey] = sptEye;

				token.addChild(sptEye);
			});

		if (!token._googly_sptsEyes) return;
		Object.entries(token._googly_sptsEyes)
			.forEach(([k, v]) => {
				if (seenKeys.has(k)) return;
				delete token._googly_sptsEyes[k];
				token.removeChild(v);
			});
	}

	static _doHandleClickLeft (token, evt) {
		if (!GooglyEyes._IS_ACTIVE) return false;

		evt.stopPropagation();

		const points = GooglyEyes._getTokenPoints(token);
		const {x, y} = GooglyEyes._getTokenSpaceClickPosition(token, evt);

		points.push({
			x,
			y,
			dim: Math.round(20 + Math.random() * 16),
			angle: Math.random() * 360,
		});

		token.update({flags: {[GooglyEyes._MODULE_NAME]: {points}}})
			.then(() => {
				token.refresh();
			});

		return true;
	}

	static _doHandleClickRight (token, evt) {
		if (!GooglyEyes._IS_ACTIVE) return false;

		evt.stopPropagation();

		const points = GooglyEyes._getTokenPoints(token);
		const {x, y} = GooglyEyes._getTokenSpaceClickPosition(token, evt);

		// Loop backwards through the points, looking for collisions
		for (let i = points.length - 1; i > -1; --i) {
			const pt = points[i];

			if (
				x < (pt.x - (pt.dim * 0.5))
				|| x > (pt.x + (pt.dim * 0.5))
				|| y < (pt.y - (pt.dim * 0.5))
				|| y > (pt.y + (pt.dim * 0.5))
			) {
				continue;
			}

			points.splice(i, 1);

			token.update({flags: {[GooglyEyes._MODULE_NAME]: {points}}})
				.then(() => {
					token.refresh();
				});

			break;
		}

		return true;
	}

	static _getTokenSpaceClickPosition (token, evt) {
		const {x: xClick, y: yClick} = evt.data.origin;
		const {x: xToken, y: yToken} = token.position;
		return {
			x: xClick - xToken,
			y: yClick - yToken,
		};
	}

	static _getTokenPoints (token) {
		return JSON.parse(JSON.stringify(token.data.flags?.[GooglyEyes._MODULE_NAME]?.points || []));
	}
}
GooglyEyes._IS_ACTIVE = false;
GooglyEyes._MODULE_NAME = "googly-eyes";
GooglyEyes._TEXTURE_PATH = `modules/${GooglyEyes._MODULE_NAME}/media/googly-eye.png`;

Hooks.on("ready", () => {
	GooglyEyes.pInit();
});

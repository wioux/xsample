export function X(name, ...rest) {
		let content, attrs, children;

		content = (typeof rest[0] == "string" || typeof rest[0] == "number") ? rest.shift() : null;
		attrs = (typeof rest[0] == "object" && !rest[0].nodeName) ?  rest.shift() : {};
    children = rest;

		let el = document.createElement(name);

    for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
    }

		if (content !== null)
				el.innerText = content;

    for (const child of children) {
        el.appendChild(child);
    }

		return el;
}

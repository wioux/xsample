import { parse } from "../xsampler/parser";

export function Script(source) {
		this.source = source;
		this.inputs = [{ name: "t", source: "t" }];
}

Script.prototype.compile = function() {
		let ast = parse(this.source.value.trim());
		ast = this.preprocess(ast);
		return ast;
}

Script.prototype.preprocess = function(ast) {
		ast = ast.map(function(node) {
				let lhs, rhs, nodep = node;

				let assignop = node?.lhs?.op == "$lookup" ? "$register" : "$set";

				switch(node.op) {
				case "=":
						nodep = {...node, op: assignop };
						break;

				case "+=":
				case "-=":
				case "*=":
				case "/=":
				case "^=":
				case "|=":
				case "||=":
				case "&=":
				case "&&=":
				case ".+=":
				case ".-=":
				case ".*=":
				case "./=":
				case ".^=":
				case ".|=":
				case ".||=":
				case ".&=":
				case ".&&=":
						rhs = { op: node.op.substr(0, node.op.length-1),
										lhs: node.lhs, rhs: node.rhs };
						nodep = { op: assignop, lhs: node.lhs, rhs: rhs };
						break;
				}

				return nodep;				
		}).flat(1)

		return ast;
}

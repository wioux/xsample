export function vm(library) {
		let ctx = {};
		this.library = library;
		this.frames = [ctx];
}

vm.prototype.exec = function(ast, lib) {
		let vm = this;

		if (lib)
				this.library = {...this.library, ...lib};

		Object.entries(this.library.__frame__ || {}).forEach(function(xy) {
				vm.frames[0][xy[0]] = xy[1];
		});

		this.preprocess(ast);
		this.interpret(ast);
}

vm.prototype.preprocess = function(ast) {
		// visit(ast, function(n) { console.log(n) });
}

function visit(ast, fn) {
		if (!ast) return;
		if (typeof ast != "object") return;

		ast.forEach(function(node) {
				fn(node);
				if (node.lhs) fn(node.lhs);
				if (node.rhs) fn(node.lhs);
		});
}

vm.prototype.sample = function(artifacts) {
		let result = {}, frame = this.frames[0];

		Object.entries(artifacts || {}).forEach(function(artifact) {
				result[artifact[0]] = frame[artifact[1]];
		});

		return result;
}

vm.prototype.interpret = function(ast) {
		let vm = this;
		let frames = vm.frames;
		let frame = frames[frames.length-1];

		let value = null;

		for (let inode = 0; inode < ast.length; ++inode) {
				let node = ast[inode];

				let op, i, j, rows, cols, str, lhs, rhs, num, idx, args;

        let lhs_rows,
            lhs_cols,
            rhs_cols,
            rhs_rows,
            lhs_data,
            rhs_data,
            data;

				args = node.args?.map(function(a) { return vm.interpret([a]) });
				idx = node.idx?.map(function(a) { return vm.interpret([a]) });
				rhs = node.rhs && vm.interpret([node.rhs]);

        value = null;

				switch(node.op) {
				case "$register":
						str = node.lhs.sym;

						// TODO indexing operation on lhs
						for (i=frames.length-1; i >= 0; --i) {
								if (frames[i][str]) {
										frames[i][str] = rhs;
										break;
								}
						}

						if (i < 0)
								frame[str] = rhs;

						value = rhs;

						break;

				case "$set":
						str = node.lhs.sym;

						// TODO indexing operation on lhs
						for (i=frames.length-1; i >= 0; --i) {
								if (frames[i][str]) {
										lhs = frames[i][str];
										break;
								}
						}

						if (i < 0)
								throw "unknown symbol: "+str;

						args = node.lhs.args.map(function(a) { return vm.interpret([a]) });

						if (args.length == 1)
								lhs.data[args[0].data[0]] = rhs.data[0]
						else if (args.length == 2)
								lhs.data[lhs.cols*args[0].data[0] + args[1].data[0]] = rhs.data[0];

						value = rhs;

						break;

				case "$lookup":
						str = node.sym;
						for (i=frames.length-1; i >= 0; --i) {
								if (frames[i][str]) {
										value = frames[i][str];
										break;
								}
						}

						if (value == null)
								throw "unknown symbol: "+str;

						break;

				case "$call":
						// first attempt lookup
						str = node.sym;
						for (i=frames.length-1; i >= 0; --i) {
								if (frames[i][str]) {
										lhs = frames[i][str];
										break;
								}
						}

						if (lhs != null && typeof lhs.formula != "undefined") {
                value = vm.evaluate(lhs.formula, args);
						} else if (lhs != null) {
								value = index(lhs, args);
						} else if ((lhs = vm.library[node.sym])) {
								value = lhs(vm, args);
						} else {
								throw 'symbol is undefined: '+node.sym;
						}
						break;

				case "$mkscalar":
						value = mknum(1, 1);
						value.data[0] = node.value;
						break;

				case "$mkmatrix":
						rows = node.rows;
						cols = args.length / rows;

						value = mknum(rows, cols);

						for (i=0; i < rows; ++i) {
								for (j=0; j < cols; ++j) {
										value.data[i*cols + j] = args[i*cols+j].data[0];
								}
						}

						break;

				case "$mkformula":
						value = mkformula(node.params, [node.formula]);
						break;

				default:
						lhs = vm.interpret([node.lhs]);

						rows = lhs.rows;
						cols = lhs.cols;

						op = node.op;

						if (lhs.data.length == 1 && rhs.data.length != 1) {
								op = "s" + op;
								rows = rhs.rows;
								cols = rhs.cols;
						} else if (lhs.data.length != 1 && rhs.data.length == 1) {
								op = op + "s"
						} else if (op == "*" && lhs.data.length != 1 && rhs.cols == 1) {
                op = "*v";
            }

						value = mknum(rows, cols);

						switch (op) {
						case ".+":
						case "+":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] + rhs.data[i];
								break;
						case "s+":
								for (i=0; i < rhs.data.length; i++)
										value.data[i] = lhs.data[0] + rhs.data[i];
								break;
						case "+s":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] + rhs.data[0];
								break;


						case ".-":
						case "-":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] - rhs.data[i];
								break;
						case "s-":
								for (i=0; i < rhs.data.length; i++)
										value.data[i] = lhs.data[0] - rhs.data[i];
								break;
						case "-s":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] - rhs.data[0];
								break;


						case ".*":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] * rhs.data[i];
								break;
						case "s*":
								for (i=0; i < rhs.data.length; i++)
										value.data[i] = lhs.data[0] * rhs.data[i];
								break;
						case "*s":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] * rhs.data[0];
								break;

						case "./":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] / rhs.data[i];
								break;
						case "/":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] / rhs.data[i];
								break;
						case "/s":
						case "./s":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] / rhs.data[0];
								break;

						case "*":
                // assert dimensions match
                value = mknum(lhs.rows, rhs.cols);

                lhs_rows = lhs.rows;
                rhs_cols = rhs.cols;
                rhs_rows = rhs.rows;
                lhs_data = lhs.data;
                rhs_data = rhs.data;

                data = value.data;

								for (i=0; i < lhs_rows; i++) {
                    let irow1 = i*rhs_cols;
                    let irow2 = i*rhs_rows;
                    for (j=0; j < rhs_cols; ++j) {
                        for (let k=0; k < rhs_rows; ++k)
                            data[irow1 + j] += lhs_data[irow2 + k] * rhs_data[k*rhs_cols + j];
                    }
                }
								break;

						case "*v":
                // assert dimensions match
                lhs_rows = lhs.rows;
                lhs_cols = lhs.cols;
                lhs_data = lhs.data;
                rhs_data = rhs.data;

                value = mknum(lhs.rows, 1);

                data = value.data;

								for (i=0; i < lhs_rows; i++) {
                    let irow = i*lhs_cols;

                    for (j=0; j < lhs_cols; ++j)
                        data[i] += lhs_data[irow + j] * rhs_data[j];
                }

								break;

						case ".^":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = Math.pow(lhs.data[i], rhs.data[i]);
								break;
						case "^":
								// assert(lhs.data.length == 1, rhs.data.length == 1)
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = Math.pow(lhs.data[i], rhs.data[i]);
								break;
						// TODO replace with .^s
						case "^s":
						case ".^s":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = Math.pow(lhs.data[i], rhs.data[0]);
								break;

						case "<":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] < rhs.data[i];
								break;
						case "s<":
								for (i=0; i < rhs.data.length; i++)
										value.data[i] = lhs.data[0] < rhs.data[i];
								break;
						case "<s":
								for (i=0; i < lhs.data.length; i++)
										value.data[i] = lhs.data[i] < rhs.data[0];
								break;

						default:
								throw "unknown operator: " + op;
						}

						break;
				}
		}

		return value;
}

vm.prototype.evaluate = function(formula, args) {
		this.frames.push(bind(formula.params, args));
		let value = this.interpret(formula.code);
		this.frames.pop();
    return value;
}

export function mknum(rows, cols, val) {
		let num = { rows: rows, cols: cols, data: new Float64Array(rows*cols) };
		if (val) num.data.fill(val);
		return num;
}

export function mkformula(params, code) {
		let num = mknum(1, 1, 1);
		num.formula = { params, code };

		return num;
}

function bind(params, args) {
		// assert params.length == args.length
		let frame = {};

		params.forEach(function(p, i) {
				// assert p.op == "$lookup"
				frame[p.sym] = args[i];
		});

		return frame;
}

function index(num, index) {
		let rows = num.rows, cols = num.cols;

		if (index.length == 1) {
				
		} else if (index.length == 2) {
				
		}

		let idx = index[0];
		let value = mknum(idx.rows, idx.cols);

		let data = [];


		value.data[0] = num.data[idx.data[0]];
		return value;
}

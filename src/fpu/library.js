import { mknum } from "./vm"

let library = {
		print: function(fpu, args) {
				args.forEach(function(a, i) {
						console.log("["+i+"]", a);
				});
		},

		linspace: function(fpu, args) {
				let min = args[0], max = args[1], N = args[2];

				// assert((!N || N.rows == 1) && (!N || N.cols == 1))
				N = Math.floor(N ? N.data[0] : 100);

				// assert(min.rows == 1 && min.cols == 1)
				min = min.data[0]; max = max.data[0];

				let result = mknum(1, N),
            data = result.data;

				for (let i=0; i < N; ++i)
						data[i] = min + i*(max - min)/(N-1);

				return result;
		},

		colon: function(fpu, args) {
				let min = args[0], max = args[1], step = args[2];

				// assert((!N || N.rows == 1) && (!N || N.cols == 1))
				step = step ? step.data[0] : 1;

				// assert(min.rows == 1 && min.cols == 1)
				min = min.data[0]; max = max.data[0];

				let result = mknum(1, Math.floor((max-min)/step)+1),
            data = result.data,
            n = data.length;

				for (let i=0; i < n; ++i)
						data[i] = min + i*step;

				return result;
		},

		zeros: function(fpu, args) {
				// assert args.length == 2
				// assert args[0], args[1] are scalar
				let m = args[0], n = args[1];
				return mknum(m.data[0], n.data[0], 0);
		},

		matrix: function(fpu, args) {
				// assert args.length == 3
				// assert args[0], args[1] are scalar
        // assert args[2].formula
				let m = args[0].data[0], n = args[1].data[0], f = args[2];

        let idxi = mknum(1, 1, 0),
            idxi_data = idxi.data;

        let idxj = mknum(1, 1, 0),
            idxj_data = idxj.data;

        let idx = [idxi, idxj];

        let result = mknum(Math.floor(m), Math.floor(n), 0),
            data = result.data;

        for (let i=0; i < m; ++i) {
            let irow = i*m;
            idxi_data[0] = i;
            for (let j=0; j < n; ++j) {
                idxj_data[0] = j;
                data[irow + j] = fpu.evaluate(f.formula, idx).data[0];
            }
        }

        return result;
		},

		length: function(fpu, args) {
				let x = args[0];

				// assert(X)
				let result = mknum(1, 1);
				result.data[0] = x.data.length;
				return result;
		},

		min: function(fpu, args) {
				let result = mknum(1, 1);

				// assert args.length > 1
				let max = args[0].data[0];

				for (let i=0; i < args.length; ++i)
						for (let j=0; j < args[i].data.length; ++j)
								result.data[0] = Math.min(result.data[0], args[i].data[j]);

				return result;
		},

		max: function(fpu, args) {
				let result = mknum(1, 1);

				// assert args.length > 1
				let max = args[0].data[0];

				for (let i=0; i < args.length; ++i)
						for (let j=0; j < args[i].data.length; ++j)
								result.data[0] = Math.max(result.data[0], args[i].data[j]);

				return result;
		},

		mean: function(fpu, args) {
				// assert args.length == 1
        let arg = args[0];

				let result = mknum(1, 1);
				let sum = 0.0;

				for (let i=0; i < arg.data.length; ++i)
            sum += arg.data[i];

        result.data[0] = sum / arg.data.length;

				return result;
		},

		sum: function(fpu, args) {
				let arg = args[0];

				let result = mknum(1, 1);

				// TODO sumPrecise
				for (let i=0; i < arg.data.length; ++i)
						result.data[0] += arg.data[i];

				return result;
		},

		conv: function(fpu, args) {
				let lhs = args[0], rhs = args[1];

				// assert(lhs.rows == 1, rhs.rows == 1)
				let result = mknum(1, lhs.cols + rhs.cols - 1);

				for (let i=0; i < lhs.cols; ++i) {
						for (let j=0; j < rhs.cols; ++j) {
								result.data[i + j] += lhs.data[i]*rhs.data[j];
						}
				}

				return result;
		},

    iterate: function(fpu, args) {
        let f = args[0], n = args[1], x0 = args[2];
        // assert f.formula, n, x0
        let result = x0;

        for (let i=0; i < n.data[0]; ++i)
            result = fpu.evaluate(f.formula, [result]);

        return result;
    },

    iterate2: function(fpu, args) {
        let f = args[0], n = args[1], x0 = args[2];
        // assert f.formula, n, x0
        let result = mknum(1, n.data[0], x0.data[0]);

        for (let i=0; i < n.data[0]; ++i) {
            result.data[i] = fpu.evaluate(f.formula, [x0]).data[0];
            x0.data[0] = result.data[i];
        }

        return result;
    },

    transpose: function(fpu, args) {
        let arg = args[0];

        let result = mknum(arg.cols, arg.rows);

        for (let i=0; i < arg.rows; ++i) {
            for (let j=0; j < arg.cols; ++j) {
                result.data[j*arg.rows+i] = arg.data[i*arg.cols+j];
            }
        }

        return result;
    },

    shift: function(fpu, args) {
        let arg = args[0], k = args[1];

        let result = mknum(arg.rows, arg.cols);

        for (let i=k.data[0]; i < result.data.length+k.data[0]; ++i) {
            result.data[i] = arg.data[i-k.data[0]];
        }

        return result;
    },

    dft_r: function(fpu, args) {
        let n = Math.floor(args[0].data[0]);

        let result = mknum(n, n),
            data = result.data,
            c = -2*Math.PI / n,
            nsqrt = Math.sqrt(n);

        for (let i=0; i < n; ++i)
            for (let j=0; j < n; ++j)
                data[i*n + j] = Math.cos(c*i*j) / nsqrt;

        return result;
    },

    dft_i: function(fpu, args) {
        let n = Math.floor(args[0].data[0]);

        let result = mknum(n, n),
            data = result.data,
            c = -2*Math.PI / n,
            nsqrt = Math.sqrt(n);

        for (let i=0; i < n; ++i)
            for (let j=0; j < n; ++j)
                data[i*n + j] = -Math.sin(c*i*j) / nsqrt;

        return result;
    },

    fftshift: function(fpu, args) {
        let arg = args[0];
        let n = arg.cols;
        let half = n / 2;

        let result = mknum(arg.rows, arg.cols);

        if (n % 2 == 0) {
            // Even length: split in half
            for (let i = 0; i < half; ++i) {
                result.data[i] = arg.data[i + half];
                result.data[i + half] = arg.data[i];
            }
        } else {
            // Odd length: shift by ceil(n/2)
            let shift = (n + 1) / 2;
            for (let i = 0; i < n; ++i) {
                result.data[i] = arg.data[(i + shift) % n];
            }
        }

        return result;
    }
};

Object.getOwnPropertyNames(Math).forEach(function(id) {
		if (Math[id].length == 1) {
				library[id] = function(fpu, args) {
						let num = args[0];

						let result = mknum(num.rows, num.cols);
						let mathf = Math[id];

						for (let i=0; i < num.data.length; ++i)
								result.data[i] = mathf(num.data[i]);

						return result;
				}
		}
});

library.__frame__ = {};

Object.getOwnPropertyNames(Math).forEach(function(id) {
		if (typeof Math[id] != "number")
				return;

		library.__frame__[id.toLowerCase()] = mknum(1, 1);
		library.__frame__[id.toLowerCase()].data[0] = Math[id];
});

export { library }

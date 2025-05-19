// Generate parser.js with https://peggyjs.org/online.html

{{
		function makeOp(head, tail) {
				return tail.reduce(function(result, element) {
           return { op: element[1], lhs: result, rhs: element[3] };
				}, head);
		}
}}

Program = Statement*

Statement = expr:Expression semi { return expr; }

Expression = _ expr:(SetExpr / LogExpr) _ { return expr; }
SetExpr = lhs:VariableOrCall tail:(_ setop _ Expression)+ { return makeOp(lhs, tail); }
LogExpr = head:RngExpr tail:(_ logop _ RngExpr)* { return makeOp(head, tail) }
RngExpr = head:CmpExpr tail:(_ rngop _ CmpExpr)* { return makeOp(head, tail) }
CmpExpr = head:AddExpr tail:(_ cmpop _ AddExpr)* { return makeOp(head, tail) }
AddExpr = head:MulExpr tail:(_ addop _ MulExpr)* { return makeOp(head, tail) }
MulExpr = head:ExpExpr tail:(_ mulop _ ExpExpr)* { return makeOp(head, tail) }
ExpExpr = head:Term tail:(_ expop _ Term)* { return makeOp(head, tail) };

Term
  = "(" _ expr:Expression _ ")" args:Args? {
			if (args)
					return { op: expr, args: args };
			else
					return expr;
	}
	/ Formula
	/ VariableOrCall
  / Numeric
  / unop:[-+!] expr:Term { return { op: unop, lhs: { op: "$mkscalar", value: 0 }, rhs: expr }; }

Formula
  = "@" args:Args expr:Expression {
      return { op: "$mkformula", params: args, formula: expr };
  }

VariableOrCall
 = expr:Variable args:Args? {
			if (args)
          return { op: "$call", sym: expr, args: args };
			else
          return { op: "$lookup", sym: expr };
	}

Args
	= "(" _ ")" { return []; }
	/ "(" _ head:Expression tail:(_ "," _ Expression )* _ ")" {
			return [head, ...tail.map(function(e) { return e[3]; })];
	}

Variable
	= [A-Za-z][A-Za-z0-9_]* { return text() }

Numeric
  = Decimal "e" "-"? Integer { return { op: "$mkscalar", value: parseFloat(text()) }; }
  / Decimal / Integer / Matrix

Matrix
	= "[" _ "]" { return {op: "$mkmatrix", rows: 0, args: [] }; }
	/ "[" _ head:MatrixRow tail:(_ semi MatrixRow)* _ "]" {
      let rows = 1 + tail.length;
      let args = [...head, ...tail.flatMap(function(e) { return e[2]; })];
      return { op: "$mkmatrix", rows, args };
  }
MatrixRow
	= head:Expression tail:(_  ","? _ Expression)* {
			return [head, ...tail.map(function(e) { return e[3]; })];
	}

Integer "integer"
	= [0-9]+ { return { op: "$mkscalar", value: parseInt(text()) } }

Decimal "float"
  = [0-9]+[.][0-9]+ { return { op: "$mkscalar", value: parseFloat(text()) }; }

setop = "."? ("=" / "+=" / "-=" / "*=" / "/=" / "|=" / "&=" / "^=") { return text(); }
logop = "."? ("||" / "|" / "&&" / "&") { return text(); }
rngop = ":" { return text(); }
cmpop = "."? ("<=" / "<" / ">=" / ">" / "==" / "!=") { return text(); }
addop = "."? ("+" / "-") { return text(); }
mulop = "."? ("*" / "/") { return text(); }
expop = "."? ("^") { return text(); }

_ "whitespace"
  = [ \t\r]* / "..." [\r\n]+

semi
  = [\r\n]+ / ";" _ [\r\n]* / !.

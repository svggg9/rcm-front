/* eslint-disable @typescript-eslint/no-require-imports -- Isolated editing/form serialization checks, no API writes. */
const fs = require("node:fs"), assert = require("node:assert/strict"), ts = require("typescript");
const jsx = require("react/jsx-runtime");
function load(file, imports) {
  const mod = { exports: {} };
  new Function("module", "exports", "require", ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(mod, mod.exports, name => {
    if (!(name in imports)) throw Error("Unexpected import: " + name); return imports[name];
  }); return mod.exports;
}
const whitespace = load("app/lib/inputWhitespace.ts", {});
const numeric = load("app/lib/numericInput.ts", { "./inputWhitespace": whitespace });
const { parseNumericInput: parse, MONEY_RULES, INTEGER_RULES, WEIGHT_RULES } = numeric;
for (const [raw, expected] of [["", null], ["0", 0], ["12,", 12], ["12.", 12], [",5", .5], ["1\u202f234,50", 1234.5]]) assert.equal(parse(raw), expected);
for (const raw of ["-1", "+1", "1e3", "0xff", "12abc34", "12,345", "1.2,3", ",", "Infinity"]) assert(Number.isNaN(parse(raw)), raw);
assert.equal(parse("0", INTEGER_RULES), 0);
assert.equal(parse("2147483647", INTEGER_RULES), 2147483647);
assert(Number.isNaN(parse("2147483648", INTEGER_RULES)));
assert(Number.isNaN(parse("1,5", INTEGER_RULES)));
assert.equal(parse("0,001", WEIGHT_RULES), .001);
assert(Number.isNaN(parse("0,0001", WEIGHT_RULES)));
assert(Number.isNaN(parse("0", WEIGHT_RULES)));
assert(Number.isNaN(parse("9007199254740992", { fractionDigits: 0 })));
assert(Number.isNaN(parse("6", { ...MONEY_RULES, max: 5 })));

function mounted(initialProps) {
  let cursor = 0, props = initialProps, pending = false, tree; const slots = [];
  const { NumericInput } = load("app/components/ui/NumericInput.tsx", {
    react: {
      useState: initial => { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], update => { slots[index] = typeof update === "function" ? update(slots[index]) : update; pending = true; }]; },
      useRef: () => ({ current: null }), useEffect: () => {},
    },
    "react/jsx-runtime": jsx, "./InputControl": { InputControl: "input-control" },
    "../../lib/inputWhitespace": whitespace, "../../lib/numericInput": numeric,
  });
  function render() { do { pending = false; cursor = 0; tree = NumericInput(props); } while (pending); return api; }
  const api = {
    render, update(next) { props = { ...props, ...next }; return render(); },
    control: () => tree.props.children[0], hidden: () => tree.props.children[1],
    change(raw, position = raw.length) {
      const input = { value: raw, selectionStart: position, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; } };
      api.control().props.onChange({ target: input, currentTarget: input, nativeEvent: {} }); render(); return input;
    },
    paste(raw, start, end = start) {
      const event = { currentTarget: { selectionStart: start, selectionEnd: end }, clipboardData: { getData: () => raw },
        defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      api.control().props.onPaste(event); return event.defaultPrevented;
    },
    blur() { api.control().props.onBlur({}); return render(); },
  }; return render();
}
let values = [];
let input = mounted({ defaultValue: "", name: "price", onValueChange: value => values.push(value) });
input.change("12,"); assert.equal(input.control().props.value, "12,"); assert.equal(input.hidden().props.value, "12");
input.change("12,30"); assert.equal(input.control().props.value, "12,30"); assert.equal(input.hidden().props.value, "12.3");
input.blur(); assert.equal(input.control().props.value, "12,3");
const count = values.length;
input.change("12abc34"); assert.equal(values.length, count); assert.equal(input.control().props.value, "12,3");
assert(input.paste("-100", 0, 4)); assert(input.paste("12,345", 0, 4)); assert(!input.paste("1 234,50", 0, 4));
input.change(""); assert.equal(input.hidden().props.value, ""); assert.equal(values.at(-1), null);
input = mounted({ value: 0, emptyZero: true, onValueChange: next => input.update({ value: next ?? 0 }) });
assert.equal(input.control().props.value, "");
input.change("0"); input.change("0,"); input.change("0,50"); assert.equal(input.control().props.value, "0,50");
input.blur(); assert.equal(input.control().props.value, "0,5");
input.change(""); assert.equal(input.control().props.value, "");
input.update({ value: 99 }); assert.equal(input.control().props.value, "99");
input = mounted({ value: "", onChange: event => input.update({ value: event.target.value }) });
input.change("0012.30"); assert.equal(input.control().props.value, "0012.30");
input.blur(); assert.equal(input.control().props.value, "12,3");
input = mounted({ defaultValue: "12,345", name: "price" });
assert.equal(input.control().props["aria-invalid"], undefined); assert.equal(input.hidden().props.value, "");
input.blur(); assert.equal(input.control().props["aria-invalid"], true);
console.log("Numeric input: comma/dot, precision/bounds, blank/zero, unfinished drafts, invalid paste, controlled updates and canonical form value passed");

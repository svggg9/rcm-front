/* eslint-disable @typescript-eslint/no-require-imports -- Auth transport and handler regression checks without browser/DB/SMTP. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const result = { exports: {} };
  new Function("module", "exports", "require", code)(result, result.exports, name => {
    if (!(name in imports)) throw Error("Unexpected import " + name);
    return imports[name];
  });
  return result.exports;
}
let reply = () => new Response("{}");
const calls = [];
const requests = load("app/lib/authRequests.ts", { "./api": { API_URL: "http://fixture", apiFetch: async (url, options) => {
  calls.push({ url, ...options, body: JSON.parse(options.body) }); return reply();
} } });
async function transport() {
  reply = () => Response.json({ ttlSeconds: 600, resendAfterSeconds: 60 }, { status: 202 });
  assert.deepEqual(await requests.startEmailLogin(" Buyer@EXAMPLE.TEST "), { ttlSeconds: 600, resendAfterSeconds: 60 });
  assert.equal(calls.at(-1).url, "http://fixture/api/auth/email/login/start");
  assert.deepEqual(calls.at(-1).body, { email: "buyer@example.test" });
  assert(calls.at(-1).signal instanceof AbortSignal);
  reply = () => Response.json({ cartId: "user_buyer" });
  assert.deepEqual(await requests.completeEmailLogin(" Buyer@EXAMPLE.TEST ", "123456", "guest_uuid"), { cartId: "user_buyer" });
  assert.deepEqual(calls.at(-1).body, { email: "buyer@example.test", code: "123456", cartId: "guest_uuid" });
  for (const [status, body, expected] of [
    [400, { message: "invalid_or_expired_login_code" }, "Код неверен или истёк"],
    [429, { message: "email_login_rate_limited" }, "Слишком много попыток"],
    [500, { message: "private SQL /api/internal" }, "Не удалось завершить вход"],
    [400, { message: "private SQL /api/internal" }, "Не удалось завершить вход"],
  ]) {
    reply = () => Response.json(body, { status });
    await assert.rejects(requests.completeEmailLogin("a@example.test", "123456", "guest_uuid"), error => {
      assert.equal(error.status, status); assert(error.message.includes(expected));
      assert(!error.message.includes("private")); return true;
    });
  }
  for (const data of [{}, { cartId: "guest_bad" }, { cartId: 42 }]) {
    reply = () => Response.json(data);
    await assert.rejects(requests.completeEmailLogin("a@example.test", "123456", ""), /Не удалось завершить вход/);
  }
  reply = () => new Response("<html>private</html>", { status: 502 });
  await assert.rejects(requests.startEmailLogin("a@example.test"), /Не удалось отправить код/);
  reply = () => Response.json({ ttlSeconds: "600", resendAfterSeconds: -1 });
  await assert.rejects(requests.startEmailLogin("a@example.test"), /Не удалось отправить код/);
  reply = () => { throw Error("fetch: private host"); };
  await assert.rejects(requests.startEmailLogin("a@example.test"), /Не удалось отправить код/);
  reply = () => Response.json({}, { status: 401 });
  await assert.rejects(requests.loginWithPassword("a@example.test", "secret", ""), /Неверная почта или пароль/);
  reply = () => Response.json({ cartId: "user_fixture" });
  await requests.loginWithPassword(" Legacy@Example.test ", "secret", "guest_fixture");
  assert.equal(calls.at(-1).body.username, "Legacy@Example.test", "Password fallback preserves legacy username case");
}

function harness() {
  let cursor = 0;
  const hooks = [];
  let starts = 0, completions = 0, finished = 0, synchronized = 0;
  let startResolve, completeResolve;
  const jsx = require("react/jsx-runtime");
  const { validateAuthFields } = load("app/lib/authValidation.ts", {});
  const react = {
      useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === "function" ? initial() : initial;
        return [hooks[i], value => { hooks[i] = typeof value === "function" ? value(hooks[i]) : value; }]; },
      useRef(value) { const i = cursor++; if (!(i in hooks)) hooks[i] = { current: value }; return hooks[i]; },
      useEffect() {}, useId() { cursor++; return "test-form"; },
    };
  react.useCallback = fn => fn;
  const validation = load("app/lib/useFieldValidation.ts", { react });
  const { AuthForm } = load("app/components/Auth/AuthForm.tsx", {
    react, "react/jsx-runtime": jsx, "next/link": { default: "a" },
    "../../lib/authRequests": { AuthRequestError: requests.AuthRequestError,
      startEmailLogin: () => { starts++; return new Promise(resolve => { startResolve = resolve; }); },
      completeEmailLogin: () => { completions++; return new Promise(resolve => { completeResolve = resolve; }); },
      loginWithPassword: async () => ({ cartId: "user_fixture" }),
    },
    "../../lib/auth": { getGuestCartId: () => "guest_fixture", ensureGuestCartId: async () => "guest_fixture" },
    "../../lib/completeAuth": { completeAuth: async () => { synchronized++; } },
    "../../lib/yandexAuth": { startYandexAuth: async () => {} },
    "../../lib/safeReturnPath": { safeReturnPath: value => value },
    "../../lib/authValidation": { validateAuthFields },
    "../../lib/useFieldValidation": validation, "../../lib/formValidation": { scrollToFirstValidationError() {} },
    "../ui/Button": { Button: "Button" }, "../ui/Icon": { Icon: "Icon" },
    "../ui/Loader": load("app/components/ui/Loader.tsx", { "react/jsx-runtime": jsx }),
    "../ui/TextInput": { TextInput: "TextInput" }, "../ui/OneTimeCodeInput": { OneTimeCodeInput: "OneTimeCodeInput" },
    "./AuthForm.module.css": { default: {} },
  });
  function render() { cursor = 0; return AuthForm({ onAuthenticated: () => { finished++; } }); }
  function find(node, predicate) {
    if (!node || typeof node !== "object") return null;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  return { render, find, resolveStart: () => startResolve({ ttlSeconds: 600, resendAfterSeconds: 60 }),
    resolveComplete: () => completeResolve({ cartId: "user_fixture" }), counts: () => ({ starts, completions, finished, synchronized }) };
}
async function handlers() {
  global.requestAnimationFrame = fn => { queueMicrotask(fn); return 1; };
  const h = harness(); let view = h.render();
  h.find(view, node => node.type === "TextInput").props.onChange({ target: { value: "buyer@example.test" } });
  view = h.render(); const submit = { preventDefault() {} };
  view.props.onSubmit(submit); view.props.onSubmit(submit);
  assert.equal(h.counts().starts, 1, "Synchronous gate prevents duplicate starts");
  h.resolveStart(); await new Promise(resolve => setImmediate(resolve)); view = h.render();
  const otp = h.find(view, node => node.type === "OneTimeCodeInput"); assert(otp);
  otp.props.onChange("123456"); view.props.onSubmit(submit); otp.props.onChange("123456");
  assert.equal(h.counts().completions, 1, "Auto-complete and Enter cannot confirm twice");
  h.resolveComplete(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.counts(), { starts: 1, completions: 1, finished: 1, synchronized: 1 });
  const { OneTimeCodeInput } = load("app/components/ui/OneTimeCodeInput.tsx", {
    react: { useId: () => "otp", useState: () => [0, () => {}] }, "react/jsx-runtime": require("react/jsx-runtime"),
    "./OneTimeCodeInput.module.css": { default: {} },
    "./InputControl": { InputControl: "input" },
  });
  let value;
  const control = OneTimeCodeInput({ value: "", onChange: next => { value = next; }, error: "Неверный код" });
  const input = h.find(control, node => node.type === "input");
  assert.equal(input.props.autoComplete, "one-time-code"); assert.equal(input.props.inputMode, "numeric");
  assert.equal(input.props["aria-invalid"], true); assert.equal(input.props["aria-describedby"], "otp-error");
  let prevented = false;
  input.props.onPaste({ preventDefault() { prevented = true; }, clipboardData: { getData: () => "123 456\n" } });
  assert(prevented); assert.equal(value, "123456", "Pasted formatting does not truncate six digits");
  input.props.onChange({ target: { value: "ab12-34cd56extra7" } }); assert.equal(value, "123456");
}
transport().then(handlers).then(() => console.log("Email auth: safe transport, deadlines contract, single-flight submit, automatic confirmation, auth synchronization, six-digit paste and accessibility passed"))
  .catch(error => { console.error(error); process.exitCode = 1; });

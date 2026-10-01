/* eslint-disable @typescript-eslint/no-require-imports -- Standalone TS regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
};
const { validateAuthFields } = require("../app/lib/authValidation.ts");
const { startEmailRegistration } = require("../app/lib/authRequests.ts");
for (const registration of [true, false]) {
  const errors = validateAuthFields("", "", registration);
  assert.equal(errors.emailError, "Введите электронную почту");
  assert.equal(errors.passwordError, "Введите пароль");
}
const invalid = validateAuthFields("bad", "short", true);
assert.ok(invalid.emailError && invalid.passwordError);
assert.deepEqual(validateAuthFields("test@example.com", "password123", true), { emailError: null, passwordError: null });
assert.ok(validateAuthFields("test@example.com", "я".repeat(40), true).passwordError);
assert.equal(validateAuthFields("test@example.com", "short", false).passwordError, null);
const originalFetch = global.fetch;
const payloads = [];
global.fetch = async (_url, options) => {
  payloads.push(JSON.parse(options.body));
  return new Response("{}", { status: 200 });
};
(async () => {
  try {
    await startEmailRegistration("test@example.com", "password123", "   ");
    await startEmailRegistration("test@example.com", "password123", " Анна ");
    assert.equal(payloads[0].firstName, null);
    assert.equal(payloads[1].firstName, "Анна");
    const fallback = "Не удалось отправить код";
    for (const [status, body, expected] of [
      [429, JSON.stringify({ status: 429, code: "TOO_MANY_REQUESTS", message: "Код уже отправлен. Попробуйте чуть позже.", title: "Too Many Requests" }), "Код уже отправлен. Попробуйте чуть позже."],
      [400, JSON.stringify({ detail: "invalid_email" }), "Проверьте адрес электронной почты"],
      [400, JSON.stringify({ message: " ", detail: "invalid_code" }), "Неверный код. Проверьте письмо и попробуйте ещё раз"],
      [400, JSON.stringify({ title: "registration_expired" }), "Код истёк. Запросите новый код"],
      [400, "email_exists", "Аккаунт с такой почтой уже существует"],
      [429, JSON.stringify({ message: 123 }), fallback],
      [429, "", fallback],
      [500, JSON.stringify({ message: "internal database details" }), fallback],
    ]) {
      global.fetch = async () => new Response(body, { status });
      await assert.rejects(() => startEmailRegistration("test@example.com", "password123", ""), { message: expected });
    }
    console.log("PASS: backend message for 429, legacy detail/title/plain text, empty response and safe 5xx fallback");
    console.log("PASS: all invalid fields at once, password limits, optional name payload");
  } finally { global.fetch = originalFetch; }
})().catch(error => { console.error(error); process.exitCode = 1; });

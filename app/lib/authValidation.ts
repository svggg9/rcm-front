export function validateAuthFields(email: string, password: string, registration: boolean) {
  const emailError = !email.trim() ? "Введите электронную почту"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "Проверьте адрес электронной почты" : null;
  const passwordError = !password.trim() ? "Введите пароль"
    : registration && password.length < 8 ? "Пароль должен быть от 8 символов"
    : registration && new TextEncoder().encode(password).length > 72 ? "Пароль должен быть не длиннее 72 байт" : null;
  return { emailError, passwordError };
}

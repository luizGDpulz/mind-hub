<template>
  <div class="auth-page-wrapper" data-testid="clean-login-view">
    <div class="auth-card">
      <h1 class="auth-title">Login</h1>

      <div class="sso-stack" role="group" aria-label="Single Sign-On providers">
        <button
          v-for="provider in ssoProviders"
          :key="provider.id"
          type="button"
          class="sso-button"
          :data-testid="`sso-btn-${provider.id}`"
          @click="$emit('authenticated', { email: `${provider.id}@acme.inc`, provider: provider.label })"
        >
          <span class="sso-icon" aria-hidden="true">{{ provider.icon }}</span>
          <span>{{ provider.label }}</span>
        </button>
      </div>

      <div class="auth-divider" role="separator">
        <span>OR</span>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="auth-field">
          <label for="login-email" class="auth-label">Email</label>
          <input
            id="login-email"
            v-model="email"
            name="email"
            type="email"
            autocomplete="username"
            spellcheck="false"
            required
            placeholder="email@example.com"
            class="auth-input"
            data-testid="login-email-input"
          />
        </div>

        <div class="auth-field">
          <label for="login-password" class="auth-label">Password</label>
          <div class="password-input-wrapper">
            <input
              id="login-password"
              v-model="password"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              enterkeyhint="done"
              required
              placeholder="Your password"
              class="auth-input password-input"
              data-testid="login-password-input"
            />
            <button
              type="button"
              class="password-toggle-btn"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              data-testid="toggle-password-visibility"
              @click="showPassword = !showPassword"
            >
              <span aria-hidden="true">{{ showPassword ? '🙈' : '👁' }}</span>
            </button>
          </div>
        </div>

        <div class="forgot-row">
          <a href="#forgot-password" class="forgot-link" @click.prevent="$emit('forgot-password')">
            Forgot your password?
          </a>
        </div>

        <button type="submit" class="sign-in-btn" data-testid="login-submit-btn">
          Sign In
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineEmits<{
  (e: 'authenticated', payload: { email: string; provider: string }): void;
  (e: 'forgot-password'): void;
}>();

const email = ref('');
const password = ref('');
const showPassword = ref(false);

const ssoProviders = [
  { id: 'okta', label: 'Okta', icon: '🔒' },
  { id: 'azure-entra', label: 'Azure Entra', icon: '🔒' },
  { id: 'google-ssox', label: 'Google SSOX', icon: 'G' },
  { id: 'onelogin', label: 'OneLogin', icon: '🔒' },
] as const;

function handleSubmit(): void {
  const cleanedEmail = email.value.trim();
  if (!cleanedEmail || !password.value) return;
}
</script>

<style scoped>
.auth-page-wrapper {
  min-height: calc(100vh - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--mind-bg-canvas);
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 8px;
  padding: 36px 36px 40px;
  box-shadow: var(--mind-shadow-auth);
}

.auth-title {
  margin: 0 0 24px;
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  color: var(--mind-text-primary);
}

.sso-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sso-button {
  height: 40px;
  width: 100%;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-control);
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--mind-text-primary);
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.sso-button:hover {
  background: var(--mind-bg-hover);
}

.sso-icon {
  font-size: 13px;
}

.auth-divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
  color: var(--mind-text-muted);
  font-size: 11.5px;
  font-weight: 500;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--mind-border-subtle);
}

.auth-divider span {
  padding: 0 12px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--mind-text-primary);
}

.auth-input {
  height: 40px;
  width: 100%;
  background: var(--mind-bg-surface-subtle);
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 13.5px;
  color: var(--mind-text-primary);
  outline: none;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.auth-input::placeholder {
  color: var(--mind-text-muted);
}

.auth-input:focus {
  background: var(--mind-bg-canvas);
  border-color: var(--mind-accent-primary);
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  padding-right: 38px;
}

.password-toggle-btn {
  position: absolute;
  right: 8px;
  min-inline-size: 26px;
  min-block-size: 26px;
  border: none;
  background: transparent;
  color: var(--mind-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.forgot-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -2px;
}

.forgot-link {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--mind-accent-solid);
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.sign-in-btn {
  margin-top: 4px;
  height: 40px;
  width: 100%;
  background: var(--mind-accent-solid);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.sign-in-btn:hover {
  background: var(--mind-accent-hover);
}
</style>

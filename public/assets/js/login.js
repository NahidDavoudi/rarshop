/**
 * login.js — صفحه ورود (ES module entry)
 */
import { initConfig, storeConfig } from './config/bootstrap.js';
import { initTheme, pageTitle } from './core/theme.js';
import loadStoreSettings from './core/storeSettings.js';
import api from './core/api.js';

initConfig();

window.API = api;
window.Api = api;

const _state = {
  registerDraft: null,
  loginSmsSent: false,
  timers: {},
};

function t(path, fallback) {
  return storeConfig.texts?.auth?.[path] ?? fallback;
}

function isSmsOtpEnabled() {
  return storeConfig.auth?.smsOtpEnabled === true;
}

function applyLoginBranding() {
  document.querySelectorAll('[data-store-logo]').forEach((el) => {
    if (storeConfig.logo) {
      el.src = storeConfig.logo;
      el.alt = storeConfig.name;
    }
  });
  document.querySelectorAll('[data-store-name]').forEach((el) => {
    el.textContent = storeConfig.name;
  });
  document.querySelectorAll('[data-auth-text]').forEach((el) => {
    const key = el.dataset.authText;
    if (key && storeConfig.texts?.auth?.[key]) {
      el.textContent = storeConfig.texts.auth[key];
    }
  });
  const copyrightEl = document.getElementById('login-copyright');
  if (copyrightEl) {
    copyrightEl.textContent = storeConfig.texts?.footer?.copyright || `© ${storeConfig.name}`;
  }
  applyAuthMode();
}

function applyAuthMode() {
  if (isSmsOtpEnabled()) return;

  document.getElementById('switch-login-sms')?.classList.add('hidden');
  document.getElementById('login-sms-panel')?.classList.add('hidden');
  document.getElementById('register-otp-panel')?.classList.add('hidden');

  const regBtnText = document.getElementById('register-btn-text');
  if (regBtnText) regBtnText.textContent = t('registerSubmit', 'ثبت‌نام');
}

async function boot() {
  await loadStoreSettings(api);
  initTheme();
  pageTitle('ورود و ثبت‌نام');
  applyLoginBranding();

  const sessionOk = await api.auth.validateSession();
  if (sessionOk) {
    const redirect = new URLSearchParams(location.search).get('redirect') || 'index.html#/';
    location.replace(redirect);
    return;
  }

  bindEvents();
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  const base = ' flex-1 py-4 text-sm font-bold tracking-wide transition-colors';
  document.getElementById('tab-login').className = (isLogin ? 'tab-active' : 'tab-inactive') + base;
  document.getElementById('tab-register').className = (!isLogin ? 'tab-active' : 'tab-inactive') + base;
  document.getElementById('form-login').classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden', isLogin);
  if (isLogin) resetLoginSmsPanel();
  else resetRegisterOtpPanel();
}

function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? 'نمایش' : 'پنهان';
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(elId) {
  document.getElementById(elId)?.classList.add('hidden');
}

function setLoading(btnId, textId, label, loading) {
  const btn = document.getElementById(btnId);
  const span = document.getElementById(textId);
  if (btn) btn.disabled = loading;
  if (span) span.textContent = label;
}

function redirectAfterAuth(data) {
  const redirect = new URLSearchParams(location.search).get('redirect');
  if (redirect) location.href = redirect;
  else if (data.user?.role === 'admin') location.href = 'admin.html';
  else location.href = 'index.html#/';
}

function clearTimer(key) {
  if (_state.timers[key]) {
    clearInterval(_state.timers[key]);
    delete _state.timers[key];
  }
}

function startOtpTimer(key, timerElId, resendBtnId, seconds, onExpire) {
  clearTimer(key);
  const timerEl = document.getElementById(timerElId);
  const resendBtn = resendBtnId ? document.getElementById(resendBtnId) : null;
  let remaining = seconds;

  if (timerEl) {
    timerEl.classList.remove('hidden');
    timerEl.textContent = `${t('otpExpires', 'اعتبار کد')}: ${remaining} ${t('seconds', 'ثانیه')}`;
  }
  if (resendBtn) resendBtn.classList.add('hidden');

  _state.timers[key] = setInterval(() => {
    remaining -= 1;
    if (timerEl) {
      timerEl.textContent = remaining > 0
        ? `${t('otpExpires', 'اعتبار کد')}: ${remaining} ${t('seconds', 'ثانیه')}`
        : '';
    }
    if (remaining <= 0) {
      clearTimer(key);
      if (timerEl) timerEl.classList.add('hidden');
      if (resendBtn) resendBtn.classList.remove('hidden');
      onExpire?.();
    }
  }, 1000);
}

function resetLoginSmsPanel() {
  _state.loginSmsSent = false;
  hideError('login-sms-error');
  document.getElementById('login-password-panel')?.classList.remove('hidden');
  document.getElementById('login-sms-panel')?.classList.add('hidden');
  document.getElementById('login-footer-links')?.classList.remove('hidden');
  document.getElementById('login-sms-otp-wrap')?.classList.add('hidden');
  document.getElementById('login-sms-verify-btn')?.classList.add('hidden');
  document.getElementById('login-sms-send-btn')?.classList.remove('hidden');
  document.getElementById('login-otp-timer')?.classList.add('hidden');
  clearTimer('login');
}

function showLoginSmsPanel() {
  hideError('login-error');
  const phone = document.getElementById('login-phone')?.value.trim();
  document.getElementById('login-password-panel')?.classList.add('hidden');
  document.getElementById('login-sms-panel')?.classList.remove('hidden');
  document.getElementById('login-footer-links')?.classList.add('hidden');
  if (phone) document.getElementById('login-sms-phone').value = phone;
}

function resetRegisterOtpPanel() {
  _state.registerDraft = null;
  hideError('register-error');
  hideError('register-otp-error');
  document.getElementById('register-form-panel')?.classList.remove('hidden');
  document.getElementById('register-otp-panel')?.classList.add('hidden');
  document.getElementById('register-resend-btn')?.classList.add('hidden');
  document.getElementById('register-otp-timer')?.classList.add('hidden');
  document.getElementById('reg-otp').value = '';
  clearTimer('register');
  setLoading(
    'register-btn',
    'register-btn-text',
    isSmsOtpEnabled() ? t('sendCode', 'ارسال کد تایید') : t('registerSubmit', 'ثبت‌نام'),
    false,
  );
}

function collectRegisterDraft() {
  const fname = document.getElementById('reg-fname')?.value.trim();
  const lname = document.getElementById('reg-lname')?.value.trim();
  const phone = document.getElementById('reg-phone')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const confirm = document.getElementById('reg-confirm')?.value;
  const terms = document.getElementById('terms')?.checked;

  if (!fname) { showError('register-error', 'نام را وارد کنید'); return null; }
  if (!phone) { showError('register-error', 'شماره همراه را وارد کنید'); return null; }
  if (password.length < 8) { showError('register-error', 'رمز عبور حداقل ۸ کاراکتر باشد'); return null; }
  if (password !== confirm) { showError('register-error', 'رمز عبور و تکرار آن یکسان نیستند'); return null; }
  if (!terms) { showError('register-error', 'قوانین را تأیید کنید'); return null; }

  return {
    name: `${fname} ${lname}`.trim(),
    phone,
    password,
  };
}

async function doLogin() {
  hideError('login-error');
  const phone = document.getElementById('login-phone')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  if (!phone || !password) {
    showError('login-error', 'شماره همراه و رمز عبور را وارد کنید');
    return;
  }
  setLoading('login-btn', 'login-btn-text', 'در حال ورود...', true);
  try {
    const data = await api.auth.login(phone, password);
    redirectAfterAuth(data);
  } catch (e) {
    showError('login-error', e.message);
    setLoading('login-btn', 'login-btn-text', 'ورود به حساب', false);
  }
}

async function sendLoginOtp() {
  hideError('login-sms-error');
  const phone = document.getElementById('login-sms-phone')?.value.trim();
  if (!phone) {
    showError('login-sms-error', 'شماره همراه را وارد کنید');
    return;
  }

  setLoading('login-sms-send-btn', 'login-sms-send-text', t('sending', 'در حال ارسال...'), true);
  try {
    const result = await api.auth.otpRequest(phone, 'login');
    _state.loginSmsSent = true;
    document.getElementById('login-sms-otp-wrap')?.classList.remove('hidden');
    document.getElementById('login-sms-verify-btn')?.classList.remove('hidden');
    document.getElementById('login-sms-send-btn')?.classList.add('hidden');
    document.getElementById('login-otp')?.focus();

    if (result.debug_code) {
      showError('login-sms-error', `کد تست (dev): ${result.debug_code}`);
      document.getElementById('login-sms-error')?.classList.remove('hidden');
      document.getElementById('login-sms-error')?.classList.replace('text-red-700', 'text-amber-700');
      document.getElementById('login-sms-error')?.classList.replace('bg-red-50', 'bg-amber-50');
      document.getElementById('login-sms-error')?.classList.replace('border-red-200', 'border-amber-200');
    }

    startOtpTimer('login', 'login-otp-timer', null, result.expires_in || 120, () => {
      document.getElementById('login-sms-send-btn')?.classList.remove('hidden');
      document.getElementById('login-sms-send-text').textContent = t('resendCode', 'ارسال مجدد کد');
      setLoading('login-sms-send-btn', 'login-sms-send-text', t('resendCode', 'ارسال مجدد کد'), false);
    });
  } catch (e) {
    showError('login-sms-error', e.message);
  } finally {
    if (!_state.loginSmsSent) {
      setLoading('login-sms-send-btn', 'login-sms-send-text', t('sendCode', 'ارسال کد تایید'), false);
    } else {
      setLoading('login-sms-send-btn', 'login-sms-send-text', t('sendCode', 'ارسال کد تایید'), false);
    }
  }
}

async function verifyLoginOtp() {
  hideError('login-sms-error');
  const phone = document.getElementById('login-sms-phone')?.value.trim();
  const code = document.getElementById('login-otp')?.value.trim();
  if (!phone || !code) {
    showError('login-sms-error', 'شماره و کد تایید را وارد کنید');
    return;
  }

  setLoading('login-sms-verify-btn', 'login-sms-verify-text', t('verifying', 'در حال تایید...'), true);
  try {
    const data = await api.auth.otpVerify(phone, code, 'login');
    redirectAfterAuth(data);
  } catch (e) {
    showError('login-sms-error', e.message);
    setLoading('login-sms-verify-btn', 'login-sms-verify-text', t('verifyCode', 'تایید و ورود'), false);
  }
}

async function doRegister() {
  hideError('register-error');
  const draft = collectRegisterDraft();
  if (!draft) return;

  setLoading('register-btn', 'register-btn-text', 'در حال ثبت‌نام...', true);
  try {
    const data = await api.auth.register(draft);
    redirectAfterAuth(data);
  } catch (e) {
    showError('register-error', e.message);
    setLoading('register-btn', 'register-btn-text', t('registerSubmit', 'ثبت‌نام'), false);
  }
}

async function requestRegisterOtp() {
  hideError('register-error');
  const draft = collectRegisterDraft();
  if (!draft) return;

  setLoading('register-btn', 'register-btn-text', t('sending', 'در حال ارسال...'), true);
  try {
    const result = await api.auth.otpRequest(draft.phone, 'register');
    _state.registerDraft = draft;

    document.getElementById('register-form-panel')?.classList.add('hidden');
    document.getElementById('register-otp-panel')?.classList.remove('hidden');
    document.getElementById('register-otp-hint').textContent =
      `${t('otpSent', 'کد تایید ارسال شد')} (${result.phone || draft.phone})`;
    document.getElementById('reg-otp')?.focus();

    if (result.debug_code) {
      showError('register-otp-error', `کد تست (dev): ${result.debug_code}`);
    }

    startOtpTimer('register', 'register-otp-timer', 'register-resend-btn', result.expires_in || 120);
  } catch (e) {
    showError('register-error', e.message);
    setLoading('register-btn', 'register-btn-text', t('sendCode', 'ارسال کد تایید'), false);
  }
}

async function verifyRegisterOtp() {
  hideError('register-otp-error');
  if (!_state.registerDraft) {
    resetRegisterOtpPanel();
    return;
  }

  const code = document.getElementById('reg-otp')?.value.trim();
  if (!code) {
    showError('register-otp-error', 'کد تایید را وارد کنید');
    return;
  }

  const { phone, name, password } = _state.registerDraft;
  setLoading('register-verify-btn', 'register-verify-text', t('verifying', 'در حال تایید...'), true);
  try {
    const data = await api.auth.otpVerify(phone, code, 'register', { name, password });
    redirectAfterAuth(data);
  } catch (e) {
    showError('register-otp-error', e.message);
    setLoading('register-verify-btn', 'register-verify-text', t('verifyAndRegister', 'تایید و ساخت حساب'), false);
  }
}

async function resendRegisterOtp() {
  if (!_state.registerDraft) return;
  hideError('register-otp-error');
  setLoading('register-resend-btn', null, t('sending', 'در حال ارسال...'), true);
  try {
    const result = await api.auth.otpRequest(_state.registerDraft.phone, 'register');
    if (result.debug_code) {
      showError('register-otp-error', `کد تست (dev): ${result.debug_code}`);
    }
    startOtpTimer('register', 'register-otp-timer', 'register-resend-btn', result.expires_in || 120);
  } catch (e) {
    showError('register-otp-error', e.message);
  } finally {
    const btn = document.getElementById('register-resend-btn');
    if (btn) btn.disabled = false;
    if (btn) btn.textContent = t('resendCode', 'ارسال مجدد کد');
  }
}

function bindEvents() {
  document.getElementById('tab-login')?.addEventListener('click', () => switchTab('login'));
  document.getElementById('tab-register')?.addEventListener('click', () => switchTab('register'));
  document.getElementById('goto-register')?.addEventListener('click', () => switchTab('register'));
  document.getElementById('goto-login')?.addEventListener('click', () => switchTab('login'));
  if (location.hash === '#register') switchTab('register');

  document.getElementById('toggle-login-password')?.addEventListener('click', function () { togglePass('login-password', this); });
  document.getElementById('toggle-reg-password')?.addEventListener('click', function () { togglePass('reg-password', this); });

  document.getElementById('login-btn')?.addEventListener('click', doLogin);
  if (isSmsOtpEnabled()) {
    document.getElementById('switch-login-sms')?.addEventListener('click', showLoginSmsPanel);
    document.getElementById('switch-login-password')?.addEventListener('click', resetLoginSmsPanel);
    document.getElementById('login-sms-send-btn')?.addEventListener('click', sendLoginOtp);
    document.getElementById('login-sms-verify-btn')?.addEventListener('click', verifyLoginOtp);
    ['login-sms-phone', 'login-otp'].forEach((id) => {
      document.getElementById(id)?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (_state.loginSmsSent) verifyLoginOtp();
        else sendLoginOtp();
      });
    });
  }

  const onRegisterSubmit = isSmsOtpEnabled() ? requestRegisterOtp : doRegister;
  document.getElementById('register-btn')?.addEventListener('click', onRegisterSubmit);
  if (isSmsOtpEnabled()) {
    document.getElementById('register-verify-btn')?.addEventListener('click', verifyRegisterOtp);
    document.getElementById('register-resend-btn')?.addEventListener('click', resendRegisterOtp);
    document.getElementById('register-back-btn')?.addEventListener('click', resetRegisterOtpPanel);
    document.getElementById('reg-otp')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') verifyRegisterOtp();
    });
  }

  ['login-phone', 'login-password'].forEach((id) => {
    document.getElementById(id)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  });
  ['reg-fname', 'reg-lname', 'reg-phone', 'reg-password', 'reg-confirm'].forEach((id) => {
    document.getElementById(id)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') onRegisterSubmit(); });
  });
}

document.addEventListener('DOMContentLoaded', boot);

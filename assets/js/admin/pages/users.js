/**
 * admin/pages/users.js
 * مدیریت کاربران: لیست، جستجو، تغییر نقش، حذف
 * وابستگی: helpers.js, api.js
 */

;(function () {
  'use strict';

  function _t(path, fallback) {
    return window.getAdminText?.(path, fallback) ?? fallback;
  }

  let _users = [];

  /* ── Public loader ─────────────────────────────────────────── */
  window.loadUsers = async function () {
    try {
      setLoading(true);
      const data = await API.users.list();
      setLoading(false);
      _users = Array.isArray(data) ? data : (data?.data || []);
      _renderUsers(_users);
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  };

  /* ── Render table ──────────────────────────────────────────── */
  function _renderUsers(list) {
    const tbody = $('usersTableBody');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-12 text-dim">${_t('users.empty', 'کاربری یافت نشد')}</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(u => {
      const date    = u.created_at ? new Date(u.created_at).toLocaleDateString('fa-IR') : '—';
      const isAdmin = u.role === 'admin';
      return `<tr class="hover:bg-row transition-colors">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
              ${(u.name || u.phone || '؟')[0]}
            </div>
            <p class="text-sm font-medium text-body">${u.name || '—'}</p>
          </div>
        </td>
        <td class="px-4 py-3 text-sm text-muted" dir="ltr">${u.phone || '—'}</td>
        <td class="px-4 py-3">
          <span class="px-2.5 py-1 rounded-full text-xs font-medium ${isAdmin ? 'bg-accent/10 text-accent' : 'bg-card text-muted'}">
            ${isAdmin ? _t('users.roleAdmin', 'ادمین') : _t('users.roleUser', 'کاربر')}
          </span>
        </td>
        <td class="px-4 py-3 text-xs text-dim">${date}</td>
        <td class="px-4 py-3">
          <div class="flex gap-1">
            <button onclick="toggleUserRole(${u.id},'${u.role}')" title="${isAdmin ? _t('users.roleUser', 'کاربر') : _t('users.roleAdmin', 'ادمین')}"
                    class="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors text-xs">
              ${isAdmin ? '↓' : '↑'}
            </button>
            <button onclick="deleteUser(${u.id},'${(u.name || u.phone || '').replace(/'/g, "\\'")}')"
                    class="p-2 rounded-lg hover:bg-accent/10 text-accent transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  /* ── Toggle role ───────────────────────────────────────────── */
  window.toggleUserRole = async function (id, role) {
    const newRole = role === 'admin' ? 'user' : 'admin';
    if (!confirm(`تغییر نقش به "${newRole === 'admin' ? 'ادمین' : 'کاربر'}"؟`)) return;
    try {
      await API.users.updateRole(id, newRole);
      toast('نقش کاربر تغییر کرد');
      window.loadUsers();
    } catch (e) { toast(e.message, 'error'); }
  };

  /* ── Delete user ───────────────────────────────────────────── */
  window.deleteUser = async function (id, name) {
    if (!confirm(`حذف کاربر "${name}"؟`)) return;
    try {
      await API.users.delete(id);
      toast('کاربر حذف شد');
      window.loadUsers();
    } catch (e) { toast(e.message, 'error'); }
  };

  /* ── Search ────────────────────────────────────────────────── */
  $('usersSearch')?.addEventListener('input', function () {
    const q = this.value.toLowerCase();
    _renderUsers(_users.filter(u =>
      (u.name  || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    ));
  });

})();

/**
 * pages/about.js
 */
import { storeConfig } from '../config/bootstrap.js';
import Router from '../core/router.js';
import PageHeader from '../components/PageHeader.js';

function renderTeamMember(member) {
  const initials = member.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return `
    <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 text-center ${storeConfig.ui.cardHover}">
      <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-surface border border-border flex items-center justify-center text-xl font-bold text-muted">
        ${member.avatar
          ? `<img src="${member.avatar}" alt="${member.name}" class="w-full h-full rounded-full object-cover">`
          : initials}
      </div>
      <h3 class="font-bold text-body mb-1">${member.name}</h3>
      <p class="text-sm text-muted">${member.role}</p>
    </div>`;
}

function renderAboutPage() {
  const { about } = storeConfig.texts.legal;
  const st = about.sectionTitles || {};
  const whyCards = about.whyChooseUs.map((item) => `
    <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 ${storeConfig.ui.cardHover}">
      <div class="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mb-4 mr-auto">
        <i data-lucide="${item.icon}" class="w-5 h-5 text-body"></i>
      </div>
      <h3 class="font-bold text-body mb-2 text-right">${item.title}</h3>
      <p class="text-sm text-muted leading-relaxed text-right">${item.desc}</p>
    </div>`).join('');

  const statCards = about.stats.map((stat) => `
    <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 text-center">
      <p class="text-2xl md:text-3xl font-black text-body mb-1">${stat.value}</p>
      <p class="text-sm text-muted">${stat.label}</p>
    </div>`).join('');

  return `
    ${PageHeader.render({ title: about.title, subtitle: about.subtitle, icon: about.icon })}
    <div class="max-w-[1280px] mx-auto px-4 md:px-6 py-10 md:py-14">
      <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 md:p-10 mb-10">
        <h2 class="text-xl font-bold text-body mb-4 text-right">${st.intro || 'معرفی'}</h2>
        <p class="text-muted leading-relaxed text-right text-sm md:text-base">${about.intro}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 md:p-8">
          <div class="flex items-center gap-3 flex-row-reverse justify-end mb-4">
            <h2 class="text-lg font-bold text-body">${st.mission || 'مأموریت ما'}</h2>
            <i data-lucide="target" class="w-5 h-5 text-muted"></i>
          </div>
          <p class="text-sm md:text-base text-muted leading-relaxed text-right">${about.mission}</p>
        </div>
        <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 md:p-8">
          <div class="flex items-center gap-3 flex-row-reverse justify-end mb-4">
            <h2 class="text-lg font-bold text-body">${st.vision || 'چشم‌انداز ما'}</h2>
            <i data-lucide="eye" class="w-5 h-5 text-muted"></i>
          </div>
          <p class="text-sm md:text-base text-muted leading-relaxed text-right">${about.vision}</p>
        </div>
      </div>
      <div class="mb-10">
        <h2 class="text-xl md:text-2xl font-bold text-body mb-6 text-right">${st.whyChooseUs || 'چرا ما؟'}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">${whyCards}</div>
      </div>
      <div class="mb-10">
        <h2 class="text-xl md:text-2xl font-bold text-body mb-6 text-right">${st.stats || 'آمار'}</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">${statCards}</div>
      </div>
      <div>
        <h2 class="text-xl md:text-2xl font-bold text-body mb-6 text-right">${st.team || 'تیم ما'}</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${about.team.map(renderTeamMember).join('')}
        </div>
      </div>
    </div>`;
}

Router.onEnter('about', function () {
  const root = document.getElementById('about-root');
  if (!root) return;
  root.innerHTML = renderAboutPage();
  if (window.lucide) lucide.createIcons();
});

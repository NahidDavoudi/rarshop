/**
 * admin/pages/dashboard.js
 * داشبورد: آمار کلی + نمودار هفتگی + نمودار وضعیت سفارش‌ها
 * وابستگی: helpers.js, api.js
 */

;(function () {
  'use strict';

  function _cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function _theme() {
    return {
      accent: _cssVar('--color-accent', '#000'),
      accentHover: _cssVar('--color-accent-hover', '#333'),
      muted: _cssVar('--color-muted', '#86868b'),
      border: _cssVar('--color-border', '#d2d2d7'),
      bodyText: _cssVar('--color-body-text', '#1d1d1f'),
      surface: _cssVar('--color-dark-2', '#f5f5f7'),
      body: _cssVar('--color-dark', '#fff'),
    };
  }

  function _t(path, fallback) {
    return window.getAdminText?.(path, fallback) ?? fallback;
  }

  /* ── Public loader ─────────────────────────────────────────── */
  window.loadDashboard = async function () {
    try {
      setLoading(true);
      const _res = await API.dashboard.stats();
      const s    = _res.data || _res;
      setLoading(false);

      setText('stat-products',      (s.total_products  ?? 0).toLocaleString('fa-IR'));
      setText('stat-orders-today',  (s.today_orders    ?? 0).toLocaleString('fa-IR'));
      setText('stat-low-stock',     (s.low_stock_items ?? 0).toLocaleString('fa-IR'));
      setText('stat-pending',       (s.pending_orders  ?? 0).toLocaleString('fa-IR'));
      setText('stat-total-orders',  (s.total_orders    ?? 0).toLocaleString('fa-IR'));
      setText('stat-total-revenue', API.utils.formatPrice(s.total_revenue ?? 0));
      setText('stat-total-users',   (s.total_users     ?? 0).toLocaleString('fa-IR'));

      _renderWeeklyChart(s.weekly_revenue  || []);
      _renderOrderStatusChart(s.order_status || {});
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  };

  // alias قدیمی
  window.loadDashboardStats = window.loadDashboard;

  /* ── Weekly bar chart (D3 + vanilla fallback) ──────────────── */
  function _renderWeeklyChart(rawData) {
    const container = document.getElementById('weeklyChart');
    if (!container) return;
    container.innerHTML = '';

    const data = (rawData && rawData.length)
      ? rawData
      : Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - 6 + i);
          return { date: (d.getMonth() + 1) + '/' + d.getDate(), amount: 0 };
        });

    if (data.every(d => +d.amount === 0)) {
      const { muted } = _theme();
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:${muted};font-size:14px;">${_t('dashboard.noSales', 'هنوز فروشی ثبت نشده')}</div>`;
      return;
    }

    if (typeof d3 === 'undefined') {
      _renderWeeklyVanilla(data, container);
      return;
    }

    const margin = { top: 16, right: 12, bottom: 36, left: 56 };
    const W = container.clientWidth  || 480;
    const H = container.clientHeight || 288;
    const w = W - margin.left - margin.right;
    const h = H - margin.top  - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H).style('overflow', 'visible');
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const { accent, accentHover, muted, border, bodyText, body } = _theme();
    const maxVal = d3.max(data, d => +d.amount) || 1;

    const x = d3.scaleBand().domain(data.map(d => d.date)).range([0, w]).padding(0.35);
    const y = d3.scaleLinear().domain([0, maxVal * 1.15]).range([h, 0]).nice();

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'wkBarGrad')
      .attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
    grad.append('stop').attr('offset', '0%').attr('stop-color', accent);
    grad.append('stop').attr('offset', '100%').attr('stop-color', accentHover);

    // grid lines
    g.append('g').call(
      d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat('')
    ).call(el => {
      el.select('.domain').remove();
      el.selectAll('line').attr('stroke', border).attr('stroke-dasharray', '4,3');
    });

    // Y axis labels
    g.append('g').call(
      d3.axisLeft(y).ticks(4).tickFormat(v => {
        if (!v) return '۰';
        if (v >= 1e6) return (v / 1e6).toLocaleString('fa-IR') + 'M';
        if (v >= 1e3) return (v / 1e3).toLocaleString('fa-IR') + 'K';
        return v.toLocaleString('fa-IR');
      })
    ).call(el => {
      el.select('.domain').remove();
      el.selectAll('line').remove();
      el.selectAll('text')
        .attr('fill', muted)
        .style('font-size', '10px')
        .style('font-family', 'var(--font-vazir, Vazirmatn, sans-serif)');
    });

    // X axis
    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(el => {
        el.select('.domain').attr('stroke', border);
        el.selectAll('text')
          .attr('fill', muted)
          .style('font-size', '10px')
          .style('font-family', 'var(--font-vazir, Vazirmatn, sans-serif)')
          .attr('dy', '1.2em');
      });

    // bars
    const bars = g.selectAll('.bar').data(data).join('rect')
      .attr('x', d => x(d.date)).attr('width', x.bandwidth())
      .attr('rx', 5).attr('ry', 5).attr('fill', 'url(#wkBarGrad)')
      .attr('y', h).attr('height', 0);

    bars.transition().duration(600).ease(d3.easeCubicOut)
      .delay((_, i) => i * 55)
      .attr('y', d => y(+d.amount))
      .attr('height', d => h - y(+d.amount));

    // tooltip
    container.style.position = 'relative';
    const tip = d3.select(container).append('div')
      .style('position', 'absolute').style('background', bodyText).style('color', body)
      .style('font-size', '12px').style('padding', '5px 10px').style('border-radius', '8px')
      .style('pointer-events', 'none').style('opacity', '0').style('transition', 'opacity .15s')
      .style('white-space', 'nowrap').style('font-family', 'Vazirmatn,sans-serif');

    bars.on('mouseenter', function (_ev, d) {
      d3.select(this).attr('fill', accentHover);
      tip.style('opacity', '1').html(Number(d.amount).toLocaleString('fa-IR') + ' تومان');
    }).on('mousemove', function (ev) {
      const r = container.getBoundingClientRect();
      tip.style('left', (ev.clientX - r.left + 8) + 'px')
         .style('top', (ev.clientY - r.top - 36) + 'px');
    }).on('mouseleave', function () {
      d3.select(this).attr('fill', 'url(#wkBarGrad)');
      tip.style('opacity', '0');
    });
  }

  function _renderWeeklyVanilla(data, el) {
    const { accent, accentHover, muted } = _theme();
    const max = Math.max(...data.map(d => +d.amount), 1);
    el.style.cssText = 'display:flex;align-items:flex-end;gap:8px;padding:0 8px;height:100%;';
    data.forEach(d => {
      const pct = Math.max(2, Math.round((+d.amount / max) * 100));
      const col = document.createElement('div');
      col.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;';
      col.innerHTML = `
        <div style="width:100%;flex:1;display:flex;align-items:flex-end;">
          <div style="width:100%;height:${pct}%;min-height:4px;border-radius:6px 6px 0 0;
               background:linear-gradient(to top,${accentHover},${accent});"></div>
        </div>
        <div style="font-size:10px;color:${muted};">${d.date}</div>`;
      el.appendChild(col);
    });
  }

  /* ── Order status donut chart (D3 + vanilla fallback) ──────── */
  function _renderOrderStatusChart(data) {
    const container = document.getElementById('orderStatusChart');
    if (!container) return;
    container.innerHTML = '';

    const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
    if (!entries.length) {
      const { muted } = _theme();
      container.innerHTML = `<div style="text-align:center;padding:40px 0;color:${muted};font-size:14px;">${_t('dashboard.noData', 'داده‌ای موجود نیست')}</div>`;
      return;
    }

    const { accent, accentHover, muted, bodyText, body } = _theme();
    const COLORS = [accent, accentHover, '#1d4ed8', '#7c3aed', '#15803d', muted];

    if (typeof d3 === 'undefined') {
      _renderDonutVanilla(entries, COLORS, container);
      return;
    }

    const total  = d3.sum(entries, ([, v]) => v) || 1;
    const SIZE   = 170;
    const R      = SIZE / 2;
    const inner  = R * 0.58;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;position:relative;';
    container.appendChild(wrap);

    const svg    = d3.select(wrap).append('svg').attr('width', SIZE).attr('height', SIZE).style('overflow', 'visible');
    const g      = svg.append('g').attr('transform', `translate(${R},${R})`);
    const pie    = d3.pie().value(([, v]) => v).sort(null);
    const arcFn  = d3.arc().innerRadius(inner).outerRadius(R - 4).cornerRadius(3);
    const arcHov = d3.arc().innerRadius(inner).outerRadius(R + 5).cornerRadius(3);

    const tip = d3.select(wrap).append('div')
      .style('position', 'absolute').style('background', bodyText).style('color', body)
      .style('font-size', '12px').style('padding', '5px 10px').style('border-radius', '8px')
      .style('pointer-events', 'none').style('opacity', '0').style('white-space', 'nowrap')
      .style('font-family', 'Vazirmatn,sans-serif').style('transition', 'opacity .15s');

    const arcs = g.selectAll('path').data(pie(entries)).join('path')
      .attr('fill', (_, i) => COLORS[i % COLORS.length])
      .attr('stroke', body).attr('stroke-width', 2)
      .each(function (d) { this._current = { startAngle: d.startAngle, endAngle: d.startAngle }; });

    arcs.transition().duration(700).ease(d3.easeCubicOut)
      .attrTween('d', function (d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(1);
        return t => arcFn(i(t));
      });

    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.15em')
      .style('font-size', '20px').style('font-weight', '700').style('fill', bodyText)
      .style('font-family', 'var(--font-vazir, Vazirmatn, sans-serif)').text(total.toLocaleString('fa-IR'));
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
      .style('font-size', '11px').style('fill', muted)
      .style('font-family', 'var(--font-vazir, Vazirmatn, sans-serif)').text(_t('dashboard.ordersLabel', 'سفارش'));

    arcs.on('mouseenter', function (_ev, d) {
      d3.select(this).transition().duration(120).attr('d', arcHov);
      tip.style('opacity', '1')
         .html(`${d.data[0]}: <b>${d.data[1].toLocaleString('fa-IR')}</b> (${Math.round(d.data[1] / total * 100)}٪)`);
    }).on('mousemove', function (ev) {
      const r = wrap.getBoundingClientRect();
      tip.style('left', (ev.clientX - r.left + 10) + 'px')
         .style('top', (ev.clientY - r.top - 36) + 'px');
    }).on('mouseleave', function () {
      d3.select(this).transition().duration(120).attr('d', arcFn);
      tip.style('opacity', '0');
    });

    // legend
    const legend = document.createElement('div');
    legend.style.cssText = 'width:100%;display:flex;flex-direction:column;gap:7px;';
    entries.forEach(([label, val], i) => {
      const pct   = Math.round((val / total) * 100);
      const color = COLORS[i % COLORS.length];
      const row   = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="width:9px;height:9px;border-radius:50%;background:${color};flex-shrink:0;"></span>
          <span style="font-size:12px;color:${muted};">${label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
          <span style="font-size:12px;font-weight:600;color:${bodyText};">${val.toLocaleString('fa-IR')}</span>
          <span style="font-size:11px;color:${muted};">(${pct}٪)</span>
        </div>`;
      legend.appendChild(row);
    });
    wrap.appendChild(legend);
  }

  function _renderDonutVanilla(entries, COLORS, el) {
    const { bodyText, muted, body } = _theme();
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    let deg = 0;
    const gradient = entries.map(([, v], i) => {
      const slice = (v / total) * 360;
      const part  = `${COLORS[i % COLORS.length]} ${deg}deg ${deg + slice}deg`;
      deg += slice;
      return part;
    }).join(', ');

    el.style.cssText = 'display:flex;flex-direction:column;gap:16px;';

    const donutWrap = document.createElement('div');
    donutWrap.style.cssText = 'display:flex;align-items:center;justify-content:center;';
    const donut = document.createElement('div');
    donut.style.cssText = `width:160px;height:160px;border-radius:50%;background:conic-gradient(${gradient});position:relative;`;
    const hole = document.createElement('div');
    hole.style.cssText = `position:absolute;inset:28px;background:${body};border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;`;
    hole.innerHTML = `<span style="font-size:22px;font-weight:700;color:${bodyText};">${total.toLocaleString('fa-IR')}</span><span style="font-size:11px;color:${muted};">${_t('dashboard.ordersLabel', 'سفارش')}</span>`;
    donut.appendChild(hole);
    donutWrap.appendChild(donut);
    el.appendChild(donutWrap);

    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    entries.forEach(([label, val], i) => {
      const pct   = Math.round((val / total) * 100);
      const color = COLORS[i % COLORS.length];
      const row   = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
          <span style="font-size:12px;color:${muted};">${label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:12px;font-weight:600;color:${bodyText};">${val.toLocaleString('fa-IR')}</span>
          <span style="font-size:11px;color:${muted};">(${pct}٪)</span>
        </div>`;
      legend.appendChild(row);
    });
    el.appendChild(legend);
  }

})();

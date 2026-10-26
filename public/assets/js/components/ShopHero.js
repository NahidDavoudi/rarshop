const ShopHero = {
  render(title) {
    return `
      <section class="bg-surface border-y border-border">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6 py-10 md:py-14">
          <h1 class="text-2xl md:text-4xl font-bold text-body text-center">${title}</h1>
        </div>
      </section>`;
  },

  bind() { /* static */ },
};

export default ShopHero;

/* Must load before https://cdn.tailwindcss.com */
tailwind = window.tailwind || {};
tailwind.config = {
  theme: {
    extend: {
      colors: {
        'brand-yellow': '#FFBB3D',
        'brand-dark': '#121619',
        'brand-green-dark': '#2D4839',
        'brand-green-bright': '#08814B',
        'brand-paper': '#fdfdf8',
      },
    },
  },
};

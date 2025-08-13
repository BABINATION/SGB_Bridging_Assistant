/* Must load before https://cdn.tailwindcss.com */
tailwind = window.tailwind || {};
tailwind.config = {
  theme: {
    extend: {
      colors: {
        'brand-yellow': '#ffc709',
        'brand-blue': '#00b0ff',
        'brand-red': '#ff0065',
        'brand-green': '#42db66',
        'brand-dark': '#000079',
        'brand-paper': '#ffffff',
      },
    },
  },
};

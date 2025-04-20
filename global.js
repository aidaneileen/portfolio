/* =========================================
   1. Navigation Bar
========================================= */
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'resume/', title: 'Resume' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/aidaneileen', title: 'GitHub' },
];

let nav = document.createElement('nav');
let ul = document.createElement('ul');
nav.appendChild(ul);
document.body.prepend(nav);

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/portfolio/";

const normalize = path => path.replace(/\/$/, "");

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  const currentPath = normalize(location.pathname);
  const linkPath = normalize(new URL(a.href).pathname);

  if (a.host === location.host && linkPath === currentPath) {
    a.classList.add('current');
  }

  let li = document.createElement('li');
  li.appendChild(a);
  ul.appendChild(li);
}
/* =========================================
   2. Create Color Scheme Switch
========================================= */
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-switcher">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const themeSwitch = document.getElementById('theme-switcher');

function setColorScheme(scheme) {
  if (scheme === 'light dark') {
    document.documentElement.removeAttribute('data-user-color-scheme');
    document.documentElement.style.colorScheme = 'light dark';
  } else {
    document.documentElement.setAttribute('data-user-color-scheme', scheme);
    document.documentElement.style.colorScheme = scheme;
  }
}

themeSwitch.addEventListener('change', function () {
  const value = this.value;
  setColorScheme(value);  
  localStorage.colorScheme = value;  
});

if ('colorScheme' in localStorage) {
  const savedScheme = localStorage.colorScheme;
  setColorScheme(savedScheme);  
  themeSwitch.value = savedScheme; 
}
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'resume/', title: 'Resume' },
  { url: 'contact/', title: 'Contact' },
];

let nav = document.createElement('nav');
let ul = document.createElement('ul');
nav.appendChild(ul);
document.body.prepend(nav);

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/portfolio/";

// Normalize pathname (removes trailing slash)
const normalize = path => path.replace(/\/$/, "");

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  // Normalize both to compare accurately
  const currentPath = normalize(location.pathname);
  const linkPath = normalize(new URL(a.href).pathname);

  if (a.host === location.host && linkPath === currentPath) {
    a.classList.add('current');
  }

  let li = document.createElement('li');
  li.appendChild(a);
  ul.appendChild(li);
}

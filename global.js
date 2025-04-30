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

  const normalize = path => path.replace(/\/$/, "");
  const currentPath = normalize(location.pathname.replace(/^\/portfolio/, ""));
  const linkPath = normalize(new URL(a.href).pathname.replace(/^\/portfolio/, ""));
  
  if (
    a.host === location.host &&
    (linkPath === currentPath || (linkPath.includes("/projects") && currentPath.startsWith(linkPath)))
  ) {
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

/* =========================================
   3. Projects Page - Fetch JSON
========================================= */
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

/* =========================================
   4. Projects Page - Render
========================================= */
export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    console.error('renderProjects error: containerElement is invalid.');
    return;
  }

  if (!Array.isArray(projects)) {
    console.error('renderProjects error: projects is not an array.');
    return;
  }

  containerElement.innerHTML = '';

  if (projects.length === 0) {
    const placeholder = document.createElement('p');
    placeholder.textContent = 'No projects available at the moment.';
    containerElement.appendChild(placeholder);
    return;
  }

  projects.forEach((project) => {
    const article = document.createElement('article');
    article.classList.add('grid-item'); 
    article.style.cursor = 'pointer'; 

    const link = document.createElement('a');
    link.href = project.link || '#';
    //link.target = '_blank';
    link.style.textDecoration = 'none';
    link.style.color = 'inherit';

    const image = document.createElement('img');
    image.src = project.image || '';
    image.alt = project.title ? `${project.title} image` : 'Project image';

    const heading = document.createElement(headingLevel);
    heading.textContent = project.title || 'Untitled Project';
    heading.style.marginTop = '1rem';

    const description = document.createElement('p');
    description.textContent = project.description || 'No description available.';

    link.appendChild(image);
    link.appendChild(heading);
    link.appendChild(description);
    article.appendChild(link);
    containerElement.appendChild(article);
  });
}


/* =========================================
   5. GitHub API - Fetch User Data
========================================= */
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
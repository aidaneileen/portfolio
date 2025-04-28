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

/* =========================================
   3. Projects Page - Fetch JSON
========================================= */
export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);

    // Check if the fetch was successful
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    // Parse and return the JSON data
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
  // Check if containerElement is valid
  if (!containerElement) {
    console.error('renderProjects error: containerElement is invalid.');
    return;
  }

  // Check if projects is an array
  if (!Array.isArray(projects)) {
    console.error('renderProjects error: projects is not an array.');
    return;
  }

  // Clear existing content
  containerElement.innerHTML = '';

  // Handle empty project list
  if (projects.length === 0) {
    const placeholder = document.createElement('p');
    placeholder.textContent = 'No projects available at the moment.';
    containerElement.appendChild(placeholder);
    return;
  }

  // Loop through and create each project
  projects.forEach((project) => {
    const article = document.createElement('article');
    article.classList.add('grid-item');

    // Dynamically create a heading (h2, h3, etc.)
    const heading = document.createElement(headingLevel);
    heading.textContent = project.title || 'Untitled Project';

    const image = document.createElement('img');
    image.src = project.image || '';
    image.alt = project.title ? `${project.title} image` : 'Project image';

    const description = document.createElement('p');
    description.textContent = project.description || 'No description available.';

    const links = document.createElement('p');
    links.classList.add('links');

    if (project.link) {
      const viewLink = document.createElement('a');
      viewLink.href = project.link;
      viewLink.textContent = 'View';
      viewLink.target = '_blank';
      links.appendChild(viewLink);
    }

    // Assemble the article
    article.appendChild(heading);
    article.appendChild(image);
    article.appendChild(description);
    article.appendChild(links);

    // Add the article to the container
    containerElement.appendChild(article);
  });
}

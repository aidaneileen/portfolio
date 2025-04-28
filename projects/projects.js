import { fetchJSON, renderProjects } from '../global.js';

async function main() {
  const projects = await fetchJSON('../lib/projects.json');
  const projectsContainer = document.querySelector('.projects');
  renderProjects(projects, projectsContainer, 'h2');


const titleElement = document.querySelector('.section-title');
if (titleElement) {
  titleElement.textContent = `Projects (${projects.length})`;
}
}

main();
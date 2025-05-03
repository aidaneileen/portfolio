import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let query = '';
let selectedIndex = -1;
let allProjects = [];

async function main() {
  allProjects = await fetchJSON('../lib/projects.json');
  const searchInput = document.querySelector('.searchBar');
  searchInput.addEventListener('input', (event) => {
    query = event.target.value;
    renderAll();
  });

  renderAll();
}

function getYearByIndex(i) {
  const rolled = d3.rollups(allProjects, v => v.length, d => d.year);
  return rolled.map(([year]) => year)[i];
}

function getFilteredProjects() {
  return allProjects.filter(project => {
    const values = Object.values(project).join('\n').toLowerCase();
    const matchesQuery = values.includes(query.toLowerCase());

    if (selectedIndex === -1) {
      return matchesQuery;
    } else {
      const selectedYear = getYearByIndex(selectedIndex);
      return matchesQuery && project.year === selectedYear;
    }
  });
}

function renderAll() {
  const filtered = getFilteredProjects();
  renderProjects(filtered, document.querySelector('.projects'), 'h2');
  renderPieChart(allProjects, filtered);
}

function renderPieChart(fullProjects, filteredProjects) {
  const svg = d3.select('svg');
  svg.selectAll('*').remove();
  d3.select('.legend').selectAll('*').remove();

  const rolledData = d3.rollups(
    fullProjects,
    v => v.length,
    d => d.year
  );

  const data = rolledData.map(([year, count]) => ({
    label: year,
    value: count
  }));

  const pie = d3.pie().value(d => d.value);
  const arcData = pie(data);
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  arcData.forEach((arc, i) => {
    svg.append('path')
      .attr('d', arcGenerator(arc))
      .attr('fill', colors(i))
      .attr('class', i === selectedIndex ? 'selected' : '')
      .style('cursor', 'pointer')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        renderAll();
      });
  });

  const legend = d3.select('.legend');
  legend
    .style('display', 'flex')
    .style('justify-content', 'space-between')
    .style('flex-wrap', 'wrap')
    .style('gap', '1rem')
    .style('width', '100%');

  data.forEach((d, i) => {
    legend.append('li')
      .attr('class', `legend-item ${i === selectedIndex ? 'selected' : ''}`)
      .style('--color', colors(i))
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        renderAll();
      });
  });
}

main();

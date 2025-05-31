import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale;
let commits = [];
let filteredCommits = [];
let commitProgress = 100;
let timeScale;
let commitMaxTime;
let colors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  return d3.groups(data, d => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;
      const ret = {
        id: commit,
        url: 'https://github.com/aidaneileen/portfolio/commit/' + commit,
        author, date, time, timezone, datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };
      Object.defineProperty(ret, 'lines', { value: lines, enumerable: false });
      return ret;
    })
    .sort((a, b) => a.datetime - b.datetime);
}

function renderCommitInfo(data, commits) {
  const container = d3.select('#stats');
  container.selectAll('*').remove();

  const stats = [
    { label: 'Commits', value: commits.length },
    { label: 'Files', value: d3.groups(data, d => d.file).length },
    { label: 'Total LOC', value: data.length },
    { label: 'Max Depth', value: d3.max(data, d => d.depth) },
    { label: 'Longest Line', value: d3.max(data, d => d.length) },
    {
      label: 'Max Lines',
      value: d3.max(
        d3.rollups(data, v => d3.max(v, d => d.line), d => d.file),
        d => d[1]
      ),
    },
    {
      label: 'Avg Depth',
      value: d3.mean(data, d => d.depth).toFixed(2),
    },
    {
      label: 'Top Day',
      value: (() => {
        const byDay = d3.rollups(
          data,
          v => v.length,
          d => new Date(d.datetime).toLocaleDateString('en-US', { weekday: 'long' })
        );
        return d3.greatest(byDay, d => d[1])?.[0] || 'N/A';
      })(),
    },
  ];

  const dl = container.append('dl').attr('class', 'summary-stats');
  const dtdd = dl.selectAll('div')
    .data(stats)
    .enter()
    .append('div')
    .attr('class', 'summary-item');
  dtdd.append('dt').text(d => d.label);
  dtdd.append('dd').text(d => d.value);
}

function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);
  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

const filesContainer = d3.select('#files')
  .selectAll('div')
  .data(files, d => d.name)
  .join(enter => enter.append('div').call(div => {
    div.append('dt').append('code');
    div.append('dd');
  }));

filesContainer.select('dt > code').html(d => `
  <code>${d.name}</code>
  <small class="date" style="display: block;">${d.lines.length} lines</small>
`);

filesContainer.select('dd')
  .selectAll('div')
  .data(d => d.lines)
  .join('div')
  .attr('class', 'loc')
  .attr('style', d => `--color: ${colors(d.type)}`);
}

function renderTooltipContent(commit) {
  if (!commit) return;
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('commit-time').textContent = commit.datetime.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(visible) {
  document.getElementById('commit-tooltip').hidden = !visible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x0 <= x && x <= x1 && y0 <= y && y <= y1;
}

function renderSelectionCount(selection) {
  const selected = selection ? filteredCommits.filter(d => isCommitSelected(selection, d)) : [];
  document.getElementById('selection-count').textContent = `${selected.length || 'No'} commits selected`;
  return selected;
}

function renderLanguageBreakdown(selection) {
  const selected = selection ? filteredCommits.filter(d => isCommitSelected(selection, d)) : [];
  const container = document.getElementById('language-breakdown');
  container.innerHTML = '';

  if (selected.length === 0) return;

  const lines = selected.flatMap(d => d.lines);
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
  }
}

function renderScatterPlot(data, commits) {
  const width = 1000, height = 600;
  const margin = { top: 10, right: 10, bottom: 50, left: 60 };
  const usable = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  const svg = d3.select('#chart').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime().domain(d3.extent(commits, d => d.datetime)).range([usable.left, usable.right]).nice();
  yScale = d3.scaleLinear().domain([0, 24]).range([usable.bottom, usable.top]);

  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usable.bottom})`)
    .call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat('%b %d')));

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usable.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => `${String(d).padStart(2, '0')}:00`));

  const dots = svg.append('g').attr('class', 'dots');

  const sortedCommits = d3.sort(commits, d => -d.totalLines);
  dots.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => d3.scaleSqrt().domain([1, d3.max(commits, d => d.totalLines)]).range([2, 20])(d.totalLines))
    .attr('fill', 'var(--primary-color)')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  svg.call(d3.brush().on('start brush end', (event) => {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }));
}

function updateScatterPlot(data, commits) {
  const svg = d3.select('#chart svg');
  xScale.domain(d3.extent(commits, d => d.datetime));
  svg.select('g.x-axis').call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat('%b %d')));

  const rScale = d3.scaleSqrt().domain(d3.extent(commits, d => d.totalLines)).range([2, 20]);
  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, d => -d.totalLines);
  dots.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'var(--primary-color)')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

function onTimeSliderChange() {
  commitProgress = +document.getElementById('commit-progress').value;
  commitMaxTime = timeScale.invert(commitProgress);
  document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  

  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

function onStepEnter({ element }) {
  const commit = element.__data__;
  if (!commit) return;
  commitMaxTime = commit.datetime;
  commitProgress = timeScale(commit.datetime);
  document.getElementById('commit-progress').value = commitProgress;
  document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

let data = await loadData();
commits = processCommits(data);
filteredCommits = commits;
timeScale = d3.scaleTime().domain(d3.extent(commits, d => d.datetime)).range([0, 100]);
commitMaxTime = timeScale.invert(commitProgress);
renderScatterPlot(data, filteredCommits);
renderCommitInfo(data, filteredCommits);
document.getElementById('commit-progress').addEventListener('input', onTimeSliderChange);
onTimeSliderChange();

document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString('en-US', {
  dateStyle: 'long',
  timeStyle: 'short',
});

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html((d, i) => {
    const date = d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' });
    const commitText = i === 0 ? 'my first commit' : 'another commit';
    const fileCount = d3.rollups(d.lines, v => v.length, l => l.file).length;
    return `
      <p>
        <strong>${date}</strong>: 
        <a href="${d.url}" target="_blank">${commitText}</a>, 
        editing <strong>${d.totalLines}</strong> lines across <strong>${fileCount}</strong> file${fileCount !== 1 ? 's' : ''}.
      </p>
    `;
  });
  
const scroller = scrollama();
scroller
  .setup({
    step: '#scrolly-1 .step',
    offset: 0.5
  })
  .onStepEnter(onStepEnter);

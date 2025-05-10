import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale, yScale;
let commits = [];

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
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;

      const ret = {
        id: commit,
        url: 'https://github.com/aidaneileen/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: false,
        enumerable: false,
        configurable: false
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  const container = d3.select('#stats');
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

function renderTooltipContent(commit) {
  if (!commit || !commit.id) return;

  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  link.href = commit.url;
  link.textContent = commit.id;

  date.textContent = commit.datetime?.toLocaleDateString('en', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  time.textContent = commit.datetime?.toLocaleTimeString('en', {
    hour: '2-digit',
    minute: '2-digit',
  });

  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
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
  const selectedCommits = selection ? commits.filter(d => isCommitSelected(selection, d)) : [];
  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection ? commits.filter(d => isCommitSelected(selection, d)) : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap(d => d.lines);
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
  }
}

function renderScatterPlot(data) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 50, left: 60 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const colorScale = d3.scaleLinear()
    .domain([0, 12, 24])
    .range(['#3b82f6', '#facc15', '#fb923c']);

  const hours = d3.range(0, 25, 1);
  svg.append('g')
    .selectAll('line')
    .data(hours)
    .join('line')
    .attr('x1', usableArea.left)
    .attr('x2', usableArea.right)
    .attr('y1', d => yScale(d))
    .attr('y2', d => yScale(d))
    .attr('stroke', d => colorScale(d))
    .attr('stroke-opacity', 0.5)
    .attr('stroke-width', 1);

  const xAxis = d3.axisBottom(xScale)
    .ticks(10)
    .tickFormat(d3.timeFormat('%b %d'));

  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 20]);
  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  svg.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('fill-opacity', 0.7)
    .attr('fill', 'var(--primary-color)')
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  const brush = d3.brush().on('start brush end', brushed);
  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();

  function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }
}

let data = await loadData();
commits = processCommits(data);
renderCommitInfo(data, commits);
renderScatterPlot(data);

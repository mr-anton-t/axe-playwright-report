#!/usr/bin/env node
const fs = require('fs');
const path = require("path");
const URL = require('url').URL;
require('dotenv').config({ path: path.join(process.cwd(), '.env.a11y') });

const BASE_DIR = process.env.OUTPUT_DIR || './sunrise-axe-dashboard'
const PAGES_DIR = '/pages';

const allFiles = fs.readdirSync(BASE_DIR + PAGES_DIR);
const jsonFiles = allFiles.filter(file => file.endsWith('.json'));

function getAxeVersion(version) {
    const parts = version.split('.');
    return parts.slice(0, 2).join('.');
}

function escapeHTML(html) {
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function readJSONFile(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function generateBaseContent(report) {
    const {userAgent, windowWidth, windowHeight} = report.testEnvironment || {};

    return `
      <body class="bg-white text-gray-900">
            <div class="container mx-auto p-4 max-w-6xl">
                <!-- Header and Breadcrumb -->
                <div class="mb-6">
                   <div class="flex justify-between items-center">
                        <h1 class="text-2xl font-bold">Page:  ${report.pagePath !== undefined ? report.pagePath : report.url}</h1>
                        <a href="${report.url}" target="_blank" class="text-blue-600 hover:text-blue-800">
                            <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">View in Browser</button>
                        </a>
                    </div>
                    <div class="text-sm text-gray-500 mt-2">
    <div>Browser: ${userAgent || 'N/A'}, Viewport: ${windowWidth || 0}×${windowHeight || 0}</div>
</div>
                </div>


                {{FILTERS}}

                {{TABS}}

                {{ISSUE_CARDS}}
            </div>
        </body>
        `
}

function generateFilters(report, affected) {
    // Extract unique impact values and tags (existing code)
    const impactValues = new Set();
    const tagValues = new Set();
    const disabilityValues = new Set();

    // Collect impacts and tags from all sections
    [...report.violations, ...report.incomplete, ...report.passes].forEach(issue => {
        if (issue.impact) {
            impactValues.add(issue.impact.toLowerCase());
        }

        // Collect all unique tags
        if (issue.tags && Array.isArray(issue.tags)) {
            issue.tags.forEach(tag => tagValues.add(tag.toLowerCase()));
        }

        // Collect all unique disability types
        if (affected && Array.isArray(affected)) {
            const rule = affected.find(item => item.ruleId === issue.id);
            if (rule && rule['disabilityTypesAffected']) {
                rule['disabilityTypesAffected'].forEach(disability => {
                    if (disability.name) {
                        disabilityValues.add(disability.name);
                    }
                });
            }
        }
    });

    // Convert to arrays and sort
    const sortedImpacts = [...impactValues].sort();
    const sortedTags = [...tagValues].sort();
    const sortedDisabilities = [...disabilityValues].sort();

    // Generate options HTML
    const impactOptions = sortedImpacts.map(impact =>
        `<option value="${impact}">${impact.charAt(0).toUpperCase() + impact.slice(1)}</option>`
    ).join('');

    const tagOptions = sortedTags.map(tag =>
        `<option value="${tag}">${tag}</option>`
    ).join('');

    const disabilityOptions = sortedDisabilities.map(disability =>
        `<option value="${disability.toLowerCase()}">${disability}</option>`
    ).join('');


    return `
        <div class="mb-6 flex flex-wrap gap-4">
            <!-- Impact Filter -->
            <div class="flex-1 min-w-[200px]">
                <label for="impact-filter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Impact</label>
                <select id="impact-filter" class="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Impacts</option>
                      ${impactOptions}
                </select>
            </div>

            <!-- Standards/Tags Filter -->
            <div class="flex-1 min-w-[200px]">
                <label for="tag-filter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Standard</label>
                <select id="tag-filter" class="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Standards</option>
                      ${tagOptions}
                </select>
            </div>

            <!-- Disabilities Filter -->
            <div class="flex-1 min-w-[200px]">
                <label for="disability-filter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Disability</label>
                <select id="disability-filter" class="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Disabilities</option>
                    ${disabilityOptions}
                </select>
            </div>
        </div>
    `;
}

function generateSearchBar() {
    return `
        <div class="mb-6 relative">
            <div class="relative">
                <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-3 h-4 w-4 text-gray-500" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                    id="search-input"
                    type="text"
                    placeholder="Search by description or accessibility ID"
                    class="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>
    `;
}

function generateTabs(report) {
    const tabs = [{
        id: 'violations',
        name: 'Violations',
        count: report.violations.length || 0,
        color: 'text-red-600',
        borderColor: 'border-red-500'
    },
        {
            id: 'incomplete',
            name: 'Incomplete',
            count: report.incomplete.length || 0,
            color: 'text-blue-600',
            borderColor: 'border-blue-500'
        },
        {
            id: 'passes',
            name: 'Passes',
            count: report.passes.length || 0,
            color: 'text-green-500',
            borderColor: 'border-green-500'
        },
    ];

    let tabContent = '';

    tabs.forEach(tab => {
        let svgContent;
        if (tab.id === 'violations') {
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                </svg>`;
        } else if (tab.id === 'incomplete') {
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>`;
        } else if (tab.id === 'passes') {
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 6L9 17l-5-5"></path>
                </svg>`;
        }

        tabContent += `
            <button data-tab="${tab.id}" class="flex items-center justify-center py-2 border-b-2 hover:bg-gray-100 text-gray-500 hover:${tab.color} [&.active]:${tab.color} [&.active]:border-b-${tab.borderColor}">
                ${svgContent}
                <span class="ml-2">${tab.name}</span>
                <span class="issue-count ml-2 bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-sm">${tab.count}</span>
            </button>
        `;
    });

    return `
        <div class="mb-6">
            <div class="grid grid-cols-4 gap-2 border-b">
                ${tabContent}
            </div>
        </div>
    `;
}

function generateTabContent(tabName, issueCards) {
    const tabTypeText = {
        'violations': 'violation',
        'inapplicable': 'inapplicable',
        'incomplete': 'incomplete',
        'passes': 'passes'
    }[tabName];

    return `
        <div data-tab-content="${tabName}" class="${tabName !== 'violations' ? 'hidden' : ''}">
            ${issueCards}
            <div class="no-results-message p-4 my-4 text-center text-gray-500 bg-gray-50 rounded-md shadow-sm hidden">
                No ${tabTypeText} issues found matching your search criteria.
            </div>
        </div>
    `;
}

function generateIssueCards(issues, affected, screenshot) {
    function getDisabilityTypes(ruleId) {
        if (!affected || !Array.isArray(affected)) return [];
        const rule = affected.find(item => item.ruleId === ruleId);
        return rule ? rule['disabilityTypesAffected'] || [] : [];
    }

    let issueCards = '';
    if (!issues || issues.length === 0) {
        issueCards = `
        <div class="no-results-message p-4 my-4 text-center text-gray-500 bg-gray-50 rounded-md shadow-sm">
                No issues found matching your search criteria.
            </div>
        `;
    } else {
        for (let i = 0; i < issues.length; i++) {
            const issue = issues[i];
            issueCards += `
                <div class="issue-card mb-4 border rounded-lg" data-id="${issue.id}">
                    <div class="py-2 px-4">
                        <div class="flex justify-between items-center mb-4 cursor-pointer" onclick="toggleIssueCard(this)">
                            <div>
                                <div class="flex items-center gap-2 mt-2 mb-3">
                                  <span class="${issue.impact === 'critical' ? 'bg-red-600' : issue.impact === 'serious' ? 'bg-orange-500' : issue.impact === 'minor' ? 'bg-blue-600' : 'bg-green-500'} text-white px-2 py-0.5 rounded text-sm">${issue.impact || 'none'}</span>
                                    <h2 class="text-base font-semibold">${issue.id}</h2>
                                </div>

                                <div class="issue_description" class="mb-2">
                               <p class="font-semibold text-black mb-2">${escapeHTML(issue.description)}</p>
                                </div>

                              <div class="tag_list flex flex-wrap gap-1">
                Standards: ${issue.tags.map(tag => `<span class="border text-sm px-2 py-1 rounded">${tag}</span>`).join(' ')}
            </div>

            <div class="disability_list flex flex-wrap gap-1 mt-2">
                Disabilities Affected: ${getDisabilityTypes(issue.id).map(disability =>
                `<span class="bg-purple-100 border border-purple-300 text-purple-800 text-sm px-2 py-1 rounded">${escapeHTML(disability.name)}</span>`
            ).join(' ')}
            </div>


                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon">
                                <path d="m9 18 6-6-6-6"/>
                            </svg>
                        </div>
                        <div class="issue-details hidden">

                        <div class="border-t pt-3">
                        <div class="flex">
                                <h2 class="font-medium mb-2 flex-1">How to fix:</h2>
                                <a href="${issue.helpUrl}" target="_blank" class="font-medium mb-2 text-blue-600 hover:text-blue-800">Learn more</a>
                        </div>
                            <div class="help-section">
                                        <p>${escapeHTML(issue.help)}</p>
                                </div>
                            </div>



                            <!-- Screenshot Section -->
                            ${screenshot ? `
<div class="border-t pt-3">
    <h2 class="font-medium mb-2">Page Screenshot:</h2>
    <div class="node-item">
        ${fs.existsSync(`${BASE_DIR}${PAGES_DIR}/${screenshot?.replace(".png", `_${i + 1}.png`)}`) ?
                `<img src=".${PAGES_DIR}/${screenshot.replace(".png", `_${i + 1}.png`)}" alt="${screenshot.replace(".png", `_${i + 1}.png`)} screenshot" class="w-full h-auto rounded" />` :
                '<p class="text-gray-500">No screenshot available</p>'
            }
    </div>
</div>
` : ''}
                           

                            <!-- Nodes Section - Compact Version -->
                            <div class="border-t pt-3">
                                <h2 class="font-medium mb-2">Affected Elements (${issue.nodes.length}):</h2>
                                <div class="nodes-list">
                                     <div class="nodes-list">
                                         ${issue.nodes.map((node, index) => `   
                                                 <div class="node-item">
                                                         <div class="node-html">
                                                            <span class="element-number bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-sm mr-2">#${index + 1}</span>
                                                            <code>${escapeHTML(node.target[0])}</code>
                                                            <button class="copy-button" aria-label="Copy to clipboard" onclick="copyToClipboard('${escapeHTML(node.target[0])}')">
    <svg xmlns="http://www.w3.org/2000/svg"
     width="18" height="18"
     viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor"
     stroke-width="2"
     stroke-linecap="round"
     stroke-linejoin="round"
     aria-hidden="true"
     focusable="false">
  <rect x="8" y="8" width="12" height="12" rx="2" ry="2"></rect>
  <rect x="4" y="4" width="12" height="12" rx="2" ry="2"></rect>
</svg>
</button>
                                                            <div style="margin: 5px 50px; font-size: 12px">${escapeHTML(node.html)}</div>
                                                        </div>
                                                         <button class="toggle-details">
                                                            <i class="fas fa-chevron-down"></i> Show failure details
                                                        </button>
                                                         <div class="node-details hidden">
                                                        <div class="failure-summary">
                                                           <h4>${node.any && node.any.length ? "Fix any of the following:" : (node.all && node.all.length ? "Fix ALL of the following:" : "Fix the following:")}</h4>
                                                            <ul class="failure-list">
                                                                ${node.any && node.any.length
                ? node.any.map(item => `<li>${escapeHTML(item.message)}</li>`).join('')
                : node.all && node.all.length
                    ? node.all.map(item => `<li>${escapeHTML(item.message)}</li>`).join('')
                    : '<li>No specific failure details available</li>'}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                 </div>

                                         `).join('')}
                                    </div>
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>  
`
        }
    }
    return issueCards;
}

function combineIssueCards(issues) {
    return `
       ${generateTabContent('violations', issues[0])}
       ${generateTabContent('incomplete', issues[1])}
       ${generateTabContent('passes', issues[2])}
    `;
}

function readAllJsonAndPutIntoArray() {
    const reports = [];
    const filePath = path.join(process.cwd(), BASE_DIR, PAGES_DIR);
    const files = fs.readdirSync(filePath);
    files.forEach(file => {
        if (file.endsWith('.json')) {
            const report = JSON.parse(fs.readFileSync(path.join(filePath, file), 'utf8'));
            reports.push(report);
        }
    });
    return reports;
}

function generateSummaryCart(reports) {
    const violationsTotalCount = reports.reduce((sum, report) => {
        return sum + (report.violations ? report.violations.length : 0);
    }, 0);
    const incompleteTotalCount = reports.reduce((sum, report) => {
        return sum + (report.incomplete ? report.incomplete.length : 0);
    }, 0);
    const passesTotalCount = reports.reduce((sum, report) => {
        return sum + (report.passes ? report.passes.length : 0);
    }, 0);
    const totalReports = violationsTotalCount + incompleteTotalCount + passesTotalCount;

    return `
    <div class="icon-cards">
             <div class="icon-card">
    <div class="card-icon icon-total">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18V6"></path><path d="m5 12 7-7 7 7"></path></svg>
    </div>
    <div class="icon-content">
      <h3 class="icon-title">Total Reports</h3>
      <p class="icon-value">${totalReports}</p>
    </div>
  </div>
           <div class="icon-card">
    <div class="card-icon icon-violations">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    </div>
    <div class="icon-content">
      <h3 class="icon-title">Violations</h3>
      <p class="icon-value" style="color: #e74c3c;">${violationsTotalCount}</p>
    </div>
  </div>
            <div class="icon-card">
    <div class="card-icon icon-incomplete">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
    </div>
    <div class="icon-content">
      <h3 class="icon-title">Incomplete</h3>
      <p class="icon-value" style="color: #f39c12;">${incompleteTotalCount}</p>
    </div>
  </div>
            <div class="icon-card">
    <div class="card-icon icon-passes">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    </div>
    <div class="icon-content">
      <h3 class="icon-title">Passes</h3>
      <p class="icon-value" style="color: #219653;">${passesTotalCount}</p>
    </div>
  </div>
        </div>
    `
}

function generateTableCards(reports) {
    let tableRows = '';
    reports.forEach(report => {
        const standard = report.standard || 'N/A';
        const violations = report.violations ? report.violations.length : 0;
        const incomplete = report.incomplete ? report.incomplete.length : 0;
        const passes = report.passes ? report.passes.length : 0;
        const inapplicable = report.inapplicable ? report.inapplicable.length : 0;
        const lastTested = report.timestamp || 'N/A';

        tableRows += `
            <tr onclick="showReport('${report.id}')">
                <td class="url-cell"><a href="#">${report.pagePath !== undefined ? report.pagePath : report.id }</a></td>
                <!--<td>${standard}</td>-->
                <td class="status-cell violations">${violations}</td>
                <td class="status-cell incomplete">${incomplete}</td>
                <td class="status-cell passes">${passes}</td>
                <td class="status-cell inapplicable">${inapplicable}</td>
                <td>${lastTested}</td>
            </tr>
        `;
    });

    return `
     <table>
            <thead>
            <tr>
                <th>Page</th>
                <!--<th>Standard</th>-->
                <th>Violations</th>
                <th>Incomplete</th>
                <th>Passes</th>
                  <th>Inapplicable 
                  <span class="inapplicable-tooltip-wrapper">
                    <span style="border-bottom:1px dotted #000; cursor:pointer;">&#9432;</span>
                    <span class="tooltip-text">There was nothing on the page that this rule would even apply to.</span>
                  </span>
                </th>
                 <th>Last Tested</th>
            </thead>
            <tbody id="table-body">
                ${tableRows}
            </tbody>
        </table>
        <div id="pagination-controls"></div>
    `
}

function generateImpactDistribution(reports) {
    const countImpacts = (reports, impact) => {
        return reports.reduce((count, report) => {
            ['violations', 'incomplete', 'passes'].forEach(section => {
                count += report[section]?.filter(v => v.impact === impact).length || 0;
            });
            return count;
        }, 0);
    };


    const totalCritical = countImpacts(reports, "critical");
    const totalSerious = countImpacts(reports, "serious");
    const totalModerate = countImpacts(reports, "moderate");
    const totalNone = countImpacts(reports, null);

    return `
                <div class="chart">
    <h3 class="chart-title">Impact Distribution</h3>
    <div class="chart-content" style="max-height: 300px; overflow-y: auto; display: flex; align-items: center; justify-content: center;">
        <canvas id="impactDistributionChart" style="max-width: 100%; height: auto;"></canvas>
    </div>
    <script>
        const ctx = document.getElementById('impactDistributionChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'Serious', 'Moderate', 'No Impact'],
                datasets: [{
                    data: [${totalCritical}, ${totalSerious}, ${totalModerate}, ${totalNone}], 
                    backgroundColor: ['#ed5959', '#f3826b', '#ffdd76', '#d3dde0'], 
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            boxWidth: 20,
                            padding: 15,
                             font: {
                                size: 14 // Increase this value to make the text larger
                            }  
                        }
                    }
                }
            }
        });
    </script>
</div>`;
}

function generateDisabilityAffected(reports, affected) {
    const disabilitiesArray = [];
    reports.forEach(report => {
        report.violations.forEach(violation => {
            const rule = affected.find(item => item.ruleId === violation.id);
            if (rule && rule['disabilityTypesAffected']) {
                rule['disabilityTypesAffected'].forEach(disability => {
                    disabilitiesArray.push(disability.name);
                });
            }
        });

        report.incomplete.forEach(incomplete => {
            const rule = affected.find(item => item.ruleId === incomplete.id);
            if (rule && rule['disabilityTypesAffected']) {
                rule['disabilityTypesAffected'].forEach(disability => {
                    disabilitiesArray.push(disability.name);
                });
            }
        });

        report.passes.forEach(passes => {
            const rule = affected.find(item => item.ruleId === passes.id);
            if (rule && rule['disabilityTypesAffected']) {
                rule['disabilityTypesAffected'].forEach(disability => {
                    disabilitiesArray.push(disability.name);
                });
            }
        });
    });
    const totalReportsWithAllIssues = reports.reduce((sum, report) => {
        return sum + (report.violations.length + report.incomplete.length + report.passes.length);
    }, 0);

    const disabilityCounts = disabilitiesArray.reduce((acc, disability) => {
        acc[disability] = (acc[disability] || 0) + 1;
        return acc;
    }, {});

    return `
     <div class="chart">
    <h3 class="chart-title">Disabilities Affected</h3>
     <div class="horizontal-bar-chart" tabindex="0" style="max-height: 280px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #666 #f1f1f1; padding-right: 8px;">
        ${Object.entries(disabilityCounts).map(([disability, count]) => {
        const percentage = ((count / totalReportsWithAllIssues) * 100).toFixed(1);
        return `
                <div class="bar-item mb-2">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-medium">${disability}</span>
                        <span class="text-sm text-gray-500">${percentage}% (${count})</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded h-4">
                        <div class="h-4 rounded" style="width: ${percentage}%; background-color: var(--${disability.toLowerCase().replaceAll(" ", "-")}-color);"></div>
                    </div>
                </div>
            `;
    }).join('')}
    </div>
</div>
    `
}

// Main function to generate the report
function generateReport() {
    const reports = readAllJsonAndPutIntoArray();
    const affected = readJSONFile(__dirname + "/disabilityAffectedData/" + getAxeVersion(reports[0].testEngine.version) + ".json");

    reports.forEach(report => {
        let baseContent = generateBaseContent(report);
        let searchBar = generateSearchBar();
        let tabs = generateTabs(report);
        let violationsIssueCards = generateIssueCards(report.violations, affected, report.id + "_violations.png");
        let incompleteIssueCards = generateIssueCards(report.incomplete, affected, report.id + "_incomplete.png");
        let passedIssueCards = generateIssueCards(report.passes, affected);

        baseContent = baseContent.replace("{{FILTERS}}", generateFilters(report, affected));
        baseContent = baseContent.replace("{{SEARCH_BAR}}", searchBar);
        baseContent = baseContent.replace("{{TABS}}", tabs);
        baseContent = baseContent.replace("{{FILTERS}}", '');
        baseContent = baseContent.replace("{{ISSUE_CARDS}}", combineIssueCards([violationsIssueCards, incompleteIssueCards, passedIssueCards]));

        const id = report.id || normalizePath(report.url)
        fs.writeFileSync(path.join(BASE_DIR, PAGES_DIR, id + ".html"), baseContent, 'utf8');

        console.log(`✅ Report generated: ${report.id}  + ".html"`);
    });
}

function generateDashboard() {
    let template = fs.readFileSync(path.join(__dirname, './index.template.html'), 'utf8');
    const outputPath = path.join(process.cwd(), BASE_DIR, 'index.html');
    const reports = readAllJsonAndPutIntoArray();
    const affected = readJSONFile(__dirname + "/disabilityAffectedData/" + getAxeVersion(reports[0].testEngine.version) + ".json");

    const summaryCards = generateSummaryCart(reports);
    const tableCards = generateTableCards(reports);
    const impactDistributionChart = generateImpactDistribution(reports);
    const disabilityAffected = generateDisabilityAffected(reports, affected);

    template = template.replace('{{summary_cards}}', summaryCards);
    template = template.replace('{{impact_distribution_chart}}', impactDistributionChart);
    template = template.replace('{{disabilities_affected_chart}}', disabilityAffected);
    template = template.replace('{{table_cards}}', tableCards);

    fs.writeFileSync(outputPath, template, 'utf8');

    console.log(`✅ Report generated: ${outputPath}`);
}

function deduplicate() {

    const reports = jsonFiles.map(file => {
        const filePath = path.join(BASE_DIR + PAGES_DIR, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        const fileId = path.basename(file, '.json');
        if (!data.id) {
            data.id = fileId;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        }
        return {
            uuid: fileId,
            data,
            timestamp: new Date(data.timestamp),
            raw
        };
    });


    const bestReports = new Map();
    const toDelete = [];

    for (const report of reports) {
        const url = report.data.path;
        const existing = bestReports.get(url);

        if (!report.data.newUrl) {
            console.log(`${report.data.id}⚠️ Skipping report for URL: ${url}`);
            continue;
        }

        if (
            !existing ||
            report.data.violations.length > existing.data.violations.length ||
            (report.data.violations.length === existing.data.violations.length &&
                report.data.incomplete.length > existing.data.incomplete.length) ||
            (report.data.violations.length === existing.data.violations.length &&
                report.data.incomplete.length === existing.data.incomplete.length &&
                report.timestamp > existing.timestamp)
        ) {
            if (existing) toDelete.push(existing.uuid); // delete the less preferred one
            bestReports.set(url, report); // keep the preferred one
        } else {
            toDelete.push(report.uuid); // delete the less preferred one
        }
    }

    for (const uuid of toDelete) {
        const filesToDelete = fs.readdirSync(BASE_DIR + PAGES_DIR).filter(file =>
            file.startsWith(uuid)
        );
        filesToDelete.forEach(file => {
            const filePath = path.join(BASE_DIR + PAGES_DIR, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Deleted: ${filePath}`);
            }
        });
    }
    console.log(`✅ Done! Kept ${bestReports.size} oldest reports, deleted ${toDelete.length} newer duplicates.`);
}

function normalizePath(url) {
    const urlObj = new URL(url, "http://dummy.base");

    const path = urlObj.pathname
        .split("/")
        .filter(Boolean)
        .map(segment => {
            if (/^\d+$/.test(segment)) return "id";
            if (/^[a-f0-9-]{36}$/i.test(segment)) return "uuid";
            if (/^[a-f0-9]{8,}$/i.test(segment)) return "hash";
            if (segment.endsWith(".html")) return segment.replace(".html", "");
            return segment;
        })
        .join("_");

    return path || "root";
}


function main() {
    deduplicate();
    generateReport();
    generateDashboard();

    const logoSrc = path.join(__dirname, './logo.png');
    const logoDest = path.join(process.cwd(), BASE_DIR, 'logo.png');
    if (fs.existsSync(logoSrc)) {
        fs.copyFileSync(logoSrc, logoDest);
        console.log(`✅ Copied logo.png to ${logoDest}`);
    }
    fs.copyFileSync(path.join(__dirname, './styles.css'), path.join(process.cwd(), BASE_DIR, './styles.css'));

}

module.exports = {main};

main();

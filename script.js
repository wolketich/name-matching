document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    const system1TextArea = document.getElementById('system1');
    const system2TextArea = document.getElementById('system2');
    const matchBtn = document.getElementById('match-btn');
    const resultsContainer = document.getElementById('results-container');
    const resultsBody = document.getElementById('results-body');
    const system1Count = document.getElementById('system1-count');
    const system2Count = document.getElementById('system2-count');
    const exactCount = document.getElementById('exact-count');
    const manualCount = document.getElementById('manual-count');
    const progressRate = document.getElementById('progress-rate');
    const exportBtn = document.getElementById('export-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Option elements
    const ignoreCaseCheckbox = document.getElementById('ignore-case');
    const trimWhitespaceCheckbox = document.getElementById('trim-whitespace');
    
    // Clear and sample buttons
    const clearSystem1Btn = document.getElementById('clear-system1');
    const clearSystem2Btn = document.getElementById('clear-system2');
    const sampleSystem1Btn = document.getElementById('sample-system1');
    const sampleSystem2Btn = document.getElementById('sample-system2');

    // Store the complete set of matches
    let matchResults = [];
    let system2NamesGlobal = [];

    // Update counts when text changes
    system1TextArea.addEventListener('input', updateCounts);
    system2TextArea.addEventListener('input', updateCounts);

    // Match button click handler
    matchBtn.addEventListener('click', findMatches);
    
    // Clear and sample button handlers
    clearSystem1Btn.addEventListener('click', () => {
        system1TextArea.value = '';
        updateCounts();
    });
    
    clearSystem2Btn.addEventListener('click', () => {
        system2TextArea.value = '';
        updateCounts();
    });
    
    sampleSystem1Btn.addEventListener('click', () => {
        system1TextArea.value = getSampleSystem1Data();
        updateCounts();
    });
    
    sampleSystem2Btn.addEventListener('click', () => {
        system2TextArea.value = getSampleSystem2Data();
        updateCounts();
    });
    
    // Export and copy handlers
    exportBtn.addEventListener('click', exportResults);
    copyBtn.addEventListener('click', copyResultsToClipboard);

    // Update the counts initially
    updateCounts();

    // Functions
    function updateCounts() {
        const system1Names = getNonEmptyLines(system1TextArea.value);
        const system2Names = getNonEmptyLines(system2TextArea.value);
        
        system1Count.textContent = system1Names.length;
        system2Count.textContent = system2Names.length;
    }

    function getNonEmptyLines(text) {
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    function findMatches() {
        const system1Names = getNonEmptyLines(system1TextArea.value);
        const system2Names = getNonEmptyLines(system2TextArea.value);
        system2NamesGlobal = [...system2Names]; // Store for later use
        
        if (system1Names.length === 0 || system2Names.length === 0) {
            alert('Please enter names in both text areas.');
            return;
        }

        const ignoreCase = ignoreCaseCheckbox.checked;
        const trimWhitespace = trimWhitespaceCheckbox.checked;

        matchResults = [];
        let exactMatchCount = 0;
        
        // Process each name from System 1
        for (const name1 of system1Names) {
            const processedName1 = processName(name1, trimWhitespace, ignoreCase);
            
            // Try to find an exact match first
            let exactMatch = null;
            let exactMatchOriginal = null;
            
            for (const name2 of system2Names) {
                const processedName2 = processName(name2, trimWhitespace, ignoreCase);
                if (processedName1 === processedName2) {
                    exactMatch = processedName2;
                    exactMatchOriginal = name2;
                    break;
                }
            }
            
            if (exactMatch) {
                // We have an exact match
                matchResults.push({
                    name1: name1,
                    name2: exactMatchOriginal,
                    isExactMatch: true,
                    options: [],
                    selectedOption: exactMatchOriginal
                });
                exactMatchCount++;
            } else {
                // No exact match, find up to 7 closest options
                const options = findClosestMatches(processedName1, system2Names, ignoreCase, trimWhitespace, 7);
                
                matchResults.push({
                    name1: name1,
                    name2: null,
                    isExactMatch: false,
                    options: options,
                    selectedOption: null
                });
            }
        }
        
        // Update statistics
        exactCount.textContent = exactMatchCount;
        manualCount.textContent = system1Names.length - exactMatchCount;
        updateProgressRate();
        
        // Display results
        displayResults();
        resultsContainer.style.display = 'block';
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function processName(name, trim, ignoreCase) {
        let result = name;
        if (trim) result = result.trim();
        if (ignoreCase) result = result.toLowerCase();
        return result;
    }

    function findClosestMatches(name, namesList, ignoreCase, trimWhitespace, maxResults) {
        const results = [];
        
        for (const candidate of namesList) {
            const processedCandidate = processName(candidate, trimWhitespace, ignoreCase);
            const similarity = calculateSimilarity(name, processedCandidate);
            
            results.push({
                name: candidate,
                similarity: similarity
            });
        }
        
        // Sort by similarity (highest first)
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Return the top matches
        return results.slice(0, maxResults);
    }

    function calculateSimilarity(s1, s2) {
        // Return a similarity score between 0-100
        // Using Levenshtein distance as a base
        if (s1 === s2) return 100;
        
        const distance = levenshteinDistance(s1, s2);
        const maxLength = Math.max(s1.length, s2.length);
        
        // Convert distance to similarity score
        return Math.max(0, Math.round(100 - (distance / maxLength * 100)));
    }

    function levenshteinDistance(s1, s2) {
        if (s1.length === 0) return s2.length;
        if (s2.length === 0) return s1.length;
        
        const matrix = Array(s1.length + 1).fill().map(() => Array(s2.length + 1).fill(0));
        
        for (let i = 0; i <= s1.length; i++) {
            matrix[i][0] = i;
        }
        
        for (let j = 0; j <= s2.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= s1.length; i++) {
            for (let j = 1; j <= s2.length; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }
        
        return matrix[s1.length][s2.length];
    }

    function displayResults() {
        resultsBody.innerHTML = '';
        
        matchResults.forEach((match, index) => {
            const row = document.createElement('tr');
            
            const name1Cell = document.createElement('td');
            name1Cell.textContent = match.name1;
            
            const name2Cell = document.createElement('td');
            if (match.isExactMatch) {
                name2Cell.textContent = match.name2;
                name2Cell.classList.add('exact-match');
            } else if (match.selectedOption) {
                name2Cell.textContent = match.selectedOption;
            } else {
                name2Cell.textContent = 'No match selected';
                name2Cell.style.fontStyle = 'italic';
                name2Cell.style.color = '#999';
            }
            
            const actionCell = document.createElement('td');
            if (match.isExactMatch) {
                const exactBadge = document.createElement('span');
                exactBadge.textContent = 'Exact Match';
                exactBadge.style.backgroundColor = '#40c05780';
                exactBadge.style.color = '#2b7a39';
                exactBadge.style.padding = '4px 8px';
                exactBadge.style.borderRadius = '4px';
                exactBadge.style.fontSize = '0.85rem';
                actionCell.appendChild(exactBadge);
            } else {
                // Create select dropdown for manual matching
                const selectGroup = document.createElement('div');
                selectGroup.className = 'select-group';
                
                const select = document.createElement('select');
                select.className = 'dropdown-select';
                select.id = `match-select-${index}`;
                
                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '-- Select a match --';
                defaultOption.selected = !match.selectedOption;
                select.appendChild(defaultOption);
                
                // Add all options from system 2
                match.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.name;
                    optionElement.textContent = `${option.name} (${option.similarity}%)`;
                    optionElement.selected = match.selectedOption === option.name;
                    select.appendChild(optionElement);
                });
                
                // Add all other options from system 2
                const otherOptGroup = document.createElement('optgroup');
                otherOptGroup.label = 'Other options';
                
                system2NamesGlobal.forEach(name => {
                    // Check if this name is not already in the top matches
                    if (!match.options.some(option => option.name === name)) {
                        const optionElement = document.createElement('option');
                        optionElement.value = name;
                        optionElement.textContent = name;
                        optionElement.selected = match.selectedOption === name;
                        otherOptGroup.appendChild(optionElement);
                    }
                });
                
                if (otherOptGroup.children.length > 0) {
                    select.appendChild(otherOptGroup);
                }
                
                // Add event listener
                select.addEventListener('change', (e) => {
                    match.selectedOption = e.target.value || null;
                    name2Cell.textContent = match.selectedOption || 'No match selected';
                    if (match.selectedOption) {
                        name2Cell.style.fontStyle = 'normal';
                        name2Cell.style.color = 'inherit';
                    } else {
                        name2Cell.style.fontStyle = 'italic';
                        name2Cell.style.color = '#999';
                    }
                    updateProgressRate();
                });
                
                selectGroup.appendChild(select);
                actionCell.appendChild(selectGroup);
                
                if (match.options.length > 0) {
                    const similarityInfo = document.createElement('div');
                    similarityInfo.style.fontSize = '0.8rem';
                    similarityInfo.style.color = '#666';
                    similarityInfo.style.marginTop = '4px';
                    similarityInfo.textContent = `Best match: ${match.options[0].similarity}% similar`;
                    actionCell.appendChild(similarityInfo);
                }
            }
            
            row.appendChild(name1Cell);
            row.appendChild(name2Cell);
            row.appendChild(actionCell);
            
            resultsBody.appendChild(row);
        });
    }

    function updateProgressRate() {
        const totalMatches = matchResults.length;
        const completedMatches = matchResults.filter(match => 
            match.isExactMatch || match.selectedOption
        ).length;
        
        const rate = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
        progressRate.textContent = `${rate}%`;
    }

    function exportResults() {
        const rows = [];
        // Add header row
        rows.push(['System 1 Name', 'System 2 Match', 'Match Type']);
        
        // Add data rows
        matchResults.forEach(match => {
            const matchType = match.isExactMatch ? 'Exact' : 'Manual';
            const matchedName = match.isExactMatch ? match.name2 : (match.selectedOption || '');
            
            rows.push([
                match.name1,
                matchedName,
                matchType
            ]);
        });
        
        // Convert to CSV
        const csvContent = rows.map(row => 
            row.map(cell => 
                typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
            ).join(',')
        ).join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'name_matches.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function copyResultsToClipboard() {
        const rows = [];
        // Add header row
        rows.push(['System 1 Name', 'System 2 Match', 'Match Type']);
        
        // Add data rows
        matchResults.forEach(match => {
            const matchType = match.isExactMatch ? 'Exact' : 'Manual';
            const matchedName = match.isExactMatch ? match.name2 : (match.selectedOption || '');
            
            rows.push([
                match.name1,
                matchedName,
                matchType
            ]);
        });
        
        // Format as tabular text
        const tabbedContent = rows.map(row => row.join('\t')).join('\n');
        
        // Copy to clipboard
        navigator.clipboard.writeText(tabbedContent)
            .then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                alert('Failed to copy to clipboard');
            });
    }

    function getSampleSystem1Data() {
        return `John Smith
Robert Johnson
Mary Williams
Jennifer Brown
Michael Miller
Patricia Davis
James Rodriguez
Linda Martinez
William Anderson
Elizabeth Thomas
David Wilson
Barbara Thompson
Richard Garcia
Susan Martinez
Joseph Robinson
Jessica Clark
Thomas Rodriguez
Sarah Lewis
Charles Walker
Karen Hall`;
    }

    function getSampleSystem2Data() {
        return `John Smith
Rob Johnson
Mary J. Williams
Jenifer Brown
Mike Miller
Patricia Davis-Wilson
James Rodriguez
Linda Martinez-Garcia
Will Anderson
Elisabeth Thomas
David Wilson
B. Thompson
Rich Garcia
Susan Martinez
Joe Robinson
Jessica Clarke
Tom Rodriguez
Sarah Lewis
Chuck Walker
Karen Hall`;
    }
});
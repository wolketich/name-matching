document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    const system1TextArea = document.getElementById('system1');
    const system2TextArea = document.getElementById('system2');
    const matchBtn = document.getElementById('match-btn');
    const resultsContainer = document.getElementById('results-container');
    const resultsBody = document.getElementById('results-body');
    const system1Count = document.getElementById('system1-count');
    const system2Count = document.getElementById('system2-count');
    const matchedCount = document.getElementById('matched-count');
    const unmatchedCount = document.getElementById('unmatched-count');
    const matchRate = document.getElementById('match-rate');
    const exportBtn = document.getElementById('export-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Option elements
    const ignoreCaseCheckbox = document.getElementById('ignore-case');
    const trimWhitespaceCheckbox = document.getElementById('trim-whitespace');
    const fuzzyMatchingCheckbox = document.getElementById('fuzzy-matching');
    const algorithmSelect = document.getElementById('algorithm');
    
    // Clear and sample buttons
    const clearSystem1Btn = document.getElementById('clear-system1');
    const clearSystem2Btn = document.getElementById('clear-system2');
    const sampleSystem1Btn = document.getElementById('sample-system1');
    const sampleSystem2Btn = document.getElementById('sample-system2');

    // Update counts when text changes
    system1TextArea.addEventListener('input', updateCounts);
    system2TextArea.addEventListener('input', updateCounts);

    // Match button click handler
    matchBtn.addEventListener('click', performMatching);
    
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

    function performMatching() {
        const system1Names = getNonEmptyLines(system1TextArea.value);
        const system2Names = getNonEmptyLines(system2TextArea.value);
        
        if (system1Names.length === 0 || system2Names.length === 0) {
            alert('Please enter names in both text areas.');
            return;
        }

        const ignoreCase = ignoreCaseCheckbox.checked;
        const trimWhitespace = trimWhitespaceCheckbox.checked;
        const useFuzzyMatching = fuzzyMatchingCheckbox.checked;
        const algorithm = algorithmSelect.value;

        const matches = [];
        let matchedNamesCount = 0;

        // Process each name from System 1
        for (const name1 of system1Names) {
            const processedName1 = processName(name1, trimWhitespace, ignoreCase);
            let bestMatch = null;
            let bestScore = -1;
            let confidenceLevel = '';
            
            // Find the best match in System 2
            for (const name2 of system2Names) {
                const processedName2 = processName(name2, trimWhitespace, ignoreCase);
                let score = 0;
                
                // Calculate match score based on selected algorithm
                if (algorithm === 'exact' || !useFuzzyMatching) {
                    score = processedName1 === processedName2 ? 100 : 0;
                } else if (algorithm === 'levenshtein') {
                    score = 100 - Math.min(100, Math.round(levenshteinDistance(processedName1, processedName2) / Math.max(processedName1.length, processedName2.length) * 100));
                } else if (algorithm === 'soundex') {
                    score = soundex(processedName1) === soundex(processedName2) ? 90 : 0;
                }
                
                // Keep the best match
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = name2;
                }
            }
            
            // Determine confidence level
            if (bestScore >= 90) {
                confidenceLevel = 'High';
                matchedNamesCount++;
            } else if (bestScore >= 70) {
                confidenceLevel = 'Medium';
                matchedNamesCount++;
            } else if (bestScore >= 40) {
                confidenceLevel = 'Low';
                matchedNamesCount++;
            } else {
                confidenceLevel = 'None';
                bestMatch = 'No match found';
            }
            
            matches.push({
                name1,
                name2: bestMatch,
                confidenceLevel,
                score: bestScore
            });
        }
        
        // Update statistics
        matchedCount.textContent = matchedNamesCount;
        unmatchedCount.textContent = system1Names.length - matchedNamesCount;
        matchRate.textContent = system1Names.length > 0 
            ? `${Math.round((matchedNamesCount / system1Names.length) * 100)}%` 
            : '0%';
        
        // Display results
        displayResults(matches);
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

    function displayResults(matches) {
        resultsBody.innerHTML = '';
        
        matches.forEach(match => {
            const row = document.createElement('tr');
            
            const name1Cell = document.createElement('td');
            name1Cell.textContent = match.name1;
            
            const name2Cell = document.createElement('td');
            name2Cell.textContent = match.name2;
            if (match.confidenceLevel === 'None') {
                name2Cell.classList.add('no-match');
            }
            
            const confidenceCell = document.createElement('td');
            if (match.confidenceLevel !== 'None') {
                confidenceCell.textContent = `${match.confidenceLevel} (${match.score}%)`;
                confidenceCell.classList.add(`match-confidence-${match.confidenceLevel.toLowerCase()}`);
            } else {
                confidenceCell.textContent = 'No match';
                confidenceCell.classList.add('no-match');
            }
            
            row.appendChild(name1Cell);
            row.appendChild(name2Cell);
            row.appendChild(confidenceCell);
            
            resultsBody.appendChild(row);
        });
    }

    function exportResults() {
        const rows = [];
        // Add header row
        rows.push(['System 1 Name', 'System 2 Match', 'Confidence']);
        
        // Add data rows
        const tableRows = document.querySelectorAll('#results-body tr');
        tableRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            rows.push([
                cells[0].textContent,
                cells[1].textContent,
                cells[2].textContent
            ]);
        });
        
        // Convert to CSV
        const csvContent = rows.map(row => row.join(',')).join('\n');
        
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
        rows.push(['System 1 Name', 'System 2 Match', 'Confidence']);
        
        // Add data rows
        const tableRows = document.querySelectorAll('#results-body tr');
        tableRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            rows.push([
                cells[0].textContent,
                cells[1].textContent,
                cells[2].textContent
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

    // Utility functions for matching algorithms
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

    function soundex(s) {
        const a = s.toLowerCase().split('');
        const firstLetter = a[0];
        
        // Convert letters to digits
        const codes = {
            b: 1, f: 1, p: 1, v: 1,
            c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
            d: 3, t: 3,
            l: 4,
            m: 5, n: 5,
            r: 6
        };
        
        // Replace consonants with digits
        const digits = a.map(letter => codes[letter] || letter);
        
        // Replace adjacent same digits with one digit
        let i = 1;
        while (i < digits.length) {
            if (digits[i] === digits[i-1]) {
                digits.splice(i, 1);
            } else {
                i++;
            }
        }
        
        // Remove vowels and h, w, y
        const result = digits.filter(char => typeof char === 'number');
        
        // Ensure we have the first letter followed by 3 digits
        return (firstLetter + result.slice(0, 3).join('')).padEnd(4, '0');
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
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
    const lockedCount = document.getElementById('locked-count');
    const progressRate = document.getElementById('progress-rate');
    const exportBtn = document.getElementById('export-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Option elements
    const ignoreCaseCheckbox = document.getElementById('ignore-case');
    const trimWhitespaceCheckbox = document.getElementById('trim-whitespace');
    const irishNamesCheckbox = document.getElementById('irish-names');
    
    // Clear and sample buttons
    const clearSystem1Btn = document.getElementById('clear-system1');
    const clearSystem2Btn = document.getElementById('clear-system2');
    const sampleSystem1Btn = document.getElementById('sample-system1');
    const sampleSystem2Btn = document.getElementById('sample-system2');

    // Store the complete set of matches and keep track of used names
    let matchResults = [];
    let system2NamesGlobal = [];
    let usedSystem2Names = new Set();

    // Special constant for "No Match Found"
    const NO_MATCH_FOUND = "NO_MATCH_FOUND"; // Special identifier

    // Initialize tooltips
    document.querySelectorAll('[title]').forEach(el => {
        el.addEventListener('mouseover', e => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = e.target.getAttribute('title');
            tooltip.style.position = 'absolute';
            tooltip.style.backgroundColor = '#333';
            tooltip.style.color = '#fff';
            tooltip.style.padding = '5px 10px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '0.8rem';
            tooltip.style.zIndex = '1000';
            tooltip.style.maxWidth = '250px';
            
            document.body.appendChild(tooltip);
            
            const rect = e.target.getBoundingClientRect();
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
            tooltip.style.left = `${rect.left + window.scrollX}px`;
            
            e.target.addEventListener('mouseout', () => {
                document.body.removeChild(tooltip);
            }, { once: true });
        });
    });

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
        const handleIrishNames = irishNamesCheckbox.checked;

        matchResults = [];
        usedSystem2Names = new Set(); // Reset used names
        let exactMatchCount = 0;
        
        // Find exact matches first (these are auto-locked)
        const exactMatchMap = new Map();
        
        // Process all names according to selected options
        const processedSystem1Names = system1Names.map(name => 
            processName(name, trimWhitespace, ignoreCase, handleIrishNames));
        
        const processedSystem2Names = system2Names.map(name => 
            processName(name, trimWhitespace, ignoreCase, handleIrishNames));
        
        // First pass: find and mark exact matches
        processedSystem1Names.forEach((processedName, index) => {
            const originalName = system1Names[index];
            
            const exactMatchIndex = processedSystem2Names.findIndex(name => 
                name === processedName);
                
            if (exactMatchIndex !== -1) {
                const matchedName = system2Names[exactMatchIndex];
                exactMatchMap.set(originalName, matchedName);
                usedSystem2Names.add(matchedName);
                exactMatchCount++;
            }
        });
        
        // Second pass: create match objects for all names
        for (const name1 of system1Names) {
            if (exactMatchMap.has(name1)) {
                // This is an exact match
                const name2 = exactMatchMap.get(name1);
                matchResults.push({
                    name1: name1,
                    name2: name2,
                    isExactMatch: true,
                    options: [],
                    selectedOption: name2,
                    locked: true
                });
            } else {
                // No exact match, find options (excluding already matched names)
                const availableSystem2Names = system2Names.filter(name => 
                    !usedSystem2Names.has(name));
                
                const processedName1 = processName(name1, trimWhitespace, ignoreCase, handleIrishNames);
                const options = findClosestMatches(
                    processedName1, 
                    availableSystem2Names, 
                    ignoreCase, 
                    trimWhitespace,
                    handleIrishNames,
                    7
                );
                
                matchResults.push({
                    name1: name1,
                    name2: null,
                    isExactMatch: false,
                    options: options,
                    selectedOption: null,
                    locked: false
                });
            }
        }
        
        // Update statistics
        updateStatistics();
        
        // Display results
        displayResults();
        resultsContainer.style.display = 'block';
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function processName(name, trim, ignoreCase, handleIrishNames) {
        let result = name;
        if (trim) result = result.trim();
        if (ignoreCase) result = result.toLowerCase();
        
        // Apply Irish name normalization if enabled
        if (handleIrishNames) {
            result = normalizeIrishName(result);
        }
        
        return result;
    }
    
    function normalizeIrishName(name) {
        // Handle Irish name variations when comparing
        let normalizedName = name;
        
        // Remove accents/fada
        normalizedName = normalizedName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Standardize O' prefix variations
        normalizedName = normalizedName.replace(/^o['']?\s*/i, 'o');
        
        // Standardize Mac/Mc prefix variations
        normalizedName = normalizedName.replace(/^mac\s*/i, 'mac');
        normalizedName = normalizedName.replace(/^mc\s*/i, 'mac');
        
        // Standardize spaces, hyphens in names
        normalizedName = normalizedName.replace(/[-\s]+/g, ' ');
        
        // Remove apostrophes in names like D'Arcy
        normalizedName = normalizedName.replace(/[''](?=\w)/g, '');
        
        return normalizedName;
    }

    function findClosestMatches(name, namesList, ignoreCase, trimWhitespace, handleIrishNames, maxResults) {
        const results = [];
        
        for (const candidate of namesList) {
            const processedCandidate = processName(candidate, trimWhitespace, ignoreCase, handleIrishNames);
            const similarity = calculateSimilarity(name, processedCandidate);
            
            // Check for Irish name specific similarities
            let additionalScore = 0;
            if (handleIrishNames) {
                // Check for common Irish name variations
                additionalScore = calculateIrishNameSimilarity(name, processedCandidate);
            }
            
            results.push({
                name: candidate,
                similarity: Math.min(100, similarity + additionalScore) // Cap at 100%
            });
        }
        
        // Sort by similarity (highest first)
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Return the top matches
        return results.slice(0, maxResults);
    }
    
    function calculateIrishNameSimilarity(name1, name2) {
        // This function adds bonus points for Irish name variations
        let bonus = 0;
        
        // Lower case for comparison
        const n1 = name1.toLowerCase();
        const n2 = name2.toLowerCase();
        
        // Check for O' prefix variations
        if ((n1.startsWith('o') && n2.startsWith('o')) ||
            (n1.startsWith('o\'') && n2.startsWith('o')) ||
            (n1.startsWith('o') && n2.startsWith('o\''))) {
            bonus += 15;
        }
        
        // Check for Mac/Mc variations
        if ((n1.startsWith('mac') && n2.startsWith('mc')) ||
            (n1.startsWith('mc') && n2.startsWith('mac'))) {
            bonus += 15;
        }
        
        // Check for names that differ by just an accent mark
        // For this we would need to compare the original name, not the normalized one
        // But we can check if they match after accent removal
        if (name1.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 
            name2.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) {
            bonus += 20;
        }
        
        // Hyphen vs space
        if (n1.replace('-', ' ') === n2 || n2.replace('-', ' ') === n1) {
            bonus += 20;
        }
        
        return bonus;
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

    function updateStatistics() {
        const exactMatches = matchResults.filter(match => match.isExactMatch).length;
        const manualMatches = matchResults.filter(match => !match.isExactMatch).length;
        const lockedManualMatches = matchResults.filter(match => 
            !match.isExactMatch && match.locked).length;
        
        exactCount.textContent = exactMatches;
        manualCount.textContent = manualMatches;
        lockedCount.textContent = exactMatches + lockedManualMatches;
        
        updateProgressRate();
    }

    function updateProgressRate() {
        const totalMatches = matchResults.length;
        const completedMatches = matchResults.filter(match => 
            match.isExactMatch || match.locked
        ).length;
        
        const rate = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
        progressRate.textContent = `${rate}%`;
    }

    function getStatusBadge(match) {
        const span = document.createElement('span');
        span.className = 'status-badge';
        
        if (match.isExactMatch) {
            span.textContent = 'Exact Match';
            span.classList.add('exact');
        } else if (match.locked) {
            if (match.selectedOption === NO_MATCH_FOUND) {
                span.textContent = 'No Match';
                span.classList.add('no-match');
            } else {
                span.textContent = 'Locked';
                span.classList.add('locked');
            }
        } else if (match.selectedOption) {
            if (match.selectedOption === NO_MATCH_FOUND) {
                span.textContent = 'No Match (Pending)';
                span.classList.add('no-match');
            } else {
                span.textContent = 'Selected (Pending)';
                span.classList.add('pending');
            }
        } else {
            span.textContent = 'Unmatched';
            span.classList.add('unmatched');
        }
        
        return span;
    }

    function displayResults() {
        resultsBody.innerHTML = '';
        
        matchResults.forEach((match, index) => {
            const row = document.createElement('tr');
            
            // System 1 Name
            const name1Cell = document.createElement('td');
            name1Cell.textContent = match.name1;
            row.appendChild(name1Cell);
            
            // System 2 Match
            const name2Cell = document.createElement('td');
            if (match.isExactMatch || match.selectedOption) {
                if (match.selectedOption === NO_MATCH_FOUND) {
                    // No match found option was selected
                    name2Cell.textContent = 'No Match Found';
                    name2Cell.classList.add('no-match-text');
                } else {
                    // Normal match
                    name2Cell.textContent = match.isExactMatch ? match.name2 : match.selectedOption;
                    if (match.isExactMatch) {
                        name2Cell.classList.add('exact-match');
                    } else if (match.locked) {
                        name2Cell.classList.add('locked-match');
                    }
                }
            } else {
                name2Cell.textContent = 'No match selected';
                name2Cell.style.fontStyle = 'italic';
                name2Cell.style.color = '#999';
            }
            row.appendChild(name2Cell);
            
            // Status
            const statusCell = document.createElement('td');
            statusCell.appendChild(getStatusBadge(match));
            row.appendChild(statusCell);
            
            // Action Cell
            const actionCell = document.createElement('td');
            
            if (match.isExactMatch) {
                // No action needed for exact matches - they're automatically locked
                actionCell.textContent = 'Automatic';
            } else {
                // Create action area for manual matching
                const actionArea = document.createElement('div');
                actionArea.className = 'manual-match-area';
                
                // Create select dropdown
                const selectGroup = document.createElement('div');
                selectGroup.className = 'select-group';
                
                const select = createSelectDropdown(match, index, name2Cell, statusCell);
                selectGroup.appendChild(select);
                actionArea.appendChild(selectGroup);
                
                // Create action buttons
                const actionButtons = document.createElement('div');
                actionButtons.className = 'action-buttons';
                
                // Lock button
                const lockBtn = document.createElement('button');
                lockBtn.className = 'btn btn-info btn-sm';
                lockBtn.innerHTML = '<i class="fas fa-lock"></i> Lock';
                lockBtn.disabled = !match.selectedOption || match.locked;
                lockBtn.addEventListener('click', () => {
                    lockMatch(match, index, select, lockBtn, cancelBtn, name2Cell, statusCell);
                });
                actionButtons.appendChild(lockBtn);
                
                // Cancel button
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn btn-danger btn-sm';
                cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
                cancelBtn.disabled = !match.selectedOption || !match.locked;
                cancelBtn.addEventListener('click', () => {
                    cancelMatch(match, index, select, lockBtn, cancelBtn, name2Cell, statusCell);
                });
                actionButtons.appendChild(cancelBtn);
                
                actionArea.appendChild(actionButtons);
                actionCell.appendChild(actionArea);
                
                // Add similarity info if there are options and not locked
                if (match.options.length > 0 && !match.locked && match.selectedOption !== NO_MATCH_FOUND) {
                    const similarityInfo = document.createElement('div');
                    similarityInfo.style.fontSize = '0.8rem';
                    similarityInfo.style.color = '#666';
                    similarityInfo.style.marginTop = '4px';
                    similarityInfo.textContent = `Best match: ${match.options[0].similarity}% similar`;
                    actionCell.appendChild(similarityInfo);
                }
            }
            
            row.appendChild(actionCell);
            resultsBody.appendChild(row);
        });
    }

    function createSelectDropdown(match, index, name2Cell, statusCell) {
        const select = document.createElement('select');
        select.className = 'dropdown-select';
        select.id = `match-select-${index}`;
        select.disabled = match.locked;
        
        // Clear the select and add default option
        select.innerHTML = '';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select a match --';
        defaultOption.selected = !match.selectedOption;
        select.appendChild(defaultOption);
        
        // Add "No Match Found" option
        const noMatchOption = document.createElement('option');
        noMatchOption.value = NO_MATCH_FOUND;
        noMatchOption.textContent = 'No Match Found';
        noMatchOption.className = 'no-match-option';
        noMatchOption.selected = match.selectedOption === NO_MATCH_FOUND;
        noMatchOption.style.color = 'var(--danger-color)';
        noMatchOption.style.fontWeight = 'bold';
        select.appendChild(noMatchOption);
        
        // Add top matches
        const availableOptions = match.options.filter(option => 
            !usedSystem2Names.has(option.name) || option.name === match.selectedOption
        );
        
        if (availableOptions.length > 0) {
            const matchesOptGroup = document.createElement('optgroup');
            matchesOptGroup.label = 'Best Matches';
            
            availableOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.name;
                optionElement.textContent = `${option.name} (${option.similarity}%)`;
                optionElement.selected = match.selectedOption === option.name;
                matchesOptGroup.appendChild(optionElement);
            });
            
            select.appendChild(matchesOptGroup);
        }
        
        // Add other available options
        const otherAvailableNames = system2NamesGlobal.filter(name => 
            !usedSystem2Names.has(name) || name === match.selectedOption
        );
        
        // Filter out names already in the top matches
        const otherNames = otherAvailableNames.filter(name => 
            !match.options.some(option => option.name === name)
        );
        
        if (otherNames.length > 0) {
            const otherOptGroup = document.createElement('optgroup');
            otherOptGroup.label = 'Other options';
            
            otherNames.forEach(name => {
                const optionElement = document.createElement('option');
                optionElement.value = name;
                optionElement.textContent = name;
                optionElement.selected = match.selectedOption === name;
                otherOptGroup.appendChild(optionElement);
            });
            
            select.appendChild(otherOptGroup);
        }
        
        // Add event listener for select changes
        select.addEventListener('change', (e) => {
            const newValue = e.target.value;
            const oldValue = match.selectedOption;
            
            // If there was a previous selection and it wasn't "No Match Found", make it available again
            if (oldValue && oldValue !== NO_MATCH_FOUND && match.locked) {
                usedSystem2Names.delete(oldValue);
            }
            
            // Update match data
            match.selectedOption = newValue || null;
            
            // Update UI
            if (match.selectedOption) {
                if (match.selectedOption === NO_MATCH_FOUND) {
                    // No match found option was selected
                    name2Cell.textContent = 'No Match Found';
                    name2Cell.className = 'no-match-text'; // Apply red style
                    name2Cell.style.fontStyle = 'normal';
                } else {
                    // Normal match
                    name2Cell.textContent = match.selectedOption;
                    name2Cell.className = ''; // Reset class
                    name2Cell.style.fontStyle = 'normal';
                    name2Cell.style.color = 'inherit';
                }
                
                // Enable lock button
                const lockBtn = select.closest('.manual-match-area')
                    .querySelector('.action-buttons .btn-info');
                if (lockBtn) lockBtn.disabled = false;
            } else {
                name2Cell.textContent = 'No match selected';
                name2Cell.className = ''; // Reset class
                name2Cell.style.fontStyle = 'italic';
                name2Cell.style.color = '#999';
                
                // Disable lock button
                const lockBtn = select.closest('.manual-match-area')
                    .querySelector('.action-buttons .btn-info');
                if (lockBtn) lockBtn.disabled = true;
            }
            
            // Update status badge
            statusCell.innerHTML = '';
            statusCell.appendChild(getStatusBadge(match));
            
            // Update statistics
            updateProgressRate();
            
            // Update all select dropdowns
            updateAllDropdowns();
        });
        
        return select;
    }

    function lockMatch(match, index, select, lockBtn, cancelBtn, name2Cell, statusCell) {
        // Update match data
        match.locked = true;
        
        // Add to used names (only if it's a real match, not "No Match Found")
        if (match.selectedOption && match.selectedOption !== NO_MATCH_FOUND) {
            usedSystem2Names.add(match.selectedOption);
        }
        
        // Update UI
        select.disabled = true;
        lockBtn.disabled = true;
        cancelBtn.disabled = false;
        
        // Update cell appearance
        if (match.selectedOption !== NO_MATCH_FOUND) {
            name2Cell.classList.add('locked-match');
        }
        
        // Update status
        statusCell.innerHTML = '';
        statusCell.appendChild(getStatusBadge(match));
        
        // Update statistics
        updateStatistics();
        
        // Update all dropdowns to reflect newly used name
        updateAllDropdowns();
    }

    function cancelMatch(match, index, select, lockBtn, cancelBtn, name2Cell, statusCell) {
        // Remove from used names (only if it's a real match, not "No Match Found")
        if (match.selectedOption && match.selectedOption !== NO_MATCH_FOUND) {
            usedSystem2Names.delete(match.selectedOption);
        }
        
        // Update match data
        match.locked = false;
        
        // Update UI
        select.disabled = false;
        lockBtn.disabled = !match.selectedOption;
        cancelBtn.disabled = true;
        
        // Update cell appearance - remove locked style
        name2Cell.classList.remove('locked-match');
        
        // Update status
        statusCell.innerHTML = '';
        statusCell.appendChild(getStatusBadge(match));
        
        // Update statistics
        updateStatistics();
        
        // Update all dropdowns to reflect newly available name
        updateAllDropdowns();
    }

    function updateAllDropdowns() {
        // Find all the manual match rows and update their dropdowns
        matchResults.forEach((match, index) => {
            if (!match.isExactMatch) {
                const select = document.getElementById(`match-select-${index}`);
                if (select) {
                    // Save current value
                    const currentValue = select.value;
                    
                    // Clear all options and recreate
                    select.innerHTML = '';
                    
                    // Add default option
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = '-- Select a match --';
                    defaultOption.selected = !currentValue;
                    select.appendChild(defaultOption);
                    
                    // Add "No Match Found" option
                    const noMatchOption = document.createElement('option');
                    noMatchOption.value = NO_MATCH_FOUND;
                    noMatchOption.textContent = 'No Match Found';
                    noMatchOption.className = 'no-match-option';
                    noMatchOption.selected = currentValue === NO_MATCH_FOUND;
                    noMatchOption.style.color = 'var(--danger-color)';
                    noMatchOption.style.fontWeight = 'bold';
                    select.appendChild(noMatchOption);
                    
                    // Create optgroups only once
                    const bestMatchesGroup = document.createElement('optgroup');
                    bestMatchesGroup.label = 'Best Matches';
                    
                    const otherOptionsGroup = document.createElement('optgroup');
                    otherOptionsGroup.label = 'Other options';
                    
                    // Add best matches
                    const availableOptions = match.options.filter(option => 
                        !usedSystem2Names.has(option.name) || option.name === match.selectedOption
                    );
                    
                    let bestMatchesAdded = false;
                    if (availableOptions.length > 0) {
                        availableOptions.forEach(option => {
                            const optionElement = document.createElement('option');
                            optionElement.value = option.name;
                            optionElement.textContent = `${option.name} (${option.similarity}%)`;
                            optionElement.selected = currentValue === option.name;
                            bestMatchesGroup.appendChild(optionElement);
                        });
                        bestMatchesAdded = true;
                    }
                    
                    // Add other available options
                    const otherAvailableNames = system2NamesGlobal.filter(name => 
                        !usedSystem2Names.has(name) || name === match.selectedOption
                    );
                    
                    // Filter out names already in the top matches
                    const otherNames = otherAvailableNames.filter(name => 
                        !match.options.some(option => option.name === name)
                    );
                    
                    let otherOptionsAdded = false;
                    if (otherNames.length > 0) {
                        otherNames.forEach(name => {
                            const optionElement = document.createElement('option');
                            optionElement.value = name;
                            optionElement.textContent = name;
                            optionElement.selected = currentValue === name;
                            otherOptionsGroup.appendChild(optionElement);
                        });
                        otherOptionsAdded = true;
                    }
                    
                    // Only add optgroups if they have children
                    if (bestMatchesAdded) {
                        select.appendChild(bestMatchesGroup);
                    }
                    
                    if (otherOptionsAdded) {
                        select.appendChild(otherOptionsGroup);
                    }
                    
                    // If current value is not in the list anymore, reset selection
                    const hasValidSelection = Array.from(select.options).some(option => 
                        option.value === currentValue && option.value !== ''
                    );
                    
                    if (!hasValidSelection && currentValue && currentValue !== NO_MATCH_FOUND) {
                        select.value = '';
                        
                        // Also update the match object
                        match.selectedOption = null;
                        
                        // Update the UI to show "No match selected"
                        const name2Cell = select.closest('tr').querySelector('td:nth-child(2)');
                        name2Cell.textContent = 'No match selected';
                        name2Cell.className = ''; // Reset class
                        name2Cell.style.fontStyle = 'italic';
                        name2Cell.style.color = '#999';
                        
                        // Update the status badge
                        const statusCell = select.closest('tr').querySelector('td:nth-child(3)');
                        statusCell.innerHTML = '';
                        statusCell.appendChild(getStatusBadge(match));
                        
                        // Disable the lock button
                        const lockBtn = select.closest('.manual-match-area')
                            .querySelector('.action-buttons .btn-info');
                        if (lockBtn) lockBtn.disabled = true;
                    }
                }
            }
        });
    }

    function exportResults() {
        const rows = [];
        // Add header row
        rows.push(['System 1 Name', 'System 2 Match', 'Match Type', 'Status']);
        
        // Add data rows
        matchResults.forEach(match => {
            let matchType = match.isExactMatch ? 'Exact' : 'Manual';
            let matchedName = match.isExactMatch ? match.name2 : (match.selectedOption || '');
            
            // Special handling for "No Match Found"
            if (match.selectedOption === NO_MATCH_FOUND) {
                matchedName = 'No Match Found';
                matchType = 'No Match';
            }
            
            const status = match.isExactMatch ? 'Locked (Exact)' : 
                           (match.locked ? (match.selectedOption === NO_MATCH_FOUND ? 'No Match (Locked)' : 'Locked (Manual)') : 
                           (match.selectedOption ? (match.selectedOption === NO_MATCH_FOUND ? 'No Match (Pending)' : 'Selected (Pending)') : 'Unmatched'));
            
            rows.push([
                match.name1,
                matchedName,
                matchType,
                status
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
        
        // Add timestamp to filename
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.setAttribute('download', `name_matches_${timestamp}.csv`);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function copyResultsToClipboard() {
        const rows = [];
        // Add header row
        rows.push(['System 1 Name', 'System 2 Match', 'Match Type', 'Status']);
        
        // Add data rows
        matchResults.forEach(match => {
            let matchType = match.isExactMatch ? 'Exact' : 'Manual';
            let matchedName = match.isExactMatch ? match.name2 : (match.selectedOption || '');
            
            // Special handling for "No Match Found"
            if (match.selectedOption === NO_MATCH_FOUND) {
                matchedName = 'No Match Found';
                matchType = 'No Match';
            }
            
            const status = match.isExactMatch ? 'Locked (Exact)' : 
                           (match.locked ? (match.selectedOption === NO_MATCH_FOUND ? 'No Match (Locked)' : 'Locked (Manual)') : 
                           (match.selectedOption ? (match.selectedOption === NO_MATCH_FOUND ? 'No Match (Pending)' : 'Selected (Pending)') : 'Unmatched'));
            
            rows.push([
                match.name1,
                matchedName,
                matchType,
                status
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
        return `Seán O'Connor
Niamh Ryan
Ciaran Murphy
Siobhan Walsh
Eoghan O'Sullivan
Aoife Kelly
Padraig MacCarthy
Orla Ó Dálaigh
Cormac McDonnell
Sorcha Fitzgerald
Oisín Hickey
Eve O Toole
Donnacha Toner
Cillian Redmond
Viktoria Tropina
Caoimhe Ní Dhomhnaill
Sadhbh McGuinness
Fionn O'Brien
Saorlaith Willow Sweeney
Isla Souto
Boden Nelson Williams`;
    }

    function getSampleSystem2Data() {
        return `Sean O Connor
Niamh Ryan
Kieran Murphy
Siobhan Walsh
Eoghan OSullivan
Aoife Kelly
Paddy MacCarthy
Orla O'Daly
Cormac MacDonnell
Sorcha Fitzgerald
Oisin Hickey
Eve O'Toole
Donnacha Tóner
Cillian Redmond
Viktoriia Tropina
Caoimhe Ni Dhomhnaill
Sadhbh MacGuinness
Fionn OBrien
Saorlaith W. Sweeney
Isla Souto
Elsie Nelson Williams
Boden Nelson Williams
Freddie McGreal
Beau Hayes Walsh
Finn Doyle
Caelan Jameson
Aderewa Lori Dairo`;
    }
});
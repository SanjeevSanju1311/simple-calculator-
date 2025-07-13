const display = document.getElementById('display');
        const themeToggle = document.getElementById('themeToggle');
        const historyButton = document.getElementById('historyButton');
        const historyPanel = document.getElementById('historyPanel');
        const historyCloseButton = document.getElementById('historyCloseButton');
        const historyClearButton = document.getElementById('historyClearButton');
        const historyList = document.getElementById('historyList');

        let currentDisplayValue = '0'; // What is currently shown on the display (and editable by user)
        let justCalculated = false; // Flag to indicate if the last action was an '=' operation
        let calculationHistory = [];

        // Load theme and history from localStorage on page load
        document.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-theme');
                themeToggle.querySelector('i').classList.remove('fa-moon');
                themeToggle.querySelector('i').classList.add('fa-sun');
            }
            const savedHistory = localStorage.getItem('calculationHistory');
            if (savedHistory) {
                calculationHistory = JSON.parse(savedHistory);
            }
            // Remove readonly attribute to allow direct editing
            display.removeAttribute('readonly');
            updateDisplay(); // Initialize display
            // Set cursor to the right of '0' on load
            display.selectionStart = display.selectionEnd = display.value.length;
            display.focus(); // Set focus to the display on load
        });

        // Function to insert text at the current cursor position
        function insertAtCursor(inputElement, textToInsert) {
            let start = inputElement.selectionStart;
            let end = inputElement.selectionEnd;
            let value = inputElement.value;

            inputElement.value = value.substring(0, start) + textToInsert + value.substring(end);
            inputElement.selectionStart = inputElement.selectionEnd = start + textToInsert.length;
            inputElement.focus();
        }

        // Function to delete text at the current cursor position
        function deleteAtCursor(inputElement) {
            let start = inputElement.selectionStart;
            let end = inputElement.selectionEnd;
            let value = inputElement.value;

            if (start === end) { // No selection, delete one character to the left
                if (start > 0) {
                    inputElement.value = value.substring(0, start - 1) + value.substring(end);
                    inputElement.selectionStart = inputElement.selectionEnd = start - 1;
                }
            } else { // Delete selected text
                inputElement.value = value.substring(0, start) + value.substring(end);
                inputElement.selectionStart = inputElement.selectionEnd = start;
            }
            inputElement.focus();
        }

        // Function to update the calculator display (primarily for initial load and after calculation)
        function updateDisplay() {
            display.value = currentDisplayValue;
            requestAnimationFrame(() => {
                display.scrollLeft = display.scrollWidth;
            });
            display.focus();
        }

        // Handle number and decimal button clicks
        document.querySelectorAll('.btn-number, .btn-decimal').forEach(button => {
            button.addEventListener('click', (e) => {
                const char = e.target.dataset.number;
                let shouldClearDisplayForNewInput = false;

                if (justCalculated) {
                    shouldClearDisplayForNewInput = true;
                    justCalculated = false;
                } else if (display.value === '0' && char !== '.') {
                    // If display is '0' and a non-decimal number is pressed, clear '0'
                    shouldClearDisplayForNewInput = true;
                }

                if (shouldClearDisplayForNewInput) {
                    display.value = '';
                    currentDisplayValue = '';
                }

                if (char === '.') {
                    // Prevent multiple decimals in the current number segment
                    const parts = display.value.split(/[\+\-\*\/]/);
                    const lastPart = parts[parts.length - 1].trim();
                    if (lastPart.includes('.')) {
                        return; // Do nothing if decimal already exists in current number
                    }
                }
                insertAtCursor(display, char);
                currentDisplayValue = display.value; // Sync internal state
                updateDisplay(); // Ensure focus and scroll
            });
        });

        // Handle operator button clicks
        document.querySelectorAll('.btn-operator').forEach(button => {
            button.addEventListener('click', (e) => {
                const op = e.target.dataset.operator;

                if (display.value === 'Error') {
                    display.value = '0';
                    currentDisplayValue = '0';
                }

                // Check if the last character before insertion point is an operator
                let currentCursorPos = display.selectionStart;
                let valueBeforeCursor = display.value.substring(0, currentCursorPos).trim();
                let lastCharBeforeCursor = valueBeforeCursor.slice(-1);

                if (['+', '-', '*', '/'].includes(lastCharBeforeCursor)) {
                    // Replace the last operator if consecutive operators are pressed
                    display.value = valueBeforeCursor.slice(0, -1) + op + display.value.substring(currentCursorPos);
                    display.selectionStart = display.selectionEnd = currentCursorPos; // Keep cursor at same logical position
                } else {
                    // Append new operator with spaces for display clarity
                    insertAtCursor(display, ' ' + op + ' ');
                }
                currentDisplayValue = display.value; // Sync internal state
                justCalculated = false; // Reset calculation flag
                updateDisplay(); // Ensure focus and scroll
            });
        });

        // Handle equals button click
        document.getElementById('equals').addEventListener('click', () => {
            calculate(); // Perform the calculation
            justCalculated = true; // Set calculation flag
            updateDisplay(); // Update display with the result
        });

        // Handle clear (AC) button click
        document.getElementById('clear').addEventListener('click', () => {
            currentDisplayValue = '0';
            display.value = '0'; // Reset display input directly
            justCalculated = false;
            updateDisplay();
        });

        // Handle delete (DEL) button click
        document.getElementById('delete').addEventListener('click', () => {
            if (justCalculated) { // If DEL is pressed immediately after '=', clear the calculator
                currentDisplayValue = '0';
                display.value = '0';
                justCalculated = false;
            } else {
                deleteAtCursor(display); // Use the new deleteAtCursor function
                currentDisplayValue = display.value; // Sync internal state
            }
            if (currentDisplayValue === '') currentDisplayValue = '0';
            updateDisplay();
        });

        // Sanitize and prepare expression for eval
        function sanitizeAndPrepareForEval(expression) {
            // Remove any characters that are not numbers, operators, or decimal points
            let cleaned = expression.replace(/[^0-9+\-*/.]/g, '');

            // Replace multiple consecutive operators with a single one (e.g., "++" -> "+", "+-" -> "-")
            cleaned = cleaned.replace(/([+\-*/])\s*([+\-*/])/g, '$2');

            // Handle multiple decimals in a number (keep only the first occurrence within a number)
            // This regex matches a number followed by a decimal, then any characters until another decimal,
            // and replaces the second decimal with nothing.
            cleaned = cleaned.replace(/(\d*\.?\d+)\.(\d*)/g, '$1$2');

            // Remove leading operators (except for a leading minus sign for negative numbers)
            if (cleaned.length > 0 && ['+', '*', '/'].includes(cleaned[0])) {
                cleaned = cleaned.substring(1);
            }
            // Remove trailing operators
            if (cleaned.length > 0 && ['+', '-', '*', '/'].includes(cleaned[cleaned.length - 1])) {
                cleaned = cleaned.substring(0, cleaned.length - 1);
            }

            return cleaned;
        }

        // Main calculation logic using eval for BODMAS
        function calculate() {
            // Sanitize the current display value for evaluation
            let expressionToEvaluate = sanitizeAndPrepareForEval(display.value);

            // If the expression is empty or just an operator after sanitization, don't evaluate
            if (expressionToEvaluate === '' || ['+', '-', '*', '/'].includes(expressionToEvaluate)) {
                currentDisplayValue = 'Error';
                addHistory(`${display.value} = Error`); // Use original display value for history
                return;
            }

            try {
                let result = eval(expressionToEvaluate);
                if (typeof result === 'number') {
                    // Limit decimal places to avoid floating point issues and ensure readability
                    result = parseFloat(result.toFixed(10));
                }
                currentDisplayValue = result.toString(); // Update display with result
                addHistory(`${display.value} = ${currentDisplayValue}`); // Add original expression and result to history
            } catch (error) {
                currentDisplayValue = 'Error'; // Display error message
                addHistory(`${display.value} = Error`); // Add error to history
            }
        }

        // Handle direct input into the display field (for keyboard typing)
        display.addEventListener('input', () => {
            currentDisplayValue = display.value; // Keep internal state synced with user's typing
            justCalculated = false; // Any direct input means we're not just showing a result anymore
            // No need to call updateDisplay here, as input event already updates display.value
            // and native input behavior handles cursor position.
        });

        // Keyboard input support
        document.addEventListener('keydown', (e) => {
            const key = e.key;
            const isNumber = key >= '0' && key <= '9';
            const isOperator = ['+', '-', '*', '/'].includes(key);
            const isDecimal = key === '.';
            const isControlKey = ['Backspace', 'Delete', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key);

            // Allow numbers, operators, decimal, and control keys
            if (isNumber || isDecimal || isOperator || isControlKey) {
                if (isNumber || isDecimal) {
                    let shouldClearDisplayForNewInput = false;
                    if (justCalculated) {
                        shouldClearDisplayForNewInput = true;
                        justCalculated = false;
                    } else if (display.value === '0' && isNumber) { // If '0' and a number is pressed, clear '0'
                        shouldClearDisplayForNewInput = true;
                    }

                    if (shouldClearDisplayForNewInput) {
                        display.value = '';
                        currentDisplayValue = '';
                    }
                    // For numbers and decimals, let the native input handling take over
                    // as we've already handled the '0' clearing.
                    return;
                } else if (isOperator) {
                    e.preventDefault(); // Prevent default browser behavior (e.g., '/' opening search)
                    if (display.value === 'Error') {
                        display.value = '0';
                        currentDisplayValue = '0';
                    }
                    // Manually insert operator with spaces for consistency
                    insertAtCursor(display, ' ' + key + ' ');
                    currentDisplayValue = display.value;
                    justCalculated = false;
                } else if (key === 'Enter') {
                    e.preventDefault(); // Prevent default Enter key behavior (e.g., form submission)
                    document.getElementById('equals').click();
                } else if (key === 'Backspace') {
                    e.preventDefault(); // Prevent default browser back behavior
                    deleteAtCursor(display);
                    currentDisplayValue = display.value;
                } else if (key === 'Delete') { // Handle 'Delete' key (forward delete)
                    e.preventDefault();
                    let start = display.selectionStart;
                    let end = display.selectionEnd;
                    let value = display.value;
                    if (start === end) { // No selection, delete one character to the right
                        if (start < value.length) {
                            display.value = value.substring(0, start) + value.substring(end + 1);
                            display.selectionStart = display.selectionEnd = start;
                        }
                    } else { // Delete selected text
                        display.value = value.substring(0, start) + value.substring(end);
                        display.selectionStart = display.selectionEnd = start;
                    }
                    currentDisplayValue = display.value;
                } else if (key === 'Escape') {
                    document.getElementById('clear').click();
                }
                // For arrow keys, Home, End, etc., native input behavior handles cursor movement, so no preventDefault
            } else {
                // Prevent default for any other key (characters, symbols not allowed)
                e.preventDefault();
            }
        });

        // Theme toggle functionality
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const icon = themeToggle.querySelector('i');
            if (document.body.classList.contains('dark-theme')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
                localStorage.setItem('theme', 'dark');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
                localStorage.setItem('theme', 'light');
            }
        });

        // History functionality
        function addHistory(calculation) {
            calculationHistory.unshift(calculation); // Add to the beginning
            if (calculationHistory.length > 10) { // Keep only the last 10 calculations
                calculationHistory.pop();
            }
            localStorage.setItem('calculationHistory', JSON.stringify(calculationHistory));
            renderHistory();
        }

        function renderHistory() {
            historyList.innerHTML = ''; // Clear previous history
            if (calculationHistory.length === 0) {
                historyList.innerHTML = '<li class="text-center text-muted">No history yet.</li>';
                historyClearButton.style.display = 'none'; // Hide clear button if no history
                return;
            } else {
                historyClearButton.style.display = 'block'; // Show clear button if history exists
            }

            calculationHistory.forEach(item => {
                const li = document.createElement('li');
                const parts = item.split('=');
                const expression = parts[0].trim();
                const result = parts[1] ? parts[1].trim() : '';
                li.innerHTML = `<span>${expression}</span><span class="result">${result}</span>`;
                historyList.appendChild(li);
            });
        }

        // Event listeners for history panel
        historyButton.addEventListener('click', () => {
            renderHistory(); // Render history before showing the panel
            historyPanel.classList.add('show');
        });

        historyCloseButton.addEventListener('click', () => {
            historyPanel.classList.remove('show');
        });

        historyClearButton.addEventListener('click', () => {
            calculationHistory = [];
            localStorage.removeItem('calculationHistory'); // Clear history from local storage
            renderHistory();
        });

        // Close history panel when clicking outside of it
        historyPanel.addEventListener('click', (e) => {
            if (e.target === historyPanel) {
                historyPanel.classList.remove('show');
            }
        });
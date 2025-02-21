let numberInput = '';
let numberInputTimeout = null;
let numberDisplayTimeout = null;

function showNumberInput(message = '') {
  let numberDisplay = document.getElementById('numberDisplay');
  if (!numberDisplay) {
    numberDisplay = document.createElement('div');
    numberDisplay.id = 'numberDisplay';
    document.querySelector('.video-section')?.appendChild(numberDisplay);
  }
  numberDisplay.textContent = message || numberInput;
  numberDisplay.style.display = 'block';
  
  clearTimeout(numberDisplayTimeout);
  numberDisplayTimeout = setTimeout(() => {
    hideNumberInput();
  }, 2000);
}

function hideNumberInput() {
  const numberDisplay = document.getElementById('numberDisplay');
  if (numberDisplay) {
    numberDisplay.style.display = 'none';
    numberInput = '';
  }
}

function handleNumberInput(number, allChannels, onChannelFound) {
  // Limit to 4 digits
  if (numberInput.length >= 4) return;
  
  numberInput += number;
  
  // Always search through the complete channel list
  const channelNumber = parseInt(numberInput);
  const availableChannel = allChannels.find(ch => ch.channelNo === channelNumber);
  
  if (availableChannel) {
    showNumberInput(numberInput);
    clearTimeout(numberInputTimeout);
    numberInputTimeout = setTimeout(() => {
      const index = allChannels.indexOf(availableChannel);
      if (index !== -1) {
        onChannelFound(index);
      }
      numberInput = '';
    }, 2000);
  } else {
    // Check if any channel starts with the current input
    const possibleChannel = allChannels.some(ch => 
      ch.channelNo?.toString().startsWith(numberInput)
    );
    
    if (!possibleChannel) {
      // If no channel exists or could exist with this prefix, show error and reset
      showNumberInput('This no. not available for TV');
      numberInput = '';
    } else {
      // Show the current input as we're still potentially building a valid number
      showNumberInput(numberInput);
    }
  }
}

export { handleNumberInput, showNumberInput, hideNumberInput };
import { handleNumberInput } from './channelInput.js';

async function fetchPlaylist() {
    try {
        const response = await fetch('data/channels.m3u');
        const data = await response.text();
        return parseM3U(data);
    } catch (error) {
        console.error('Error loading playlist:', error);
        return [];
    }
}

function parseM3U(content) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = null;

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            const titleMatch = line.match(/,(.+)$/);
            const categoryMatch = line.match(/Category="([^"]*)"/);
            const languageMatch = line.match(/Language="([^"]*)"/);
            const channelNoMatch = line.match(/c-no="([^"]*)"/);

            if (titleMatch) {
                currentChannel = {
                    title: titleMatch[1].trim(),
                    logo: logoMatch ? logoMatch[1] : '',
                    category: categoryMatch ? categoryMatch[1] : 'Uncategorized',
                    language: languageMatch ? languageMatch[1] : 'Unknown',
                    channelNo: channelNoMatch ? parseInt(channelNoMatch[1]) : null,
                    url: ''
                };
            }
        } else if (line && !line.startsWith('#') && currentChannel) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = null;
        }
    }

    return channels;
}

let channels = [];
let filteredChannels = [];
let selectedIndex = 0;
let navIndex = 0;
let isInNav = true;
let isInDropdown = false;
let languageIndex = 0;
let selectedLanguage = '';
let lastKey = '';
let lastKeyTime = 0;
let keyRepeatDelay = 300; // Consider key repeat delay

const isSmartTV = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('smart-tv') || userAgent.includes('tv') || userAgent.includes('android tv');
};

function updateLanguageList() {
    const languages = new Set(channels.map(channel => channel.language));
    const languageList = document.querySelector('.language-list');
    const sortedLanguages = Array.from(languages).sort();

    if (!languageList) return;

    languageList.innerHTML = `
        <div class="language-item ${!selectedLanguage ? 'selected' : ''}" data-language="">
            <span>All Languages</span>
        </div>
        ${sortedLanguages.map(lang => `
            <div class="language-item ${selectedLanguage === lang ? 'selected' : ''}" data-language="${lang}">
                <span>${lang}</span>
            </div>
        `).join('')}
    `;

    if (isInDropdown) {
        languageIndex = selectedLanguage ? sortedLanguages.indexOf(selectedLanguage) + 1 : 0;
    }
}

function filterChannels() {
    filteredChannels = selectedLanguage ? channels.filter(channel => channel.language === selectedLanguage) : channels;
    updateChannelGrid();
}

function updateChannelGrid() {
    const channelList = document.getElementById('channelList');
    if (!channelList) return;

    channelList.innerHTML = '';
    
    filteredChannels.forEach((channel, index) => {
        const card = createChannelCard(channel, index);
        channelList.appendChild(card);
    });

    selectedIndex = 0;
    updateSelectedCard();
}

function createChannelCard(channel, index) {
    const card = document.createElement('div');
    card.className = 'channel-card';
    card.tabIndex = 0; // Make focusable
    card.dataset.index = index.toString();

    card.innerHTML = `
        <div class="channel-logo-container">
            ${channel.logo ? `<img src="${channel.logo}" alt="${channel.title}" class="channel-logo">` : `<div class="channel-logo-placeholder">${channel.title[0]}</div>`}
        </div>
        <div class="channel-info">
            <h3>${channel.channelNo ? `${channel.channelNo} - ` : ''}${channel.title}</h3>
            <div class="channel-meta">
                <span class="channel-category">${channel.category}</span>
                <span class="channel-language">${channel.language}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => navigateToChannel(index));
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            navigateToChannel(index);
        }
    });

    return card;
}

function navigateToChannel(channelIndex) {
    const selectedChannel = filteredChannels[channelIndex];
    if (selectedChannel) {
        localStorage.setItem('selectedChannelNo', selectedChannel.channelNo.toString());
        localStorage.setItem('selectedChannelUrl', selectedChannel.url);
        window.location.href = 'player.html';
    }
}

function updateSelectedCard() {
    document.querySelectorAll('.channel-card').forEach((card) => {
        const cardIndex = parseInt(card.dataset.index);
        card.classList.toggle('selected', cardIndex === selectedIndex);
    });
}

function handleNavigation(event) {
    const now = Date.now();
    if (event.key === lastKey && now - lastKeyTime < keyRepeatDelay) {
        return; // Prevent key repeat
    }
    lastKey = event.key;
    lastKeyTime = now;

    if (isInDropdown) {
        const languageItems = document.querySelectorAll('.language-item');
        const totalLanguages = languageItems.length;

        switch (event.key) {
            case 'ArrowLeft':
                if (languageIndex > 0) languageIndex--;
                break;
            case 'ArrowRight':
                if (languageIndex < totalLanguages - 1) languageIndex++;
                break;
            case 'Enter':
                const selectedLangItem = languageItems[languageIndex];
                if (selectedLangItem) {
                    selectedLanguage = selectedLangItem.dataset.language;
                    filterChannels();
                    isInDropdown = false;
                    updateLanguageList();
                }
                break;
            case 'Escape':
            case 'Back':
                isInDropdown = false;
                break;
        }
    } else if (isInNav) {
        const navItems = document.querySelectorAll('.nav-item');
        
        switch (event.key) {
            case 'ArrowLeft':
                if (navIndex > 0) navIndex--;
                break;
            case 'ArrowRight':
                if (navIndex < navItems.length - 1) navIndex++;
                break;
            case 'Enter':
                const action = navItems[navIndex].innerText.toLowerCase();
                if (navIndex === 1) { // Filter nav item
                    isInDropdown = true;
                    languageIndex = 0; // Reset language index
                    updateLanguageList();
                } else {
                    // Handle other nav actions like navigating to home, settings, etc.
                    alert(`Navigate to ${action}`);
                }
                break;
            case 'ArrowDown':
                isInNav = false;
                selectedIndex = 0; // Reset to top of channel grid
                updateSelectedCard();
                break;
        }
    } else {
        switch (event.key) {
            case 'ArrowUp':
                if (selectedIndex > 0) selectedIndex--;
                break;
            case 'ArrowDown':
                if (selectedIndex < filteredChannels.length - 1) selectedIndex++;
                break;
            case 'Enter':
                navigateToChannel(selectedIndex);
                break;
            case 'Escape':
            case 'Back':
                isInNav = true; // Go back to nav
                break;
        }
    }

    updateSelectedCard(); // Update the selected card based on the current index
}

// Initialize the channel list upon DOM content loaded
async function initializeChannelList() {
    channels = await fetchPlaylist();
    filteredChannels = channels;

    if (channels.length === 0) {
        document.getElementById('channelList').innerHTML = '<p>No channels found</p>';
        return;
    }

    updateLanguageList();
    updateChannelGrid();

    document.addEventListener('keydown', handleNavigation);
}

document.addEventListener('DOMContentLoaded', initializeChannelList);

// Utility function to convert bytes into a human-readable format
function bytesToSize(bytes) 
{
    const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"];
    const unitIndex = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1));
    return Intl.NumberFormat("en", { 
        style: "unit", 
        unit: units[unitIndex], 
        maximumFractionDigits: 2 
    }).format(bytes / (1024 ** unitIndex));
}

// Update the UI to show the number of loaded, auto-discardable tabs
function updateStats() 
{
    const numLoadedTabs = document.getElementById('numLoadedTabs');

    chrome.tabs.query({ discarded: false, status: 'complete', autoDiscardable: true })
        .then((tabs) => {
            numLoadedTabs.innerHTML = tabs.length;
        });
}

// Handle discarding tabs
function discardTabs(force) 
{
    let memAvailableBefore = 0;

    // Get memory info before discarding tabs
    chrome.system.memory.getInfo().then((info) => 
    {
        memAvailableBefore = info.availableCapacity;

        // Query for tabs that match the discard criteria
        chrome.tabs.query({ discarded: false }).then((tabs) => 
        {
            const discardTasks = tabs
                .filter((tab) => force || (!tab.active && tab.autoDiscardable))
                .map((tab) => 
                    chrome.tabs.discard(tab.id).then((discardedTab) => 
                    {
                        if (discardedTab) 
                        {
                            console.log(`Tab ${discardedTab.id} discarded`);
                            return true;
                        } 
                        else 
                        {
                            console.warn(`Error discarding tab ${tab.id}:`, chrome.runtime.lastError);
                            return false;
                        }
                    })
                );

            // Wait for all discard operations to complete
            Promise.all(discardTasks).then((results) => 
            {
                const numDiscarded = results.filter(Boolean).length; // Count successful discards
                const numErrored = results.length - numDiscarded;

                // Update stats in the popup
                updateStats();

                // Measure memory after discards
                chrome.system.memory.getInfo().then((info) => 
                {
                    const memAvailableAfter = info.availableCapacity;

                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icon128.png",
                        title: `${numDiscarded} Tabs Discarded`,
                        message: (numDiscarded > 0 ? `\n${bytesToSize(memAvailableAfter - memAvailableBefore)} memory freed` : '') +
                                 (numErrored > 0 ? `\n${numErrored} tabs failed to discard` : ''),
                        priority: 0,
                        silent: true
                    });
                });
            });
        });
    });
}

// Add event listeners and initialize the extension
document.addEventListener('DOMContentLoaded', () => 
{
    const discardButton = document.getElementById('discardButton');

    updateStats();

    discardButton.addEventListener('click', (event) => 
    {
        discardTabs(event.shiftKey);
    });
});

// utility function to convert potentially large number of bytes into a more
// human readable form
function bytesToSize(bytes) 
{
  //TODO: show only 1 or 2 decimal places?
  const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"];
  const unitIndex = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1));
  return Intl.NumberFormat("en", { style: "unit", unit: units[unitIndex], maximumFractionDigits: 2 }).format(
    bytes / (1024 ** unitIndex)
  );
}


function updateStats()
{
  const numLoadedTabs = document.getElementById('numLoadedTabs');

  // update UI to show the number of tabs that are not discarded and are set to auto discardable
  // status: complete is (i think) the same as a fully "loaded" tab
  chrome.tabs.query({discarded: false, status: 'complete', autoDiscardable: true}).then((tabs) => {
    numLoadedTabs.innerHTML = tabs.length;
  });
}


document.addEventListener('DOMContentLoaded', function () 
{
  const discardButton = document.getElementById('discardButton');

  updateStats();

  // this is a shit way of doing it as it's affected by other system processes etc
  // but it's the best i've figured out for now
  let memAvailableBefore = 0;
  let memAvailableAfter = 0;

  function discardTabs(force)
  {

    const discardTasks = [];

    // TODO: use chrome.tabs.query instead?
    chrome.windows.getAll({populate: true}).then((windows) =>
    {
      for (let window of windows)
      {
        for (let tab of window.tabs)
        {
          if (!tab.discarded && (force || (!tab.active && tab.autoDiscardable)))
          {
            // without shift-click we ignore tabs that aren't auto-discardable
            //
            // active means that a tab is active within its window if window is partially visible
            // it seems that discarding active tabs is kinda pointless because they are just automatically
            // reloaded anyway

            //TODO: refuse to discard the extensions pop-up 'tab' so that when we are holding shift, it doesn't disappear

            // chrome.processes API is not available for non nightly builds so none of this works
            //let pid = chrome.processes.getProcessIdForTab(tab.id);
            //console.log(pid);
            //chrome.processes.getProcessInfo(pid, true);

            discardTasks.push(

              chrome.tabs.discard(tab.id).then( (discardedTab) => {

                if (discardedTab)
                {
                  // we discarded the tab successfully
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

          }
        }
      };

      Promise.all(discardTasks).then((results) => {

        console.log('results', results);

        // now update the numbers in the popup
        //document.dispatchEvent(new Event("DOMContentLoaded", {
        //  bubbles: true,
        // cancelable: true
        //}));

        updateStats();

        chrome.system.memory.getInfo().then( (info) => {
          memAvailableAfter = info.availableCapacity;

          let numDiscarded = results.filter((result) => result).length;  //count elements that evaluate to true
          //FIXME: numDiscarded is too large (e.g. 75) and is larger than the numLoadedTabs displayed
          let numErrored = results.length - numDiscarded;

          console.log('memAvailableBefore', memAvailableBefore);
          console.log('memAvailableAfter', memAvailableAfter);

          chrome.notifications.create(
          {
             type: "basic",
             iconUrl: "icon128.png",
             title: `${numDiscarded} Tabs Discarded`,
             message: (numDiscarded > 0 ? `\n${bytesToSize(memAvailableAfter - memAvailableBefore)} memory freed`: '')
                      + (numErrored > 0 ? `\n${numErrored} tabs failed to discard` : ''),
             priority: 0,
             silent: true
          });

        });

      });

    });

  }

  discardButton.addEventListener('click', (event) =>
  {
    chrome.system.memory.getInfo().then( (info) => {
      memAvailableBefore = info.availableCapacity;
      discardTabs(event.shiftKey);
    });
  });

});
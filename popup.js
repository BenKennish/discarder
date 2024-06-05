// utility function to convert potentially large number of bytes into a more
// human readable form
function bytesToSize(bytes) 
{
  //TODO: show only 1 or 2 decimal places
  const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"];
  const unitIndex = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1));
  return Intl.NumberFormat("en", { style: "unit", unit: units[unitIndex] }).format(bytes / (1024 ** unitIndex));
}


document.addEventListener('DOMContentLoaded', function () 
{

  const discardButton = document.getElementById('discardButton');

  // this is a shit way of doing it as it's affected by other system processes etc
  let memAvailableBefore = 0;
  let memAvailableAfter = 0;

  function discardTabs(force) {

    const discardTasks = [];

    chrome.windows.getAll({populate: true}).then((windows) =>
    {

      for (let window of windows)
      {
        for (let tab of window.tabs)
        {
          if (!tab.discarded && (force || (tab.autoDiscardable && !tab.active)))
          {
            // without shift-click we only discard
            // auto-discardable tabs that aren't active
            //
            // active means that a tab is active within its window if window is partially visible

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
                  console.log(discardedTab);

                  //TODO: calculate RAM usage here?

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
      }; //chrome.windows.getAll()

      Promise.all(discardTasks).then((results) => {

        console.log('results', results);

        chrome.system.memory.getInfo().then( (info) => {
          memAvailableAfter = info.availableCapacity;

          let numDiscarded = results.filter((result) => result).length;  //count elements that evaluate to true
          let numErrored = results.length - numDiscarded;

          console.log('memAvailableBefore',memAvailableBefore);
          console.log('memAvailableAfter',memAvailableAfter);

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
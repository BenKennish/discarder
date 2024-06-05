document.addEventListener('DOMContentLoaded', function () 
{

  const discardButton = document.getElementById('discardButton');

  function discardTabs(force) {

    let numTabsToDiscard = 0;
    let numTabsDiscarded = 0;
    let numTabsFailedToDiscard = 0;

    return new Promise((resolve) =>
    {
      chrome.windows.getAll({populate: true}).then((windows) =>
      {

        for (let window of windows)
        {
          for (let tab of window.tabs)
          {
            if (!tab.discarded && (force || (tab.autoDiscardable && !tab.active)))
            {
              // tab.active means that a tab is active within its window
              // seems to be true for tabs that are selected in a window that is partially visible

              //TODO: calculate RAM usage

              numTabsToDiscard++;

              // without shift-click we only discard
              // auto-discardable tabs that aren't the active tab
              chrome.tabs.discard(tab.id).then( (t) => {

                if (t) { // we discarded the tab successfully
                  console.log(`Tab ${tab.id} discarded`);
                  numTabsDiscarded++;
                }
                else {
                  console.warn(`Error discarding tab ${tab.id}:`, chrome.runtime.lastError);
                  numTabsFailedToDiscard++;
                }

              });

            }
          }
        }

        //numTabsToDiscard is now correct

        // 1. wait until numTabsDiscarded +  == numTabsToDiscard? how?
        // 2. display a message giving the number of tabs discarded and the MB ram freed (approx)

        chrome.notifications.create(
        {
           type: "basic",
           iconUrl: "icon128.png",
           title: "Tabs Discarded",
           message: numTabsToDiscard+' tabs were marked for discarding',
           priority: 0,
           silent: true
        });

      }); //chrome.windows.getAll

      resolve(true);

    });
  }


  discardButton.addEventListener('click', (event) =>
  {
    discardTabs(event.shiftKey);
  });


});
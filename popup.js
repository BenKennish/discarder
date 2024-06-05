document.addEventListener('DOMContentLoaded', function () 
{

  const discardButton = document.getElementById('discardButton');

  function discardTabs(force) {

    let numTabsToDiscard = 0;
    let numTabsDiscarded = 0;
    let numTabsFailedToDiscard = 0;

    const discardTasks = [];

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

            numTabsToDiscard++;

            console.log('tab.memoryInfo', tab.memoryInfo);

            // without shift-click we only discard
            // auto-discardable tabs that aren't the active tab

            discardTasks.push(

              chrome.tabs.discard(tab.id).then( (discardedTab) => {

                if (discardedTab) { // we discarded the tab successfully
                  //console.log(`Tab ${discardedTab.id} discarded`);
                  numTabsDiscarded++;
                
                  console.log('discardedTab.memoryInfo', discardedTab.memoryInfo);

                  //TODO: calculate RAM usage
                  return true;
                }
                else {
                  console.warn(`Error discarding tab ${tab.id}:`, chrome.runtime.lastError);
                  numTabsFailedToDiscard++;
                  return false;
                }

              })

            );

          }
        }

      }; //chrome.windows.getAll

      Promise.all(discardTasks).then( (results) => {

        console.log('results', results);

        chrome.notifications.create(
        {
           type: "basic",
           iconUrl: "icon128.png",
           title: "Tabs Discarded",
           message: `${numTabsDiscarded} tabs were discarded, ${numTabsFailedToDiscard} failed to discard`,
           priority: 0,
           silent: true
        });
      });

    });

  }


  discardButton.addEventListener('click', (event) =>
  {
    discardTabs(event.shiftKey);
  });


});
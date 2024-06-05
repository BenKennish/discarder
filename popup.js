document.addEventListener('DOMContentLoaded', function () 
{

  const discardButton = document.getElementById('discardButton');

  function discardTabs(force) {

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
            // without shift-click we only discard
            // auto-discardable tabs that aren't active
            //
            // active means that a tab is active within its window if window is partially visible

            // these don't work for some reason:
            //console.log('tab.memoryInfo', tab.memoryInfo);
            //console.log('tab.memoryInfo.memoryUsage', tab.memoryInfo.memoryUsage);

            discardTasks.push(

              chrome.tabs.discard(tab.id).then( (discardedTab) => {

                if (discardedTab) {
                  // we discarded the tab successfully
                  console.log(`Tab ${discardedTab.id} discarded`);
                  numTabsDiscarded++;

                  //TODO: calculate RAM usage here?

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
      }; //chrome.windows.getAll()

      Promise.all(discardTasks).then((results) => {

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
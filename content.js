
let links = [];

// does I need it here?
let infiniteScrollerShadow;

let _id = false;

const url = window.location.href;
const arr = url.split('/');
const collection = arr[arr.indexOf('details') + 1].split('?')[0];


async function sender(obj){    

    const { result } = await chrome.runtime.sendMessage(obj);

    document.getElementById('terminal').value = result;


}


//load UI
(async function init() {
  const app = await waitForElement('app-root');
  const appShadow = app.shadowRoot || await waitForShadow(app);

  const collectionPage = await waitForElement('collection-page', appShadow);
  const collectionPageShadow = collectionPage.shadowRoot || await waitForShadow(collectionPage);

  const collectionBrowser = await waitForElement('collection-browser', collectionPageShadow);
  const collectionBrowserShadow = collectionBrowser.shadowRoot || await waitForShadow(collectionBrowser);

  const infiniteScroller = await waitForElement('infinite-scroller', collectionBrowserShadow);
  infiniteScrollerShadow = infiniteScroller.shadowRoot || await waitForShadow(infiniteScroller);

  setupUI();

})();


function waitForShadow(element) {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (element.shadowRoot) {
        clearInterval(interval);
        resolve(element.shadowRoot);
      }
    }, 1000);
  });
}


function waitForElement(selector, root = document, isShadow = false) {

  return new Promise((resolve) => {

    const check = () => {

      const el = root.querySelector(selector);

      if (el) {

        if (isShadow && el.shadowRoot) {

          resolve(el.shadowRoot);

        } else if (!isShadow) {

          resolve(el);

        }

      }

    };

    const observer = new MutationObserver(() => check());

    observer.observe(root === document ? document.body : root, {

      childList: true,
      subtree: true,

    });

    check(); // Try once immediately

  });

}





function setupUI() {

  //save formatInput
  function saveToStorage(event) {

      const value = event.target.value;

      const id = event.target.id;

      chrome.storage.local.set({
        [id]: value
      });

  }

  const panel = document.createElement('div');

  panel.id = 'parrot-panel';   

  panel.innerHTML = `

    <textarea id="terminal" placeholder="response" readonly></textarea>

    <input type="text" class="counter" id="counter" value="0" title="the collected pages" readonly/>
    <input type="text" id="collectionNameToDownload" value="${collection}" title="the collection name" readonly/>
    <input type="text" id="regexName" placeholder="RegEx for a title" title="^word word word$" value="" />
    <input type="text" id="formatInput" placeholder="enter the file format" title="File type (e.g., pdf)" value="pdf" />

    <label for="statusSelect">select the file status</label>

    <select id="statusSelect">
        <option value="new">new</option>
        <option value="interrupted">interrupted</option>
        <option value="failed">failed</option>
        <option value="notDownloaded">not downloaded</option>
        <option value="start">start</option>
        <option value="completed">completed</option>
    </select>


    <hr />

    <div class="button-row">
      <button class="btn small" id="collectBtn" title="Press to collect pages and search files">Collect</button>
      <button class="btn small" id="downloadBtn" title="press to download files">Download</button>
      <button class="btn small" id="pauseBtn" title="press to pause downloading and searching">Pause</button>
      <button class="btn small" id="dbBtn" title="press to open the database">Database</button>
    </div>

  `;

  document.body.appendChild(panel);

  const collectBtn = panel.querySelector('#collectBtn');
  const counter = panel.querySelector('#counter');
  const formatInput = panel.querySelector('#formatInput');
  const downloadBtn = panel.querySelector('#downloadBtn');
  const pauseBtn = panel.querySelector('#pauseBtn');
  const status = panel.querySelector('#statusSelect');

  document.getElementById("dbBtn").addEventListener("click", () => {
     const dbUrl = chrome.runtime.getURL("db.html?collection=" + collection);
     window.open(dbUrl, "_blank");
  });

  chrome.storage.local.get(["formatInput"], (data) => { if (data.formatInput){formatInput.value = data.formatInput} });

  formatInput.addEventListener("blur", saveToStorage);

  collectBtn.addEventListener("click", () => {

    if (_id) {

      clearInterval(_id);

      _id = false;

      collectBtn.textContent = 'Collect';

      sender({ links, action: 'collect' });

    } else {

      collectBtn.textContent = 'Search';

      _id = setInterval(collectNewLinks, 500);

      document.getElementById('terminal').value = 'Collecting new pages for searching. Scroll down or up for new ones.';

    }

  });

  downloadBtn.addEventListener("click", () => {    

    if(!format){
        alert('Enter a format type. For example, pdf.');
        return;
    }

    const obj = {

        new: ['new'],
        interrupted: ['interrupted'],
        failed: ['failed'],
        completed: ['completed'],
        start: ['start'],
        notDownloaded: ['new', 'interrupted', 'failed']

    }

    const format = formatInput.value.trim();
    const select = status.value;
    const query = obj[select];

    sender({ collection, format, query, select, action: 'download' });  

  });


  pauseBtn.addEventListener("click", () => {

    sender({ action: 'pause' });  

  });


}


function collectNewLinks() {

  function searchName(title){

    const userInput = document.querySelector('#regexName').value;

    if(userInput.trim() === '')
        return true;

    let regex;

    try {

        regex = new RegExp(userInput, 'i');

        return regex.test(title);

    }catch(e) {

        document.getElementById('terminal').value = e.message;

        return false;

    }

  }

  const tileDispatcher = infiniteScrollerShadow.querySelectorAll('tile-dispatcher');

  tileDispatcher.forEach(el => {

    const tileDispatcherShadow = el.shadowRoot;
    const container = tileDispatcherShadow?.querySelector('#container');
    const href = container?.querySelector('a')?.href;
    const item = container?.querySelector('item-tile');
    const itemTile = container?.querySelector('item-tile');

    if(!itemTile) //Uncaught TypeError: Cannot read properties of null (reading 'shadowRoot')
        return;

    const itemTileShadow = itemTile.shadowRoot;
    const title = itemTileShadow?.querySelector('#title').textContent.trim();

    //only items, not collections
    if (container && href && item && searchName(title)) container.style.border = "thick solid pink";

    if (!links.includes(href) && item && searchName(title)) {
      links.push(href, collection, title);
    }

  });

  document.querySelector('#counter').value = (links.length/3);  

}


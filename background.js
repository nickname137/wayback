
//DB
const DB_NAME = "wayback";
const DB_VERSION = 1;
const STORE_NAME = "items";

//urls for searching
let urlArchive = [];
let $urls = [];

//files to download
let $files = [];

//pause a flow
let pause = false;

/*

async function searchDB(indexName, query) {

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = indexName === "url" ? store : store.index(indexName);

  const results = [];
  const request = index.openCursor();

  return new Promise((resolve, reject) => {

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const value = cursor.value;
        if (value[indexName] && value[indexName].includes(query)) {
          results.push(value);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);

  });

}


*/


function openDB() {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function(event) {

      const db = event.target.result;
      const store = db.createObjectStore(STORE_NAME, { keyPath: "url" }); // url is unique key

      store.createIndex("title", "title", { unique: false });
      store.createIndex("collection", "collection", { unique: false });
      store.createIndex("date", "date", { unique: false });

    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

  });

}


async function clearStore() {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {

      console.log(`Store "${STORE_NAME}" cleared.`);
      resolve(true);

    };

    request.onerror = () => {

      console.error("Error clearing store:", request.error);
      reject(request.error);

    };

  });

}


async function deleteByUrl(url) {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(url);

    request.onsuccess = () => {

      console.log(`Item with URL ${url} deleted`);
      resolve(true);

    };

    request.onerror = () => {

      console.error(`Failed to delete item with URL ${url}`, request.error);
      reject(request.error);

    };

  });

}


async function deleteByCollection(collectionName) {

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("collection");

    const request = index.openCursor(IDBKeyRange.only(collectionName));
    let count = 0;

    request.onsuccess = function (event) {
      const cursor = event.target.result;

      if (cursor) {
        cursor.delete();
        count++;
        cursor.continue();
      } else {
        console.log(`Deleted ${count} items from collection "${collectionName}".`);
        resolve(count);
      }
    };

    request.onerror = () => {
      console.error("Error deleting items by collection:", request.error);
      reject(request.error);
    };
  });
}


function filterByFormat(list, format) {

  format = format.toLowerCase();

  return list.filter(url => {

    const match = url.match(/\.([a-zA-Z0-9]+)$/);
    return match && match[1].toLowerCase() === format;

  });

}


async function getByUrlFormat(url, format) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(url);

    request.onsuccess = function (event) {
      const item = event.target.result;

      console.log('item:', item)

      if (!item) {
        return resolve(null); // No record with that URL
      }

      if (item.formats && item.formats.includes(format)) {

        const list = item.list;

        //AI can make mistakes...
        const _keys = Object.keys(list);
        const _array = filterByFormat(_keys, format);

        console.log(_keys)
        console.log(_array)

        if (_array.length > 0) {
          $files.push(url, { format, _array });    
          return resolve($files.length/2);
        }
      }

      resolve(null); // Found item but no matching format
    };

    request.onerror = () => reject(request.error);
  });
}



async function getByCollection(collection, format, query) {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("collection");
    const request = index.openCursor(IDBKeyRange.only(collection));

    request.onsuccess = function(event) {

      const cursor = event.target.result;

      if (cursor) {

        const item = cursor.value;

        // Check if the target format is in the formats array
        if (item.formats && item.formats.includes(format)) {

            let list = item.list;

            //console.log('query:', query);

            //urls with the status
            let _keys = Object.keys(list).filter((key) => query.includes(list[key]));
            
            //urls with the format
            let _array = filterByFormat(_keys, format);

            //console.log('_array:', _array);

            if(_array.length > 0) {

                let url = item.url;

                if($files.indexOf(url) === -1){

                    //fileArchive.push(url);
                    $files.push(url, { format, _array });                    

                }

            }

        }

        cursor.continue();

      } else { //!cursor

        //console.log('$files:', $files);
        resolve($files.length/2); // No more entries

      }

    };

    request.onerror = () => reject(request.error);

  });

}



function _date(string = false){

    let $date = new Date().toLocaleString();//new Date().toISOString();

    if(string){
        $date = `${$date} — ${string}\n\n`
    }

    return $date;

}


function saveItemToDB(item) {

  return new Promise((resolve, reject) => {

    openDB().then(db => {

      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const record = {

        ...item,
        date: _date()

      };

      const request = store.add(record); // fails if url already exists

      request.onsuccess = () => {

        console.log("Item saved.");
        db.close();
        resolve();

      };

      request.onerror = (event) => {

        console.log("Item not saved. URL may already exist.");
        db.close();
        reject(event.target.error);

      };

    });

  });

}


async function updateStatus(url, obj) {

  const db = await openDB();
  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  const request = store.get(url);

  return new Promise((resolve, reject) => {

    request.onsuccess = () => {

      const item = request.result;

      if (item) {

        let { list, formats, logs, link } = obj;

        if(link && ('_file' in link)){

            let { _file, result } = link;

            item.list[_file] = result;

            console.log('item.list[_file]:', item.list[_file]);

        }


        if(formats && formats.length > 0){

            item.list = list;
            item.formats = formats;
                
        }

        //item.status = status;
        item.logs += logs;
        store.put(item);

        resolve(item);

      } else {

        reject(`Item with URL "${url}" not found in DB.`);

      }

    };

    request.onerror = () => reject(request.error);

  });

}


function openTab(url, collection, title) {

  //https://archive.org/details/immanuel-kant-groundwork-for-the-metaphysics-of-morals
  //https://archive.org/download/immanuel-kant-groundwork-for-the-metaphysics-of-morals

  let _url = url.replace('details', 'download');
  _url = `${_url}#wayback?collection=${collection}&title=${title}`;
  
  return new Promise((resolve) => {
    chrome.tabs.create({ active: false, url: _url }, (tab) => {
      resolve(tab);
    });
  });

}


function injectScript(tabId, timeoutMs = 60000) {

  return new Promise((resolve, reject) => {

    const listener = function onUpdated(updatedTabId, info) {

      if (updatedTabId === tabId && info.status === 'complete') {

        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);

        chrome.scripting.executeScript(

          {
            target: { tabId },
            files: ['search.js']
          },

          () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(tabId);
            }
          }

        );

      }

    };

    const timer = setTimeout(() => {

      chrome.tabs.onUpdated.removeListener(listener);
      reject(`Page did not load in time for tab ${tabId}`);

    }, timeoutMs);

    chrome.tabs.onUpdated.addListener(listener);

  });

}


async function checkIntoDB(url) {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(url);

    request.onsuccess = () => {

      if (request.result) {
        resolve(true);  // URL exists
      } else {
        resolve(false); // URL not found
      }

    };

    request.onerror = () => {

      console.error('checkIntoDB error:', request.error);
      reject(request.error);

    };
  });
}


async function startSearch(){

    //console.log('from startSearch()')

    if(pause === true){
        return false;
    }

    const _array = $urls.splice(0,3);

    const [ url, collection, title ] = _array;

    //console.log(_array)

    if(url && collection && title){

        const exist = await checkIntoDB(url);

        console.log('exist:', exist);

        if(exist === true){

            startSearch();
            return false;

        }

        try{

            const tab = await openTab(url, collection, title);
            await injectScript(tab.id);

            return true;

        }
        catch(error){

            $urls.push(url, collection, title);
            console.log(error);

        }

    }
    
    return false;

}

/*

async function getOneItemByStatus(_find, _update) {

  const db = await openDB();

  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  const index = store.index("status");

  return new Promise((resolve, reject) => {

    const request = index.openCursor(_find);

    request.onsuccess = (event) => {

      const cursor = event.target.result;

      if (cursor) {

        const item = cursor.value;

        item.status = _update; // update status
        cursor.update(item); // write back updated item
        resolve(item); // return updated item

      } 

      else {

        resolve(null); // no item with status 'waiting' found

      }

    };

    request.onerror = () => reject(request.error);

  });

}


*/





async function loop(){

    while($files.length > 0){

        if(pause === true){
            break;
        }

        //splice(-2) the last two items
        //splice(0,2) the first two items
        let [ url, obj ] = $files.splice(-2);
        let { format, _array } = obj;   

        await downloading(url, format, _array);            

    }

    return 'the downloading is completed';

}


async function downloading(url, format, _array) {

  for (const _file of _array) {

    if(pause === true){
        break;
    }

    const downloadId = await new Promise((resolve, reject) => {

      chrome.downloads.download(

        {

          url: _file,
          saveAs: false,

        },

        (id) => {

          if (chrome.runtime.lastError || !id) {

            console.log(`⛔ Download failed for ID ${id}:`, chrome.runtime.lastError?.message);
            updateStatus(url, {logs: _date(`Failed downloading ${_file}`), link: { _file, result: 'failed' } });
            resolve(null);

          } else {

            console.log(`📥 Started download for: ${_file}`);
            updateStatus(url, {logs: _date(`Started downloading ${_file}`), link: { _file, result: 'start' } });
            resolve(id);

          }

        }

      );

    });

    if (downloadId !== null) {

        let result = await waitForDownloadComplete(downloadId);

        updateStatus(url, { logs: _date(`Finished downloading ${_file}`), link: { _file, result } }).catch(error => console.log(error));

      console.log(`✅ Completed download for: ${_file}`);

    }    

  }

  return true;  

}


function waitForDownloadComplete(downloadId){

  return new Promise((resolve) => {

    function listener(delta) {

      if (delta.id === downloadId && delta.state && delta.state.current === 'complete') {
        chrome.downloads.onChanged.removeListener(listener);
        resolve('completed');
      }

      if (delta.id === downloadId && delta.state && delta.state.current === 'interrupted') {        
        chrome.downloads.onChanged.removeListener(listener);
        console.warn(`⚠️ Download ${downloadId} was interrupted.`);
        resolve('interrupted'); // Resolve anyway to avoid hanging
      }

    }

    chrome.downloads.onChanged.addListener(listener);

  });

}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action === 'collect') {

        console.log(message);

        pause = false;

        let { links } = message;
        const amount = links.length;

        while(links.length > 0){

            const _array = links.splice(0,3);   
            let [ url, collection, title ] = _array;

            if(urlArchive.indexOf(url) === -1){
                urlArchive.push(url);
                $urls.push(url, collection, title);
            }

        }

        sendResponse({ result: `New pages for searching: ${amount/3}. The total number: ${$urls.length/3}.` });
        startSearch();

    }


    if (message.action === 'search') {

        console.log(message);        

        let url = sender.tab.url;
        url = url.replace('download', 'details');
        url = url.split('#')[0];        

        let { list, formats, title, collection } = message;

        //let status = Object.keys(list).length ? 'URL is found' : 'URL is not found' ;

        let logs = _date(`Found ${Object.keys(list).length} URL`);


        //save into DB
        saveItemToDB({ url, collection, title, logs, formats, list })
            .then(() => chrome.tabs.remove(sender.tab.id)) //.catch(error => console.log(error))
            .then(() => startSearch())
            .catch((error) => console.log(error));
                                   
    }


    if (message.action === 'download') {

        //reset an array
        //$files = [];
        
        pause = false;

        const { format, collection, query, select } = message;

        getByCollection(collection, format, query)
            .then((_length) => {

                console.log(_length);
                sendResponse({ result: `Downloading ${_length} ${format} files with status '${select}' from ${collection} collection...` });
                
            })
            .then(async () => { await loop() })
            .catch((error) => {
                console.log(error);
                sendResponse({ result: error.message });
            });

        //that works
        return true; // ✅ keep channel open for async sendResponse
    }


    if (message.action === 'downloadDB') {

        //reset an array
        //$files = [];
        
        pause = false;

        const { format, url, collection } = message;

        console.log(url, format)

        getByUrlFormat(url, format)
            .then((_length) => {

                console.log(_length);
                sendResponse({ result: `Downloading ${_length} ${format} files from ${collection} collection...` });
                
            })
            .then(async () => { await loop() })
            .catch((error) => {
                console.log(error);
                sendResponse({ result: error.message });
            });

        //that works
        return true; // ✅ keep channel open for async sendResponse
    }


    if (message.action === 'deleteOne') {
      
        const { url } = message;

        deleteByUrl(url)
            .then((result) => {
                sendResponse({ result });                
            })
            .catch((error) => {
                console.log(error);
                sendResponse({ result: error.message });
            });

        //that works
        return true; // ✅ keep channel open for async sendResponse
    }


    if (message.action === 'deleteCollection') {
      
        const { collection } = message;

        deleteByCollection(collection)
            .then((result) => {
                sendResponse({ result });                
            })
            .catch((error) => {
                console.log(error);
                sendResponse({ result: false });
            });

        //that works
        return true; // ✅ keep channel open for async sendResponse
    }

    if (message.action === 'clearDB') {
      
        //const { collection } = message;

           clearStore()
            .then((result) => {
                sendResponse({ result });                
            })
            .catch((error) => {
                console.log(error);
                sendResponse({ result: false });
            });

        //that works
        return true; // ✅ keep channel open for async sendResponse
    }

    if (message.action === 'pause') {

        console.log(message);
        pause = true;

        sendResponse({ result: `Searching and downloading are paused.` });

    }

    /*

    Use return true only when you are calling sendResponse asynchronously (e.g., after an await, Promise, or setTimeout).

    If you call sendResponse(...) synchronously (immediately) inside the listener — like in your pause block — then you do NOT need return true.

    */

    //return isAsync;


});

